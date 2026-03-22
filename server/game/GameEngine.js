/**
 * Pure game-logic functions — no side effects, no state mutation.
 */
const {
  createDeck, parseCard, getOffJackSuit, getEffectiveSuit,
  getTrumpPriority, RANK_ORDER, CARD_POINT_VALUES,
} = require("./deckConstants");

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deal `cardsEach` cards to `playerCount` players.
 * Returns an object indexed by seatIndex: { 0: [cards], 1: [cards], ... }
 */
function dealHands(playerCount, cardsEach = 6) {
  const deck = shuffle(createDeck());
  const hands = {};
  for (let i = 0; i < playerCount; i++) {
    hands[i] = deck.slice(i * cardsEach, (i + 1) * cardsEach);
  }
  return hands;
}

/**
 * Return which cards in `hand` are legal to play given the current trick state.
 */
function getValidCards(hand, trick, trumpSuit) {
  if (trick.length === 0) return [...hand]; // lead anything
  const ledSuit = getEffectiveSuit(trick[0].card, trumpSuit);
  // You may always play the led suit OR trump — if you have neither, play anything
  const valid = hand.filter((c) => {
    const eff = getEffectiveSuit(c, trumpSuit);
    return eff === ledSuit || eff === trumpSuit;
  });
  return valid.length > 0 ? valid : [...hand];
}

/**
 * Return the seatIndex of the trick winner.
 */
function determineTrickWinner(trick, trumpSuit) {
  const ledSuit = getEffectiveSuit(trick[0].card, trumpSuit);
  let best = null;
  let bestVal = -Infinity;

  for (const play of trick) {
    const eSuit = getEffectiveSuit(play.card, trumpSuit);
    let val;
    if (eSuit === trumpSuit) {
      val = 1000 + getTrumpPriority(play.card, trumpSuit);
    } else if (eSuit === ledSuit) {
      val = RANK_ORDER.indexOf(parseCard(play.card).rank);
    } else {
      val = -1; // off-suit, can't win
    }
    if (val > bestVal) { bestVal = val; best = play; }
  }
  return best.seatIndex;
}

/**
 * Score a completed round.
 *
 * @param {Array}  trickHistory - [{ plays: [{seatIndex,card}], winnerSeat }]
 * @param {string} trumpSuit
 * @param {Array}  seats        - [{ seatIndex, team (0|1) }]
 * @returns {{ teamPoints: [number,number], breakdown: object }}
 */
function scoreRound(trickHistory, trumpSuit, seats) {
  const offSuit   = getOffJackSuit(trumpSuit);
  const jackId    = "J" + trumpSuit;
  const offJackId = "J" + offSuit;

  const seatTeam = {};
  for (const s of seats) seatTeam[s.seatIndex] = s.team;

  // Collect: all trump cards played (with who played them) + all cards captured per team
  const trumpsPlayed = []; // { card, seatIndex, team }
  const captured = { 0: [], 1: [] };

  for (const trick of trickHistory) {
    const winnerTeam = seatTeam[trick.winnerSeat];
    for (const play of trick.plays) {
      if (getEffectiveSuit(play.card, trumpSuit) === trumpSuit) {
        trumpsPlayed.push({
          card: play.card,
          seatIndex: play.seatIndex,
          team: seatTeam[play.seatIndex],
        });
      }
      captured[winnerTeam].push(play.card);
    }
  }

  const points = [0, 0];
  const breakdown = {};

  // High (team that played highest trump)
  if (trumpsPlayed.length > 0) {
    const high = trumpsPlayed.reduce((a, b) =>
      getTrumpPriority(a.card, trumpSuit) >= getTrumpPriority(b.card, trumpSuit) ? a : b
    );
    points[high.team]++;
    breakdown.high = { card: high.card, team: high.team, seatIndex: high.seatIndex };
  }

  // Low (team that played lowest trump)
  if (trumpsPlayed.length > 0) {
    const low = trumpsPlayed.reduce((a, b) =>
      getTrumpPriority(a.card, trumpSuit) <= getTrumpPriority(b.card, trumpSuit) ? a : b
    );
    points[low.team]++;
    breakdown.low = { card: low.card, team: low.team, seatIndex: low.seatIndex };
  }

  // Jack (team that captured jack of trump)
  for (let t = 0; t <= 1; t++) {
    if (captured[t].includes(jackId)) {
      points[t]++;
      breakdown.jack = { card: jackId, team: t };
      break;
    }
  }

  // Off-jack (team that captured jack of off-suit)
  for (let t = 0; t <= 1; t++) {
    if (captured[t].includes(offJackId)) {
      points[t]++;
      breakdown.offJack = { card: offJackId, team: t };
      break;
    }
  }

  // Game (team with most card-point values; ties = nobody gets the point)
  const gameVals = [0, 0];
  for (let t = 0; t <= 1; t++) {
    for (const card of captured[t]) {
      const { rank } = parseCard(card);
      gameVals[t] += CARD_POINT_VALUES[rank] || 0;
    }
  }
  breakdown.gameValues = gameVals;
  if (gameVals[0] !== gameVals[1]) {
    const gw = gameVals[0] > gameVals[1] ? 0 : 1;
    points[gw]++;
    breakdown.game = { team: gw };
  }

  return { teamPoints: points, breakdown };
}

module.exports = { dealHands, getValidCards, determineTrickWinner, scoreRound };
