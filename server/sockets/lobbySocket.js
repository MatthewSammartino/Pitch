const { randomUUID } = require("crypto");
const GameStore    = require("../game/GameStore");
const QueueManager = require("../game/QueueManager");
const pool         = require("../db/pool");

/**
 * /lobby namespace
 *
 * Client → Server:
 *   lobby:join        { sessionId }
 *   lobby:take_seat   { sessionId, seatIndex }
 *   lobby:leave_seat  { sessionId }
 *   lobby:start_game  { sessionId }
 *   queue:join        { variant }
 *   queue:leave
 *   queue:get_counts
 *
 * Server → Client (room = sessionId):
 *   lobby:state       publicState()
 *   lobby:started     { sessionId }
 *   lobby:error       { message }  (individual)
 *
 * Server → Client (namespace-wide):
 *   queue:count       { 4: n, 6: n }
 *
 * Server → Client (individual):
 *   queue:matched     { sessionId }
 */

// ── Room code helpers ──────────────────────────────────────────────────────
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}
async function generateUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const { rows } = await pool.query("SELECT 1 FROM game_sessions WHERE short_code = $1", [code]);
    if (!rows.length) return code;
  }
  throw new Error("Could not generate unique room code");
}

/**
 * Create a DB session + GameStore lobby for a queue match, then seat all players.
 * Returns the sessionId.
 */
async function createMatchedSession(matched, variant, nsp) {
  const hostUserId = matched[0].userId;
  const shortCode  = await generateUniqueCode();
  const sessionId  = randomUUID();

  await pool.query(
    `INSERT INTO game_sessions (id, group_id, variant, status, created_by, short_code, is_public)
     VALUES ($1, NULL, $2, 'waiting', $3, $4, true)`,
    [sessionId, variant, hostUserId, shortCode]
  );

  const lobby = GameStore.createLobby(sessionId, null, variant, hostUserId, shortCode, true);

  // Seat each matched player directly
  for (const entry of matched) {
    lobby.seats[entry.seatIndex] = {
      userId:      entry.userId,
      displayName: entry.displayName,
      avatarUrl:   entry.avatarUrl || null,
      isBot:       false,
    };
  }

  // Notify each matched socket and redirect them to the lobby
  for (const entry of matched) {
    const sock = nsp.sockets.get(entry.socketId);
    if (sock) {
      sock.join(sessionId);
      sock.emit("queue:matched", { sessionId });
    }
  }

  return sessionId;
}

