const SUITS = ["h", "d", "c", "s"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_NAMES   = { h: "Hearts", d: "Diamonds", c: "Clubs", s: "Spades" };
const SUIT_COLORS  = { h: "red", d: "red", c: "black", s: "black" };

// Card-point values used for the Game point
const CARD_POINT_VALUES = { A: 4, K: 3, Q: 2, J: 1, "10": 10 };

// For non-trump tricks: 2 = lowest, A = highest
const RANK_ORDER = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push(rank + suit);
  return deck;
}

function parseCard(cardId) {
  // "10s" → { rank: "10", suit: "s" }; "Jh" → { rank: "J", suit: "h" }
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

// Return the off-suit for a given trump
// Trump hearts → off-jack is Jd (same color = red)
function getOffJackSuit(trumpSuit) {
  return { h: "d", d: "h", c: "s", s: "c" }[trumpSuit];
}

// The off-jack counts as the trump suit during play
function getEffectiveSuit(cardId, trumpSuit) {
  const { rank, suit } = parseCard(cardId);
  if (rank === "J" && suit === getOffJackSuit(trumpSuit)) return trumpSuit;
  return suit;
}

// Trump priority (higher = stronger)
// Order: A(13) > K(12) > Q(11) > on-jack(10) > off-jack(9) > 10(8) > 9(7) > ... > 2(0)
function getTrumpPriority(cardId, trumpSuit) {
  const { rank, suit } = parseCard(cardId);
  if (rank === "J" && suit === trumpSuit)                   return 10; // on-jack
  if (rank === "J" && suit === getOffJackSuit(trumpSuit))   return 9;  // off-jack
  const p = { "2":0,"3":1,"4":2,"5":3,"6":4,"7":5,"8":6,"9":7,"10":8,"Q":11,"K":12,"A":13 };
  return p[rank] ?? -1;
}

module.exports = {
  SUITS, RANKS, SUIT_SYMBOLS, SUIT_NAMES, SUIT_COLORS,
  CARD_POINT_VALUES, RANK_ORDER,
  createDeck, parseCard, getOffJackSuit, getEffectiveSuit, getTrumpPriority,
};
