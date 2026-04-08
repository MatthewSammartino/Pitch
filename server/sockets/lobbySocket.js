const GameStore = require("../game/GameStore");
const pool      = require("../db/pool");

/**
 * /lobby namespace
 *
 * Client → Server:
 *   lobby:join        { sessionId }
 *   lobby:take_seat   { sessionId, seatIndex }
 *   lobby:leave_seat  { sessionId }
 *   lobby:start_game  { sessionId }
 *
 * Server → Client (room = sessionId):
 *   lobby:state       publicState()
 *   lobby:started     { sessionId }
 *   lobby:error       { message }  (individual)
 */
module.exports = function lobbySocket(nsp) {
  nsp.on("connection", (socket) => {
    const user = socket.request.user;

    // ── lobby:join ──────────────────────────────────────────────────────────
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
          lobby = GameStore.createLobby(s.id, s.group_id, s.variant, s.created_by, s.short_code);
          socket.join(sessionId);
          socket.emit("lobby:state", lobby.publicState());
        }).catch(() => socket.emit("lobby:error", { message: "Failed to load lobby." }));
        return;
      }

      socket.join(sessionId);
      socket.emit("lobby:state", lobby.publicState());
    });

    // ── lobby:take_seat ─────────────────────────────────────────────────────
    socket.on("lobby:take_seat", ({ sessionId, seatIndex } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Game has already started." });

      const result = lobby.takeSeat(seatIndex, user);
      if (result.error) return socket.emit("lobby:error", { message: result.error });

      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:leave_seat ────────────────────────────────────────────────────
    socket.on("lobby:leave_seat", ({ sessionId } = {}) => {
      const lobby = GameStore.getLobby(sessionId);
      if (!lobby) return;
      lobby.leaveSeat(user.id);
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
      nsp.to(sessionId).emit("chat:message", {
        userId:      user.id,
        displayName: user.display_name,
        avatarUrl:   user.avatar_url || null,
        text:        trimmed,
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
  });
};
