"use strict";

const {
  createDeck,
  parseCard,
  getOffJackSuit,
  getEffectiveSuit,
  getTrumpPriority,
  CARD_POINT_VALUES,
} = require("../deckConstants");

// ── createDeck ────────────────────────────────────────────────────────────────

describe("createDeck", () => {
  test("returns exactly 52 cards", () => {
    expect(createDeck()).toHaveLength(52);
  });

  test("all cards are unique", () => {
    const deck = createDeck();
    expect(new Set(deck).size).toBe(52);
  });

  test("contains every rank-suit combination", () => {
    const deck = new Set(createDeck());
    const suits = ["h", "d", "c", "s"];
    const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
    for (const suit of suits)
      for (const rank of ranks)
        expect(deck.has(rank + suit)).toBe(true);
  });
});

// ── parseCard ─────────────────────────────────────────────────────────────────

describe("parseCard", () => {
  test("parses a two-character card", () => {
    expect(parseCard("As")).toEqual({ rank: "A", suit: "s" });
    expect(parseCard("Jh")).toEqual({ rank: "J", suit: "h" });
    expect(parseCard("2d")).toEqual({ rank: "2", suit: "d" });
  });

  test("parses a three-character card (tens)", () => {
    expect(parseCard("10s")).toEqual({ rank: "10", suit: "s" });
    expect(parseCard("10h")).toEqual({ rank: "10", suit: "h" });
    expect(parseCard("10c")).toEqual({ rank: "10", suit: "c" });
  });
});

// ── getOffJackSuit ────────────────────────────────────────────────────────────

describe("getOffJackSuit", () => {
  test("spades trump → off-jack suit is clubs (same color)", () => {
    expect(getOffJackSuit("s")).toBe("c");
  });

  test("clubs trump → off-jack suit is spades (same color)", () => {
    expect(getOffJackSuit("c")).toBe("s");
  });

  test("hearts trump → off-jack suit is diamonds (same color)", () => {
    expect(getOffJackSuit("h")).toBe("d");
  });

  test("diamonds trump → off-jack suit is hearts (same color)", () => {
    expect(getOffJackSuit("d")).toBe("h");
  });
});

// ── getEffectiveSuit ──────────────────────────────────────────────────────────

describe("getEffectiveSuit", () => {
  test("off-jack counts as the trump suit", () => {
    // Jc is the off-jack when spades is trump (both black suits)
    expect(getEffectiveSuit("Jc", "s")).toBe("s");
    // Js is the off-jack when clubs is trump
    expect(getEffectiveSuit("Js", "c")).toBe("c");
    // Jd is the off-jack when hearts is trump (both red suits)
    expect(getEffectiveSuit("Jd", "h")).toBe("h");
    // Jh is the off-jack when diamonds is trump
    expect(getEffectiveSuit("Jh", "d")).toBe("d");
  });

  test("on-jack (Jack of trump) counts as the trump suit", () => {
    expect(getEffectiveSuit("Js", "s")).toBe("s");
    expect(getEffectiveSuit("Jh", "h")).toBe("h");
  });

  test("wrong-color Jack is NOT the off-jack and keeps its own suit", () => {
    // Jh is red; when spades (black) is trump, Jh is just a heart
    expect(getEffectiveSuit("Jh", "s")).toBe("h");
    // Jd is red; when clubs (black) is trump, Jd is just a diamond
    expect(getEffectiveSuit("Jd", "c")).toBe("d");
  });

  test("non-jack cards keep their own suit regardless of trump", () => {
    expect(getEffectiveSuit("As", "h")).toBe("s");
    expect(getEffectiveSuit("10h", "s")).toBe("h");
    expect(getEffectiveSuit("Kd", "d")).toBe("d");
  });
});

// ── getTrumpPriority ──────────────────────────────────────────────────────────

describe("getTrumpPriority", () => {
  const trump = "s";

  test("Ace of trump has priority 13 — highest trump card", () => {
    expect(getTrumpPriority("As", trump)).toBe(13);
  });

  test("on-jack has priority 10", () => {
    expect(getTrumpPriority("Js", trump)).toBe(10);
  });

  test("off-jack has priority 9", () => {
    expect(getTrumpPriority("Jc", trump)).toBe(9);
  });

  test("Ace beats both jacks (A=13 > on-jack=10 > off-jack=9)", () => {
    const aceP    = getTrumpPriority("As", trump);
    const onJackP = getTrumpPriority("Js", trump);
    const offJackP = getTrumpPriority("Jc", trump);
    expect(aceP).toBeGreaterThan(onJackP);
    expect(onJackP).toBeGreaterThan(offJackP);
  });

  test("face card order: K=12, Q=11", () => {
    expect(getTrumpPriority("Ks", trump)).toBe(12);
    expect(getTrumpPriority("Qs", trump)).toBe(11);
  });

  test("2 of trump has priority 0 — lowest trump card", () => {
    expect(getTrumpPriority("2s", trump)).toBe(0);
  });

  test("10 of trump has priority 8 (below on-jack and off-jack)", () => {
    const tenP    = getTrumpPriority("10s", trump);
    const offJackP = getTrumpPriority("Jc", trump);
    expect(tenP).toBeLessThan(offJackP);
    expect(tenP).toBe(8);
  });

  test("full order: A > K > Q > on-jack > off-jack > 10 > 9 > ... > 2", () => {
    const order = ["As","Ks","Qs","Js","Jc","10s","9s","8s","7s","6s","5s","4s","3s","2s"];
    const priorities = order.map((c) => getTrumpPriority(c, trump));
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorities[i]).toBeGreaterThan(priorities[i + 1]);
    }
  });
});

// ── CARD_POINT_VALUES ─────────────────────────────────────────────────────────

describe("CARD_POINT_VALUES", () => {
  test("Ace = 4, King = 3, Queen = 2, Jack = 1, Ten = 10", () => {
    expect(CARD_POINT_VALUES["A"]).toBe(4);
    expect(CARD_POINT_VALUES["K"]).toBe(3);
    expect(CARD_POINT_VALUES["Q"]).toBe(2);
    expect(CARD_POINT_VALUES["J"]).toBe(1);
    expect(CARD_POINT_VALUES["10"]).toBe(10);
  });

  test("number cards 2-9 have no game-point value", () => {
    for (const rank of ["2","3","4","5","6","7","8","9"]) {
      expect(CARD_POINT_VALUES[rank]).toBeUndefined();
    }
  });

  test("off-jack is NOT in CARD_POINT_VALUES (handled separately as 0.5)", () => {
    // Off-jack game points are computed in scoreRound, not via this constant
    // The constant treats all Jacks as 1 — off-jack gets special 0.5 logic elsewhere
    expect(CARD_POINT_VALUES["J"]).toBe(1);
  });
});
