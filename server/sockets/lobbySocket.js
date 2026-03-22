const GameStore = require("../game/GameStore");
const pool      = require("../db/pool");

/**
 * /lobby namespace
 *
 * Client events:
 *   lobby:join        { sessionId }
 *   lobby:take_seat   { sessionId, seatIndex }
 *   lobby:leave_seat  { sessionId }
 *   lobby:start_game  { sessionId }
 *
 * Server broadcasts to room (sessionId):
 *   lobby:state       publicState()
 *   lobby:started     { sessionId }
 *   lobby:error       { message }   → individual socket only
 */
module.exports = function lobbySocket(nsp) {
  nsp.use((socket, next) => {
    const user = socket.request.user;
    if (!user) return next(new Error("unauthorized"));
    next();
  });

  nsp.on("connection", (socket) => {
    const user = socket.request.user;

    // ── lobby:join ───────────────────────────────────────────────────────────
    socket.on("lobby:join", ({ sessionId } = {}) => {
      if (!sessionId) return;

      let lobby = GameStore.get(sessionId);

      // If not in memory (server restart), try to rebuild from DB
      if (!lobby) {
        pool.query(
          "SELECT * FROM game_sessions WHERE id = $1 AND status = 'waiting'",
          [sessionId]
        ).then(({ rows }) => {
          if (!rows.length) {
            return socket.emit("lobby:error", { message: "Lobby not found or already started." });
          }
          const s = rows[0];
          lobby = GameStore.create(s.id, s.group_id, s.variant, s.created_by);
          socket.join(sessionId);
          socket.emit("lobby:state", lobby.publicState());
        }).catch(() => {
          socket.emit("lobby:error", { message: "Failed to load lobby." });
        });
        return;
      }

      socket.join(sessionId);
      socket.emit("lobby:state", lobby.publicState());
    });

    // ── lobby:take_seat ──────────────────────────────────────────────────────
    socket.on("lobby:take_seat", ({ sessionId, seatIndex } = {}) => {
      const lobby = GameStore.get(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Game has already started." });

      const result = lobby.takeSeat(seatIndex, user);
      if (result.error) return socket.emit("lobby:error", { message: result.error });

      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:leave_seat ─────────────────────────────────────────────────────
    socket.on("lobby:leave_seat", ({ sessionId } = {}) => {
      const lobby = GameStore.get(sessionId);
      if (!lobby) return;
      lobby.leaveSeat(user.id);
      nsp.to(sessionId).emit("lobby:state", lobby.publicState());
    });

    // ── lobby:start_game ─────────────────────────────────────────────────────
    socket.on("lobby:start_game", async ({ sessionId } = {}) => {
      const lobby = GameStore.get(sessionId);
      if (!lobby) return socket.emit("lobby:error", { message: "Lobby not found." });
      if (lobby.createdBy !== user.id)
        return socket.emit("lobby:error", { message: "Only the host can start the game." });
      if (!lobby.isFull())
        return socket.emit("lobby:error", { message: "All seats must be filled before starting." });
      if (lobby.status !== "waiting")
        return socket.emit("lobby:error", { message: "Game already started." });

      try {
        // Update DB
        await pool.query(
          "UPDATE game_sessions SET status = 'active', started_at = NOW() WHERE id = $1",
          [sessionId]
        );
        lobby.status = "active";

        nsp.to(sessionId).emit("lobby:started", { sessionId });
      } catch (err) {
        console.error("lobby:start_game error:", err.message);
        socket.emit("lobby:error", { message: "Failed to start game." });
      }
    });

    // Remove from seats on disconnect
    socket.on("disconnect", () => {
      // Leave all rooms gracefully — seat stays reserved so brief disconnects
      // don't lose the seat. Phase 4 will handle reconnection timeouts.
    });
  });
};
