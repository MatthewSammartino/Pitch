const { dealHands, getValidCards, determineTrickWinner, scoreRound } = require("./GameEngine");
const {
  getEffectiveSuit, getOffJackSuit, getTrumpPriority, parseCard, CARD_POINT_VALUES,
} = require("./deckConstants");

const TARGET_SCORE   = 15;
const CARDS_PER_HAND = 6; // 4-player; Phase 5 will adjust for 6-player

class GameStateMachine {
  /**
   * @param {string} sessionId
   * @param {number} variant  - 4 or 6
   * @param {Array}  seats    - [{ seatIndex, userId, displayName, avatarUrl }]
   */
  constructor(sessionId, variant, seats, teamNames = ["Team A", "Team B"]) {
    this.sessionId   = sessionId;
    this.variant     = variant;
    this.targetScore = TARGET_SCORE;
    this.teamNames   = teamNames;
    this.status      = "BIDDING"; // first action after lobby start

    // Assign teams: even seatIndex → team 0, odd → team 1
    this.seats = seats.map((s) => ({ ...s, team: s.seatIndex % 2 }));

    // Private hands: userId → [cardId]
    this.hands = {};
    const dealt = dealHands(variant, CARDS_PER_HAND);
    for (const seat of this.seats) this.hands[seat.userId] = dealt[seat.seatIndex];

    // Bidding — dealer = seat 0, bidding starts at seat 1
    this.dealerSeat     = 0;
    this.biddingOrder   = this._makeBiddingOrder(0);
    this.bidIndex       = 0;
    this.bids           = {};  // seatIndex → number | 'pass'
    this.currentBid     = 1;   // must beat this value to bid
    this.highBidderSeat = -1;

    // Trump
    this.trumpSuit = null;

    // Trick playing
    this.currentTrick  = []; // [{ seatIndex, card }]
    this.trickHistory  = []; // [{ plays: [...], winnerSeat }]
    this.nextLeaderSeat = -1;

    // Scores
    this.teamScores  = [0, 0];
    this.roundNumber = 1;
    this.lastRoundSummary = null;

    // Holds the last completed trick for display until the next trick starts
    this.completedTrick = null;

    // Bidder must lead trump on the first trick of each round
    this.mustLeadTrump = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _makeBiddingOrder(dealerSeat) {
    const order = [];
    for (let i = 1; i <= this.variant; i++)
      order.push((dealerSeat + i) % this.variant);
    return order;
  }

  getUserBySeat(seatIndex)  { return this.seats.find((s) => s.seatIndex === seatIndex); }
  getSeatByUser(userId)      { return this.seats.find((s) => s.userId === userId); }
  getCurrentBidderSeat()    { return this.biddingOrder[this.bidIndex]; }

  // ── State getters ─────────────────────────────────────────────────────────

  getPublicState() {
    return {
      sessionId:     this.sessionId,
      variant:       this.variant,
      status:        this.status,
      targetScore:   this.targetScore,
      teamNames:     this.teamNames,
      seats:         this.seats,
      dealerSeat:    this.dealerSeat,
      // Bidding
      currentBidderSeat: this.status === "BIDDING" ? this.getCurrentBidderSeat() : -1,
      bids:           this.bids,
      currentBid:     this.currentBid,
      highBidderSeat: this.highBidderSeat,
      // Trump
      trumpSuit: this.trumpSuit,
      // Trick
      currentTrick:   this.currentTrick,
      nextLeaderSeat: this.nextLeaderSeat,
      tricksPlayed:   this.trickHistory.length,
      completedTrick: this.completedTrick,
      // Scores
      teamScores:          this.teamScores,
      roundNumber:         this.roundNumber,
      lastRoundSummary:    this.lastRoundSummary,
      // Live scoring progress (null except during TRICK_PLAYING)
      liveRoundScoring: this.status === "TRICK_PLAYING" ? this.getLiveRoundScoring() : null,
    };
  }

  getPrivateState(userId) {
    const hand = this.hands[userId] || [];
    const seat = this.getSeatByUser(userId);
    if (!seat) return { hand: [], validCards: [] };

    let validCards = [];
    if (this.status === "TRICK_PLAYING" && this.nextLeaderSeat === seat.seatIndex) {
      if (this.mustLeadTrump && this.currentTrick.length === 0) {
        // Bidder must lead trump on the first trick
        const trumpCards = hand.filter((c) => getEffectiveSuit(c, this.trumpSuit) === this.trumpSuit);
        validCards = trumpCards.length > 0 ? trumpCards : [...hand];
      } else {
        validCards = getValidCards(hand, this.currentTrick, this.trumpSuit);
      }
    }
    return { hand, validCards };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  handleBid(userId, amount) {
    if (this.status !== "BIDDING") return { error: "Not in bidding phase" };

    const seat = this.getSeatByUser(userId);
    if (!seat) return { error: "Not a player" };
    if (seat.seatIndex !== this.getCurrentBidderSeat()) return { error: "Not your turn to bid" };

    const isLast = this.bidIndex === this.variant - 1;

    if (amount === "pass") {
      if (isLast && this.highBidderSeat === -1)
        return { error: "Dealer must bid (you are stuck — bid at least 2)" };
      this.bids[seat.seatIndex] = "pass";
      this.bidIndex++;
    } else {
      const n = Number(amount);
      if (!Number.isInteger(n) || n < 2 || n > 5)
        return { error: "Bid must be 2, 3, 4, or 5" };
      if (n <= this.currentBid)
        return { error: `Must bid more than ${this.currentBid}` };

      this.bids[seat.seatIndex] = n;
      this.currentBid     = n;
      this.highBidderSeat = seat.seatIndex;

      if (n === 5) {
        this.bidIndex = this.variant; // max bid ends bidding immediately
      } else {
        this.bidIndex++;
      }
    }

    if (this.bidIndex >= this.variant) {
      // Dealer stuck: nobody else bid
      if (this.highBidderSeat === -1) {
        this.highBidderSeat  = this.dealerSeat;
        this.currentBid      = 2;
        this.bids[this.dealerSeat] = 2;
      }
      this.status = "TRUMP_DECLARATION";
    }

    return { ok: true };
  }

  handleDeclareTrump(userId, suit) {
    if (this.status !== "TRUMP_DECLARATION") return { error: "Not time to declare trump" };

    const seat = this.getSeatByUser(userId);
    if (!seat) return { error: "Not a player" };
    if (seat.seatIndex !== this.highBidderSeat)
      return { error: "Only the winning bidder declares trump" };
    if (!["h","d","c","s"].includes(suit))
      return { error: "Invalid suit" };

    this.trumpSuit      = suit;
    this.nextLeaderSeat = this.highBidderSeat;
    this.mustLeadTrump  = true; // bidder must pitch trump on the first trick
    this.status         = "TRICK_PLAYING";

    return { ok: true };
  }

  handlePlayCard(userId, cardId) {
    if (this.status !== "TRICK_PLAYING") return { error: "Not in trick playing phase" };

    const seat = this.getSeatByUser(userId);
    if (!seat) return { error: "Not a player" };
    if (seat.seatIndex !== this.nextLeaderSeat) return { error: "Not your turn" };

    const hand = this.hands[userId] || [];
    if (!hand.includes(cardId)) return { error: "Card not in hand" };

    const valid = getValidCards(hand, this.currentTrick, this.trumpSuit);
    if (!valid.includes(cardId)) return { error: "Must follow the led suit" };

    // Starting a new trick
    if (this.currentTrick.length === 0) {
      this.completedTrick = null;
      if (this.mustLeadTrump) {
        if (getEffectiveSuit(cardId, this.trumpSuit) !== this.trumpSuit)
          return { error: "You must lead with trump (the pitch) on the first trick" };
        this.mustLeadTrump = false;
      }
    }

    // Remove from hand, add to trick
    this.hands[userId] = hand.filter((c) => c !== cardId);
    this.currentTrick.push({ seatIndex: seat.seatIndex, card: cardId });

    if (this.currentTrick.length === this.variant) {
      // Trick complete — save for display before clearing
      const winnerSeat = determineTrickWinner(this.currentTrick, this.trumpSuit);
      this.completedTrick = { plays: [...this.currentTrick], winnerSeat };
      this.trickHistory.push({ plays: [...this.currentTrick], winnerSeat });
      this.currentTrick   = [];
      this.nextLeaderSeat = winnerSeat;

      if (this.trickHistory.length === CARDS_PER_HAND) {
        // All tricks played — score the round
        return { ok: true, trickComplete: true, winnerSeat, ...this._scoreRound() };
      }
      return { ok: true, trickComplete: true, winnerSeat };
    }

    // Advance clockwise to next player in this trick
    this.nextLeaderSeat = (seat.seatIndex + 1) % this.variant;
    return { ok: true };
  }

  // ── Live round scoring (for display during trick-playing) ─────────────────

  getLiveRoundScoring() {
    if (!this.trumpSuit) return null;

    const offSuit   = getOffJackSuit(this.trumpSuit);
    const jackId    = "J" + this.trumpSuit;
    const offJackId = "J" + offSuit;

    const seatTeam = {};
    for (const s of this.seats) seatTeam[s.seatIndex] = s.team;

    const trumpsPlayed = [];
    const captured = { 0: [], 1: [] };

    // Completed tricks
    for (const trick of this.trickHistory) {
      const winnerTeam = seatTeam[trick.winnerSeat];
      for (const play of trick.plays) {
        if (getEffectiveSuit(play.card, this.trumpSuit) === this.trumpSuit) {
          trumpsPlayed.push({ card: play.card, seatIndex: play.seatIndex, team: seatTeam[play.seatIndex] });
        }
        captured[winnerTeam].push(play.card);
      }
    }

    // Include trump cards from the in-progress trick for High/Low preview
    for (const play of this.currentTrick) {
      if (getEffectiveSuit(play.card, this.trumpSuit) === this.trumpSuit) {
        trumpsPlayed.push({ card: play.card, seatIndex: play.seatIndex, team: seatTeam[play.seatIndex] });
      }
    }

    const result = {};

    if (trumpsPlayed.length > 0) {
      result.high = trumpsPlayed.reduce((a, b) =>
        getTrumpPriority(a.card, this.trumpSuit) >= getTrumpPriority(b.card, this.trumpSuit) ? a : b
      );
      result.low = trumpsPlayed.reduce((a, b) =>
        getTrumpPriority(a.card, this.trumpSuit) <= getTrumpPriority(b.card, this.trumpSuit) ? a : b
      );
    }

    for (let t = 0; t <= 1; t++) {
      if (captured[t].includes(jackId))    result.jack    = { card: jackId,    team: t };
      if (captured[t].includes(offJackId)) result.offJack = { card: offJackId, team: t };
    }

    // Game pts from completed tricks only
    const gameVals = [0, 0];
    for (let t = 0; t <= 1; t++) {
      for (const card of captured[t]) {
        const { rank, suit } = parseCard(card);
        const isOffJack = rank === "J" && suit === offSuit;
        gameVals[t] += isOffJack ? 0.5 : (CARD_POINT_VALUES[rank] || 0);
      }
    }
    result.gameValues = gameVals;

    return result;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _scoreRound() {
    const { teamPoints, breakdown } = scoreRound(this.trickHistory, this.trumpSuit, this.seats);

    // Bid failure: bidder's team loses the bid amount instead of keeping earned points
    const bidderTeam = this.getSeatByUser(
      this.getUserBySeat(this.highBidderSeat)?.userId
    )?.team ?? 0;

    const bidderActualTeam = this.seats.find((s) => s.seatIndex === this.highBidderSeat)?.team ?? 0;

    if (teamPoints[bidderActualTeam] < this.currentBid) {
      teamPoints[bidderActualTeam] = -this.currentBid;
    }

    this.teamScores[0] += teamPoints[0];
    this.teamScores[1] += teamPoints[1];

    const summary = {
      roundNumber:    this.roundNumber,
      bidderSeat:     this.highBidderSeat,
      bid:            this.currentBid,
      bidMade:        teamPoints[bidderActualTeam] > 0,
      teamPointsEarned: teamPoints,
      teamScores:     [...this.teamScores],
      breakdown,
      trumpSuit:      this.trumpSuit,
      tricks:         this.trickHistory.map((t) => ({ ...t })),
    };
    this.lastRoundSummary = summary;

    // Check game over (both teams reaching target same round: higher score wins)
    const aWon = this.teamScores[0] >= this.targetScore;
    const bWon = this.teamScores[1] >= this.targetScore;

    if (aWon || bWon) {
      this.status = "GAME_OVER";
      const winner = this.teamScores[0] >= this.teamScores[1] ? 0 : 1;
      return { roundSummary: summary, gameOver: true, winner };
    }

    // Start next round
    this._startNextRound();
    return { roundSummary: summary, gameOver: false };
  }

  _startNextRound() {
    this.roundNumber++;
    this.dealerSeat     = (this.dealerSeat + 1) % this.variant;
    this.biddingOrder   = this._makeBiddingOrder(this.dealerSeat);
    this.bidIndex       = 0;
    this.bids           = {};
    this.currentBid     = 1;
    this.highBidderSeat = -1;
    this.trumpSuit      = null;
    this.mustLeadTrump  = false;
    this.currentTrick   = [];
    this.trickHistory   = [];
    this.nextLeaderSeat = -1;
    this.status         = "BIDDING";

    const dealt = dealHands(this.variant, CARDS_PER_HAND);
    for (const seat of this.seats) this.hands[seat.userId] = dealt[seat.seatIndex];
  }
}

module.exports = GameStateMachine;