module.exports = function lobbySocket(nsp) {
  nsp.on("connection", (socket) => {
    const user = socket.request.user;

    // ── queue:get_counts ────────────────────────────────────────────────────
    socket.on("queue:get_counts", () => {
      socket.emit("queue:count", QueueManager.getCounts());
    });

    // ── queue:join ──────────────────────────────────────────────────────────
    socket.on("queue:join", async ({ variant } = {}) => {
      const v = parseInt(variant);
      if (v !== 4 && v !== 6) return;
      if (user.is_guest) return socket.emit("lobby:error", { message: "Guests cannot join the queue." });

      const mmr = user.mmr || 1000;
      QueueManager.enqueue(user.id, mmr, v, socket.id);

      // Store display info on the entry so we can seat the player
      const entry = QueueManager.queues[v].find((e) => e.userId === user.id);
      if (entry) {
        entry.displayName = user.display_name;
        entry.avatarUrl   = user.avatar_url || null;
      }

      nsp.emit("queue:count", QueueManager.getCounts());

      const matched = QueueManager.tryMatch(v);
      if (matched) {
        try {
          await createMatchedSession(matched, v, nsp);
          nsp.emit("queue:count", QueueManager.getCounts());
        } catch (err) {
          console.error("Queue match session creation error:", err.message);
          // Re-enqueue the players so they aren't lost
          for (const e of matched) {
            QueueManager.enqueue(e.userId, e.mmr, v, e.socketId);
          }
          nsp.emit("queue:count", QueueManager.getCounts());
        }
      }
    });

    // ── queue:leave ─────────────────────────────────────────────────────────
    socket.on("queue:leave", () => {
      QueueManager.dequeue(user.id);
      nsp.emit("queue:count", QueueManager.getCounts());
    });

    // ── lobby:join ──────────────────────────────────────────────────────────
    // Helper: after the socket is in the room, register them as a spectator
    // if they don't have a seat, then broadcast updated state to everyone.
    function attachSocketToLobby(lobby) {
      socket.join(sessionIdOf(lobby));
      if (!lobby.hasSeat(user.id)) {
        lobby.addSpectator(socket.id, user);
        // Broadcast so existing players see the new spectator in their list
        nsp.to(sessionIdOf(lobby)).emit("lobby:state", lobby.publicState());
      } else {
        // Seated user — only need to send their own copy
        socket.emit("lobby:state", lobby.publicState());
      }
    }
    function sessionIdOf(lobby) { return lobby.sessionId; }

    socket.on("lobby:join", ({ sessionId } = {}) => {
      if (!sessionId) return;

      let lobby = GameStore.getLobby(sessionId);

      if (!lobby) {
        // Rebuild from DB after server restart
        pool.query(
          "SELECT * FROM game_sessions WHERE id = $1 AND status = 'waiting'",
          [sessionId]
        ).then(({ rows }) => {
          if (!rows.length) {
            // Check if game already started
            return pool.query(
              "SELECT status FROM game_sessions WHERE id = $1", [sessionId]
            ).then(({ rows: r }) => {
              if (r[0]?.status === "playing") {
                socket.emit("lobby:already_started", { sessionId });
              } else {
                socket.emit("lobby:error", { message: "Lobby not found or has ended." });
              }
            });
          }
          const s = rows[0];
          lobby = GameStore.createLobby(s.id, s.group_id, s.variant, s.created_by, s.short_code, s.is_public, s.wager_base || 0, s.wager_per_set || 0);
          attachSocketToLobby(lobby);
        }).catch(() => socket.emit("lobby:error", { message: "Failed to load lobby." }));
        return;
      }

      attachSocketToLobby(lobby);
    });

    // ── lobby:take_seat ─────────────────────────────────────────────────────
    socket.on("lobby:take_seat", ({ sessionId, seatIndex } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Game has already started." });

      const result = lobby.takeSeat(seatIndex, user);
      if (result.error) return socket.emit("lobby:error", { message: result.error });

      // Promoted from spectator — drop spectator entry for this socket
      lobby.removeSpectator(socket.id);
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:leave_seat ────────────────────────────────────────────────────
    socket.on("lobby:leave_seat", ({ sessionId } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return;
      lobby.leaveSeat(user.id);
      // They're still in the socket room — re-register as a spectator so the
      // public list and counts stay accurate.
      lobby.addSpectator(socket.id, user);
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:set_team_names ────────────────────────────────────────────────
    socket.on("lobby:set_team_names", ({ sessionId, teamNames } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return;
      if (lobby.createdBy !== user.id) return;
      lobby.setTeamNames(teamNames);
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:fill_bots ─────────────────────────────────────────────────────
    socket.on("lobby:fill_bots", ({ sessionId } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.createdBy !== user.id)
        return socket.emit("lobby:error", { message: "Only the host can fill bots." });

      lobby.seats = lobby.seats.map((s, i) =>
        s || { userId: `bot-${i}`, displayName: `Bot ${i + 1}`, avatarUrl: null, isBot: true }
      );
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── chat:send ───────────────────────────────────────────────────────────
    socket.on("chat:send", ({ sessionId, text } = {}) => {
      if (!sessionId || typeof text !== "string") return;
      const trimmed = text.trim().slice(0, 200);
      if (!trimmed) return;
      const lobby = GameStore.getLobby(sessionId);
      const fromSpectator = !!(lobby && !lobby.hasSeat(user.id));
      nsp.to(sessionId).emit("chat:message", {
        userId:      user.id,
        displayName: user.display_name,
        avatarUrl:   user.avatar_url || null,
        text:        trimmed,
        fromSpectator,
        ts:          Date.now(),
      });
    });

    // ── lobby:kick_seat ─────────────────────────────────────────────────────
    socket.on("lobby:kick_seat", ({ sessionId, seatIndex } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Cannot kick after the game starts." });

      const result = lobby.kickSeat(seatIndex, user.id);
      if (result.error) return socket.emit("lobby:error", { message: result.error });

      // Tell all clients who was kicked so the kicked player can react
      const isBot = result.kicked.userId?.startsWith("bot-");
      if (!isBot) {
        nsp.to(sessionId).emit("lobby:player_kicked", {
          userId:      result.kicked.userId,
          displayName: result.kicked.displayName,
        });
      }
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:start_game ────────────────────────────────────────────────────
    socket.on("lobby:start_game", async ({ sessionId } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.createdBy !== user.id)
        return socket.emit("lobby:error", { message: "Only the host can start." });
      if (!lobby.isFull())
        return socket.emit("lobby:error", { message: "All seats must be filled first." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Already started." });

      try {
        // ── Chip deduction (if wagered) ───────────────────────────────────────
        if (lobby.wagerBase > 0) {
          const humanUserIds = lobby.seats
            .filter((s) => s && !s.isBot)
            .map((s) => s.userId);

          if (humanUserIds.length > 0) {
            await pool.query("BEGIN");
            try {
              const { rows: broke } = await pool.query(
                `SELECT id FROM users WHERE id = ANY($1::uuid[]) AND (chip_balance < $2 OR chip_balance < 0)`,
                [humanUserIds, lobby.wagerBase]
              );
              if (broke.length > 0) {
                await pool.query("ROLLBACK");
                return socket.emit("lobby:error", {
                  message: `One or more players don't have enough chips (need ${lobby.wagerBase}).`,
                });
              }
              await pool.query(
                `UPDATE users SET chip_balance = chip_balance - $1 WHERE id = ANY($2::uuid[])`,
                [lobby.wagerBase, humanUserIds]
              );
              await pool.query("COMMIT");
            } catch (chipErr) {
              await pool.query("ROLLBACK");
              throw chipErr;
            }
          }
        }

        await pool.query(
          "UPDATE game_sessions SET status = 'playing', started_at = NOW() WHERE id = $1",
          [sessionId]
        );

        // Transition lobby → game
        lobby.status = "playing";
        const gameSeats = lobby.toGameSeats();

        // Record human participants in session_players (bots are excluded — not valid DB users)
        const humanSeats = gameSeats.filter((s) => !s.isBot);
        if (humanSeats.length > 0) {
          const numTeams = lobby.variant === 6 ? 3 : 2;
          await Promise.all(humanSeats.map((s) =>
            pool.query(
              `INSERT INTO session_players (session_id, user_id, seat, team)
               VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
              [sessionId, s.userId, s.seatIndex, s.seatIndex % numTeams]
            )
          ));
        }

        GameStore.createGame(sessionId, lobby.variant, gameSeats, lobby.teamNames);

        nsp.to(sessionId).emit("lobby:started", { sessionId });
      } catch (err) {
        console.error("lobby:start_game error:", err.message);
        socket.emit("lobby:error", { message: "Failed to start game." });
      }
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      QueueManager.dequeue(user.id);
      nsp.emit("queue:count", QueueManager.getCounts());

      // Drop this socket from any lobby's spectator list and broadcast
      // the updated state so remaining viewers see them leave.
      for (const lobby of GameStore.allLobbies()) {
        if (lobby.spectators.has(socket.id)) {
          lobby.removeSpectator(socket.id);
          nsp.to(lobby.sessionId).emit("lobby:state", lobby.publicState());
        }
      }
    });
  });
};
