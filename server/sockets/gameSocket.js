const GameStore   = require("../game/GameStore");
const { saveRound, saveRoundPoints, finalizeSession } = require("../game/persistence");
const { getEffectiveSuit } = require("../game/deckConstants");

/**
 * /game namespace
 *
 * Client → Server:
 *   game:join           { sessionId }
 *   game:bid            { sessionId, amount }   "pass" | 2-5
 *   game:declare_trump  { sessionId, suit }     "h"|"d"|"c"|"s"
 *   game:play_card      { sessionId, card }     e.g. "Jh", "10s"
 *   game:request_state  { sessionId }
 *
 * Server → Client:
 *   game:state          publicState()            → room broadcast
 *   game:your_hand      { hand, validCards }     → individual only
 *   game:your_turn      { userId, action, ... }  → room broadcast (clients check userId)
 *   game:round_over     roundSummary             → room broadcast
 *   game:game_over      { winner, teamScores }   → room broadcast
 *   game:error          { message }              → individual only
 */
const AFK_TIMEOUT_MS  = 45_000; // 45 s before AFK vote is initiated
const VOTE_TIMEOUT_MS = 30_000; // 30 s for the vote itself before it auto-cancels

module.exports = function gameSocket(nsp) {
  // Track userId → socket for private messages
  // Map<sessionId, Map<userId, socket>>
  const sessionSockets = new Map();

  // AFK state per game session
  const afkTimers    = new Map(); // sessionId → { timer, userId }
  const pendingVotes = new Map(); // sessionId → { targetUserId, displayName, totalVoters, approvals: Set, denials: Set, voteTimer }

  function trackSocket(sessionId, userId, socket) {
    if (!sessionSockets.has(sessionId)) sessionSockets.set(sessionId, new Map());
    sessionSockets.get(sessionId).set(userId, socket);
  }

  function sendPrivate(sessionId, userId, event, data) {
    const sock = sessionSockets.get(sessionId)?.get(userId);
    if (sock?.connected) sock.emit(event, data);
  }

  function broadcastHands(sessionId, game) {
    for (const seat of game.seats) {
      sendPrivate(sessionId, seat.userId, "game:your_hand", game.getPrivateState(seat.userId));
    }
  }

  // ── AFK helpers ────────────────────────────────────────────────────────────

  function clearAfkTimer(sessionId) {
    const entry = afkTimers.get(sessionId);
    if (entry) { clearTimeout(entry.timer); afkTimers.delete(sessionId); }
  }

  function startAfkTimer(sessionId, userId, displayName) {
    clearAfkTimer(sessionId);
    const timer = setTimeout(() => initiateAfkVote(sessionId, userId, displayName), AFK_TIMEOUT_MS);
    afkTimers.set(sessionId, { timer, userId });
  }

  function initiateAfkVote(sessionId, userId, displayName) {
    const game = GameStore.getGame(sessionId);
    if (!game) return;

    // Only human non-AFK players can vote
    const voters = game.seats.filter(
      (s) => !s.userId?.startsWith("bot-") && s.userId !== userId
    );

    if (voters.length === 0) {
      // No one to vote — replace immediately
      replaceAfkWithBot(sessionId, userId, displayName);
      return;
    }

    const voteTimer = setTimeout(() => {
      // Vote timed out → cancel; give player another chance
      pendingVotes.delete(sessionId);
      nsp.to(sessionId).emit("game:afk_vote_result", {
        approved: false, targetUserId: userId, displayName,
      });
      startAfkTimer(sessionId, userId, displayName);
    }, VOTE_TIMEOUT_MS);

    pendingVotes.set(sessionId, {
      targetUserId: userId, displayName,
      totalVoters: voters.length,
      approvals: new Set(), denials: new Set(),
      voteTimer,
    });

    nsp.to(sessionId).emit("game:afk_vote", {
      targetUserId: userId, displayName, totalVoters: voters.length,
    });
  }

  function replaceAfkWithBot(sessionId, userId, displayName) {
    const game = GameStore.getGame(sessionId);
    if (!game) return;

    const result = game.replaceWithBot(userId);
    if (result.error) return;

    sessionSockets.get(sessionId)?.delete(userId);
    clearAfkTimer(sessionId);

    nsp.to(sessionId).emit("game:afk_vote_result", {
      approved: true, targetUserId: userId, displayName: displayName || userId,
    });
    nsp.to(sessionId).emit("game:state", game.getPublicState());
    broadcastHands(sessionId, game);
    broadcastTurnNotice(sessionId, game);
    autoBotPlay(sessionId);
  }

  function cleanupSession(sessionId) {
    clearAfkTimer(sessionId);
    const vote = pendingVotes.get(sessionId);
    if (vote) { clearTimeout(vote.voteTimer); pendingVotes.delete(sessionId); }
  }

  // ── Turn notice + AFK timer ────────────────────────────────────────────────

  function broadcastTurnNotice(sessionId, game) {
    let info = null;
    let turnUserId = null;
    let turnDisplayName = null;

    if (game.status === "BIDDING") {
      const bidderSeat = game.getCurrentBidderSeat();
      const bidder     = game.getUserBySeat(bidderSeat);
      if (bidder) {
        turnUserId      = bidder.userId;
        turnDisplayName = bidder.displayName;
        const minBid  = game.currentBid + 1;
        const isLast  = game.bidIndex === game.variant - 1;
        const canPass = !(isLast && game.highBidderSeat === -1);
        const bids    = [];
        for (let b = Math.max(2, minBid); b <= 5; b++) bids.push(b);
        info = { userId: bidder.userId, action: "bid", validBids: bids, canPass };
      }
    } else if (game.status === "TRUMP_DECLARATION") {
      const declarer = game.getUserBySeat(game.highBidderSeat);
      if (declarer) {
        turnUserId      = declarer.userId;
        turnDisplayName = declarer.displayName;
        info = { userId: declarer.userId, action: "declare_trump" };
      }
    } else if (game.status === "TRICK_PLAYING") {
      const leader = game.getUserBySeat(game.nextLeaderSeat);
      if (leader) {
        turnUserId      = leader.userId;
        turnDisplayName = leader.displayName;
        const ps = game.getPrivateState(leader.userId);
        info = { userId: leader.userId, action: "play_card", validCards: ps.validCards };
      }
    }

    if (info) nsp.to(sessionId).emit("game:your_turn", info);

    // AFK timer — only for human turns
    if (turnUserId && !turnUserId.startsWith("bot-")) {
      startAfkTimer(sessionId, turnUserId, turnDisplayName);
    } else {
      clearAfkTimer(sessionId);
    }
  }

  function autoBotPlay(sessionId) {
    const game = GameStore.getGame(sessionId);
    if (!game) return;

    let botUserId = null;
    let action = null;

    if (game.status === "BIDDING") {
      const seat = game.getUserBySeat(game.getCurrentBidderSeat());
      if (seat?.userId?.startsWith("bot-")) { botUserId = seat.userId; action = "bid"; }
    } else if (game.status === "TRUMP_DECLARATION") {
      const seat = game.getUserBySeat(game.highBidderSeat);
      if (seat?.userId?.startsWith("bot-")) { botUserId = seat.userId; action = "trump"; }
    } else if (game.status === "TRICK_PLAYING") {
      const seat = game.getUserBySeat(game.nextLeaderSeat);
      if (seat?.userId?.startsWith("bot-")) { botUserId = seat.userId; action = "card"; }
    }

    if (!botUserId) return;

    setTimeout(() => {
      const g = GameStore.getGame(sessionId);
      if (!g) return;

      if (action === "bid") {
        const isLast = g.bidIndex === g.variant - 1;
        const canPass = !(isLast && g.highBidderSeat === -1);
        const result = g.handleBid(botUserId, canPass ? "pass" : 2);
        if (result.error) return;
        nsp.to(sessionId).emit("game:state", g.getPublicState());
        broadcastTurnNotice(sessionId, g);
        autoBotPlay(sessionId);

      } else if (action === "trump") {
        const hand = g.hands[botUserId] || [];
        const suitCount = { h: 0, d: 0, c: 0, s: 0 };
        for (const card of hand) suitCount[card.slice(-1)]++;
        const suit = Object.entries(suitCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "s";
        const result = g.handleDeclareTrump(botUserId, suit);
        if (result.error) return;
        nsp.to(sessionId).emit("game:state", g.getPublicState());
        broadcastHands(sessionId, g);
        broadcastTurnNotice(sessionId, g);
        autoBotPlay(sessionId);

      } else if (action === "card") {
        const ps = g.getPrivateState(botUserId);
        // When following, prefer led-suit cards over trump — don't waste trump
        let card;
        if (g.currentTrick.length > 0) {
          const ledSuit = getEffectiveSuit(g.currentTrick[0].card, g.trumpSuit);
          const ledSuitCards = ps.validCards.filter(
            (c) => getEffectiveSuit(c, g.trumpSuit) === ledSuit
          );
          card = (ledSuitCards.length > 0 ? ledSuitCards : ps.validCards)[0];
        } else {
          card = ps.validCards[0];
        }
        if (!card) return;
        const result = g.handlePlayCard(botUserId, card);
        if (result.error) return;
        nsp.to(sessionId).emit("game:state", g.getPublicState());
        if (result.roundSummary) {
          setTimeout(() => handleRoundEnd(sessionId, g, result), 1500);
        } else if (result.trickComplete) {
          setTimeout(() => {
            broadcastTurnNotice(sessionId, g);
            autoBotPlay(sessionId);
          }, 1500);
        } else {
          broadcastTurnNotice(sessionId, g);
          autoBotPlay(sessionId);
        }
      }
    }, 800);
  }

  async function handleRoundEnd(sessionId, game, roundResult) {
    const { roundSummary, gameOver, winner } = roundResult;

    // Persist round
    try {
      const roundId = await saveRound(sessionId, roundSummary, game.seats);
      await saveRoundPoints(roundId, roundSummary.breakdown, game.seats);
    } catch (err) {
      console.error("Persistence error:", err.message);
    }

    nsp.to(sessionId).emit("game:round_over", roundSummary);

    if (gameOver) {
      cleanupSession(sessionId);
      nsp.to(sessionId).emit("game:game_over", { winner, teamScores: game.teamScores, teamNames: game.teamNames });
      try { await finalizeSession(sessionId, game.teamScores); } catch (e) { /* ignore */ }
      GameStore.deleteGame(sessionId);
    } else {
      // Short delay so clients can show the round summary before dealing
      setTimeout(() => {
        nsp.to(sessionId).emit("game:state", game.getPublicState());
        broadcastHands(sessionId, game);
        broadcastTurnNotice(sessionId, game);
        autoBotPlay(sessionId);
      }, 4000);
    }
  }

  nsp.on("connection", (socket) => {
    const user = socket.request.user;

    socket.on("game:join", ({ sessionId } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return socket.emit("game:error", { message: "Game not found." });

      socket.join(sessionId);
      trackSocket(sessionId, user.id, socket);

      socket.emit("game:state", game.getPublicState());
      socket.emit("game:your_hand", game.getPrivateState(user.id));

      broadcastTurnNotice(sessionId, game);
      autoBotPlay(sessionId);
    });

    socket.on("game:request_state", ({ sessionId } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return;
      socket.emit("game:state", game.getPublicState());
      socket.emit("game:your_hand", game.getPrivateState(user.id));
    });

    socket.on("game:bid", ({ sessionId, amount } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return socket.emit("game:error", { message: "Game not found." });

      clearAfkTimer(sessionId);
      const result = game.handleBid(user.id, amount);
      if (result.error) return socket.emit("game:error", { message: result.error });

      nsp.to(sessionId).emit("game:state", game.getPublicState());
      broadcastTurnNotice(sessionId, game);
      autoBotPlay(sessionId);
    });

    socket.on("game:declare_trump", ({ sessionId, suit } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return socket.emit("game:error", { message: "Game not found." });

      clearAfkTimer(sessionId);
      const result = game.handleDeclareTrump(user.id, suit);
      if (result.error) return socket.emit("game:error", { message: result.error });

      nsp.to(sessionId).emit("game:state", game.getPublicState());
      broadcastHands(sessionId, game);
      broadcastTurnNotice(sessionId, game);
      autoBotPlay(sessionId);
    });

    socket.on("game:play_card", ({ sessionId, card } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return socket.emit("game:error", { message: "Game not found." });

      clearAfkTimer(sessionId);

      const result = game.handlePlayCard(user.id, card);
      if (result.error) return socket.emit("game:error", { message: result.error });

      nsp.to(sessionId).emit("game:state", game.getPublicState());

      if (result.roundSummary) {
        // Delay before round-over so players can see the last card played
        setTimeout(() => handleRoundEnd(sessionId, game, result), 1500);
      } else if (result.trickComplete) {
        sendPrivate(sessionId, user.id, "game:your_hand", game.getPrivateState(user.id));
        // Delay so players can see the completed trick before it clears
        setTimeout(() => {
          broadcastTurnNotice(sessionId, game);
          autoBotPlay(sessionId);
        }, 1500);
      } else {
        sendPrivate(sessionId, user.id, "game:your_hand", game.getPrivateState(user.id));
        broadcastTurnNotice(sessionId, game);
        autoBotPlay(sessionId);
      }
    });

    // ── chat:send ──────────────────────────────────────────────────────────
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

    // ── game:afk_vote_cast ─────────────────────────────────────────────────
    socket.on("game:afk_vote_cast", ({ sessionId, approve } = {}) => {
      const vote = pendingVotes.get(sessionId);
      if (!vote) return;

      const game = GameStore.getGame(sessionId);
      if (!game) return;

      // Must be a player in the game and not the target
      const voter = game.seats.find((s) => s.userId === user.id);
      if (!voter || user.id === vote.targetUserId) return;

      if (approve) { vote.approvals.add(user.id); vote.denials.delete(user.id); }
      else         { vote.denials.add(user.id);   vote.approvals.delete(user.id); }

      nsp.to(sessionId).emit("game:afk_vote_update", {
        targetUserId: vote.targetUserId,
        displayName:  vote.displayName,
        approvals:    vote.approvals.size,
        denials:      vote.denials.size,
        totalVoters:  vote.totalVoters,
      });

      const majority = Math.floor(vote.totalVoters / 2) + 1;

      if (vote.approvals.size >= majority) {
        clearTimeout(vote.voteTimer);
        pendingVotes.delete(sessionId);
        replaceAfkWithBot(sessionId, vote.targetUserId, vote.displayName);
      } else if (vote.denials.size >= majority) {
        clearTimeout(vote.voteTimer);
        const { targetUserId, displayName } = vote;
        pendingVotes.delete(sessionId);
        nsp.to(sessionId).emit("game:afk_vote_result", {
          approved: false, targetUserId, displayName,
        });
        startAfkTimer(sessionId, targetUserId, displayName);
      }
    });

    socket.on("disconnect", () => {
      // Clean up socket tracking
      for (const [sid, userMap] of sessionSockets.entries()) {
        if (userMap.get(user.id) === socket) {
          userMap.delete(user.id);
          if (userMap.size === 0) sessionSockets.delete(sid);
        }
      }
    });
  });
};
