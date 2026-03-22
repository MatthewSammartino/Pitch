/**
 * In-memory lobby/game store.
 * Phase 3: tracks lobby seat state.
 * Phase 4: will be extended with full GameStateMachine.
 */

class LobbyState {
  constructor(sessionId, groupId, variant, createdBy) {
    this.sessionId = sessionId;
    this.groupId   = groupId;
    this.variant   = variant;   // 4 or 6
    this.createdBy = createdBy; // user id
    this.status    = "waiting";
    this.seats     = Array(variant).fill(null);
    // null = empty; { userId, displayName, avatarUrl } = taken
  }

  takeSeat(seatIndex, user) {
    if (seatIndex < 0 || seatIndex >= this.seats.length)
      return { error: "Invalid seat index" };
    if (this.seats[seatIndex] !== null)
      return { error: "Seat is already taken" };

    // Remove the user from any other seat first
    this.seats = this.seats.map((s) =>
      s && s.userId === user.id ? null : s
    );

    this.seats[seatIndex] = {
      userId:      user.id,
      displayName: user.display_name,
      avatarUrl:   user.avatar_url || null,
    };
    return { ok: true };
  }

  leaveSeat(userId) {
    this.seats = this.seats.map((s) =>
      s && s.userId === userId ? null : s
    );
    return { ok: true };
  }

  filledCount() {
    return this.seats.filter(Boolean).length;
  }

  isFull() {
    return this.filledCount() === this.variant;
  }

  publicState() {
    return {
      sessionId:  this.sessionId,
      variant:    this.variant,
      status:     this.status,
      createdBy:  this.createdBy,
      seats:      this.seats,
      filledCount: this.filledCount(),
    };
  }
}

const store = new Map(); // sessionId → LobbyState

module.exports = {
  create(sessionId, groupId, variant, createdBy) {
    const lobby = new LobbyState(sessionId, groupId, variant, createdBy);
    store.set(sessionId, lobby);
    return lobby;
  },

  get(sessionId) {
    return store.get(sessionId) || null;
  },

  delete(sessionId) {
    store.delete(sessionId);
  },

  has(sessionId) {
    return store.has(sessionId);
  },
};
