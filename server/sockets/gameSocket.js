const GameStore   = require("../game/GameStore");
const { saveRound, saveRoundPoints, finalizeSession } = require("../game/persistence");

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
module.exports = function gameSocket(nsp) {
  // Track userId → socket for private messages
  // Map<sessionId, Map<userId, socket>>
  const sessionSockets = new Map();

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

  function broadcastTurnNotice(sessionId, game) {
    let info = null;
    if (game.status === "BIDDING") {
      const bidderSeat = game.getCurrentBidderSeat();
      const bidder     = game.getUserBySeat(bidderSeat);
      if (bidder) {
        const minBid  = game.currentBid + 1;
        const isLast  = game.bidIndex === game.variant - 1;
        const canPass = !(isLast && game.highBidderSeat === -1);
        const bids    = [];
        for (let b = Math.max(2, minBid); b <= 5; b++) bids.push(b);
        info = { userId: bidder.userId, action: "bid", validBids: bids, canPass };
      }
    } else if (game.status === "TRUMP_DECLARATION") {
      const declarer = game.getUserBySeat(game.highBidderSeat);
      if (declarer) info = { userId: declarer.userId, action: "declare_trump" };
    } else if (game.status === "TRICK_PLAYING") {
      const leader = game.getUserBySeat(game.nextLeaderSeat);
      if (leader) {
        const ps = game.getPrivateState(leader.userId);
        info = { userId: leader.userId, action: "play_card", validCards: ps.validCards };
      }
    }
    if (info) nsp.to(sessionId).emit("game:your_turn", info);
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
        const card = ps.validCards[0];
        if (!card) return;
        const result = g.handlePlayCard(botUserId, card);
        if (result.error) return;
        nsp.to(sessionId).emit("game:state", g.getPublicState());
        if (result.roundSummary) {
          handleRoundEnd(sessionId, g, result);
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
      nsp.to(sessionId).emit("game:game_over", { winner, teamScores: game.teamScores });
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

      const result = game.handleBid(user.id, amount);
      if (result.error) return socket.emit("game:error", { message: result.error });

      nsp.to(sessionId).emit("game:state", game.getPublicState());
      broadcastTurnNotice(sessionId, game);
      autoBotPlay(sessionId);
    });

    socket.on("game:declare_trump", ({ sessionId, suit } = {}) => {
      const game = GameStore.getGame(sessionId);
      if (!game) return socket.emit("game:error", { message: "Game not found." });

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

      const result = game.handlePlayCard(user.id, card);
      if (result.error) return socket.emit("game:error", { message: result.error });

      nsp.to(sessionId).emit("game:state", game.getPublicState());

      if (result.roundSummary) {
        handleRoundEnd(sessionId, game, result);
      } else {
        sendPrivate(sessionId, user.id, "game:your_hand", game.getPrivateState(user.id));
        broadcastTurnNotice(sessionId, game);
        autoBotPlay(sessionId);
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
