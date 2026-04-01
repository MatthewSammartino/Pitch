/**
 * In-memory store for active lobbies and games.
 * Both are keyed by sessionId (UUID).
 */
const GameStateMachine = require("./GameStateMachine");

// ── Lobby state ─────────────────────────────────────────────────────────────

class LobbyState {
  constructor(sessionId, groupId, variant, createdBy) {
    this.sessionId  = sessionId;
    this.groupId    = groupId;
    this.variant    = variant;
    this.createdBy  = createdBy;
    this.status     = "waiting";
    this.seats      = Array(variant).fill(null);
    this.teamNames  = variant === 6 ? ["A", "B", "C"] : ["A", "B"];
  }

  setTeamNames(names) {
    const numTeams = this.variant === 6 ? 3 : 2;
    this.teamNames = Array.from({ length: numTeams }, (_, i) =>
      (names?.[i]?.trim()) || String.fromCharCode(65 + i)
    );
    return { ok: true };
  }

  takeSeat(seatIndex, user) {
    if (seatIndex < 0 || seatIndex >= this.seats.length)
      return { error: "Invalid seat index" };
    if (this.seats[seatIndex] !== null)
      return { error: "Seat is already taken" };

    this.seats = this.seats.map((s) => (s && s.userId === user.id ? null : s));
    this.seats[seatIndex] = {
      userId:      user.id,
      displayName: user.display_name,
      avatarUrl:   user.avatar_url || null,
    };
    return { ok: true };
  }

  leaveSeat(userId) {
    this.seats = this.seats.map((s) => (s && s.userId === userId ? null : s));
    return { ok: true };
  }

  filledCount() { return this.seats.filter(Boolean).length; }
  isFull()      { return this.filledCount() === this.variant; }

  /** Converts to GameStateMachine-compatible seat array */
  toGameSeats() {
    return this.seats.map((s, i) => ({
      seatIndex:   i,
      userId:      s.userId,
      displayName: s.displayName,
      avatarUrl:   s.avatarUrl,
    }));
  }

  publicState() {
    return {
      sessionId:   this.sessionId,
      variant:     this.variant,
      status:      this.status,
      createdBy:   this.createdBy,
      seats:       this.seats,
      filledCount: this.filledCount(),
      teamNames:   this.teamNames,
    };
  }
}

// ── Maps ─────────────────────────────────────────────────────────────────────

const lobbies = new Map(); // sessionId → LobbyState
const games   = new Map(); // sessionId → GameStateMachine

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Lobby
  createLobby(sessionId, groupId, variant, createdBy) {
    const lobby = new LobbyState(sessionId, groupId, variant, createdBy);
    lobbies.set(sessionId, lobby);
    return lobby;
  },
  getLobby(sessionId)    { return lobbies.get(sessionId) || null; },
  deleteLobby(sessionId) { lobbies.delete(sessionId); },
  hasLobby(sessionId)    { return lobbies.has(sessionId); },

  // Game
  createGame(sessionId, variant, seats, teamNames) {
    const game = new GameStateMachine(sessionId, variant, seats, teamNames);
    games.set(sessionId, game);
    return game;
  },
  getGame(sessionId)    { return games.get(sessionId) || null; },
  deleteGame(sessionId) { games.delete(sessionId); },
  hasGame(sessionId)    { return games.has(sessionId); },
};
