"use strict";

const { getValidCards, determineTrickWinner, scoreRound } = require("../GameEngine");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a trick play entry */
function play(seatIndex, card) { return { seatIndex, card }; }

/** Build a trick history entry */
function trick(plays, winnerSeat) { return { plays, winnerSeat }; }

/** Build a seats array for a 4-player game */
function seats4() {
  return [
    { seatIndex: 0, team: 0 },
    { seatIndex: 1, team: 1 },
    { seatIndex: 2, team: 0 },
    { seatIndex: 3, team: 1 },
  ];
}

// ── getValidCards ─────────────────────────────────────────────────────────────

describe("getValidCards", () => {
  const trump = "s";

  test("empty trick (leading): all cards in hand are valid", () => {
    const hand = ["As", "Kh", "Qd", "2c"];
    expect(getValidCards(hand, [], trump)).toEqual(expect.arrayContaining(hand));
    expect(getValidCards(hand, [], trump)).toHaveLength(hand.length);
  });

  test("have led suit: can play led suit cards", () => {
    const hand = ["Ah", "Kh", "2s"];          // hearts led, have hearts
    const currentTrick = [play(1, "5h")];      // hearts led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toContain("Ah");
    expect(valid).toContain("Kh");
  });

  test("have led suit: can voluntarily play trump", () => {
    const hand = ["Ah", "Kh", "2s"];          // have hearts AND trump
    const currentTrick = [play(1, "5h")];
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toContain("2s");             // may trump even holding led suit
  });

  test("have led suit: CANNOT play an unrelated third suit", () => {
    const hand = ["Ah", "Kh", "Qd", "2s"];    // have hearts, trump, and diamonds
    const currentTrick = [play(1, "5h")];      // hearts led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).not.toContain("Qd");         // off-suit not allowed
  });

  test("void in led suit: any card is playable", () => {
    const hand = ["As", "Kd", "Qc"];          // no hearts
    const currentTrick = [play(1, "5h")];      // hearts led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toHaveLength(hand.length);
    expect(valid).toContain("As");
    expect(valid).toContain("Kd");
    expect(valid).toContain("Qc");
  });

  test("led suit is trump: must follow trump", () => {
    const hand = ["As", "Kh", "Qd"];           // have trump and non-trump
    const currentTrick = [play(1, "5s")];       // trump led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toContain("As");
    expect(valid).not.toContain("Kh");
    expect(valid).not.toContain("Qd");
  });

  test("have led suit but no trump: only led-suit cards are valid", () => {
    const hand = ["Ah", "Kh", "Qd"];           // hearts, no trump
    const currentTrick = [play(1, "5h")];       // hearts led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toContain("Ah");
    expect(valid).toContain("Kh");
    expect(valid).not.toContain("Qd");
  });

  test("off-jack counts as trump when checking led suit", () => {
    // Jc is the off-jack when spades is trump — treated as trump suit
    const hand = ["Jc", "Kh"];                  // off-jack (trump) + heart
    const currentTrick = [play(1, "5h")];        // hearts led
    const valid = getValidCards(hand, currentTrick, trump);
    expect(valid).toContain("Jc");               // off-jack = trump, can always play
    expect(valid).toContain("Kh");               // following led suit
  });
});

// ── determineTrickWinner ──────────────────────────────────────────────────────

describe("determineTrickWinner", () => {
  const trump = "s";

  test("trump beats non-trump regardless of rank (2♠ beats A♥)", () => {
    const t = [play(0, "Ah"), play(1, "2s")];  // A of hearts vs 2 of trump
    expect(determineTrickWinner(t, trump)).toBe(1);
  });

  test("Ace of trump beats the on-jack", () => {
    const t = [play(0, "As"), play(1, "Js")];  // A♠ vs J♠ (on-jack)
    expect(determineTrickWinner(t, trump)).toBe(0);
  });

  test("Ace of trump beats the off-jack", () => {
    const t = [play(0, "As"), play(1, "Jc")];  // A♠ vs J♣ (off-jack)
    expect(determineTrickWinner(t, trump)).toBe(0);
  });

  test("on-jack beats off-jack", () => {
    const t = [play(0, "Js"), play(1, "Jc")];  // J♠ (on) vs J♣ (off)
    expect(determineTrickWinner(t, trump)).toBe(0);
  });

  test("King and Queen of trump beat the on-jack", () => {
    const t = [play(0, "Ks"), play(1, "Qs"), play(2, "Js")];
    expect(determineTrickWinner(t, trump)).toBe(0); // Ks wins (K=12 > Q=11 > on-jack=10)
  });

  test("highest trump wins when multiple trumps played", () => {
    const t = [play(0, "Ks"), play(1, "As"), play(2, "2s")];
    expect(determineTrickWinner(t, trump)).toBe(1); // As wins
  });

  test("led suit wins when no trump played", () => {
    const t = [play(0, "Kh"), play(1, "Ah"), play(2, "2h")];  // hearts led, no trump
    expect(determineTrickWinner(t, trump)).toBe(1); // Ah wins
  });

  test("off-suit cards cannot win (only led suit or trump)", () => {
    const t = [
      play(0, "Kh"),   // hearts led
      play(1, "Ad"),   // off-suit — cannot win
      play(2, "Qh"),   // follows hearts
    ];
    expect(determineTrickWinner(t, trump)).toBe(0); // Kh wins, Ad loses
  });

  test("first card of led suit wins if no higher led-suit or trump follows", () => {
    const t = [play(0, "Qd"), play(1, "3d"), play(2, "2d")];  // diamonds, no trump
    expect(determineTrickWinner(t, trump)).toBe(0); // Qd wins
  });

  test("K♠ and Q♠ beat the off-jack (K=12, Q=11 > off-jack=9)", () => {
    const t = [play(0, "Qs"), play(1, "Ks"), play(2, "Jc")];
    expect(determineTrickWinner(t, trump)).toBe(1); // Ks wins (K=12 > Q=11 > off-jack=9)
  });
});

// ── scoreRound ────────────────────────────────────────────────────────────────

describe("scoreRound", () => {
  const trump = "s"; // spades trump
  const s4 = seats4();

  // Helper: build a simple trick where seatIndex `winner` wins all the cards
  function simpleTrick(winner, cards) {
    const plays = cards.map((card, i) => play(i, card));
    return trick(plays, winner);
  }

  test("High point awarded to team that played the highest trump", () => {
    const history = [
      trick([play(0, "As"), play(1, "Kh"), play(2, "2h"), play(3, "3h")], 0),
    ];
    const { teamPoints, breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.high.card).toBe("As");
    expect(breakdown.high.team).toBe(0); // seat 0 → team 0
    expect(teamPoints[0]).toBeGreaterThanOrEqual(1);
  });

  test("Low point awarded to team that played the lowest trump", () => {
    const history = [
      trick([play(0, "As"), play(1, "2s"), play(2, "Kh"), play(3, "3h")], 0),
    ];
    const { teamPoints, breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.low.card).toBe("2s");
    expect(breakdown.low.team).toBe(1); // seat 1 → team 1
  });

  test("no trump played → no High or Low awarded", () => {
    const history = [
      trick([play(0, "Ah"), play(1, "Kh"), play(2, "Qh"), play(3, "Jh")], 0),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.high).toBeUndefined();
    expect(breakdown.low).toBeUndefined();
  });

  test("Jack point awarded to team that captured the trick with J♠ in it", () => {
    // Team 1 (seat 1) wins the trick containing J♠
    const history = [
      trick([play(0, "Js"), play(1, "As"), play(2, "2h"), play(3, "3h")], 1),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.jack.card).toBe("Js");
    expect(breakdown.jack.team).toBe(1); // winner is seat 1 → team 1
  });

  test("Jack point goes to the WINNER of the trick, not who played the Jack", () => {
    // Seat 0 plays Js, but seat 1 wins the trick with As
    const history = [
      trick([play(0, "Js"), play(1, "As"), play(2, "2h"), play(3, "3h")], 1),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.jack.team).toBe(1); // team of trick winner, not of Js player
  });

  test("Off-Jack point awarded to team that captured J♣ (off-jack for spades trump)", () => {
    const history = [
      trick([play(0, "Jc"), play(1, "As"), play(2, "2h"), play(3, "3h")], 1),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.offJack.card).toBe("Jc");
    expect(breakdown.offJack.team).toBe(1);
  });

  test("no Jack point when J♠ was never played", () => {
    const history = [
      trick([play(0, "As"), play(1, "Ks"), play(2, "2h"), play(3, "3h")], 0),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.jack).toBeUndefined();
  });

  test("Game point awarded to team with higher card-point total", () => {
    // Team 0 captures As (4pts) + 10h (10pts) = 14
    // Team 1 captures Kh (3pts) = 3
    const history = [
      trick([play(0, "As"), play(1, "Kh"), play(2, "2d"), play(3, "3d")], 0), // team 0 wins
      trick([play(0, "10h"), play(1, "9h"), play(2, "8h"), play(3, "7h")], 0), // team 0 wins
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.game.team).toBe(0);
  });

  test("Game tie → no Game point awarded", () => {
    // Build a scenario where both teams have equal game point values
    // Team 0: A(4), Team 1: A(4) — equal
    const history = [
      trick([play(0, "Ah"), play(1, "2d"), play(2, "3d"), play(3, "4d")], 0), // team 0 gets Ah=4
      trick([play(0, "2c"), play(1, "Ad"), play(2, "3c"), play(3, "4c")], 1), // team 1 gets Ad=4
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.game).toBeUndefined();
  });

  test("off-jack counts as 0.5 game points (not 1)", () => {
    // Team 0 captures Jc (0.5 game pts). Team 1 captures nothing scoring.
    // Total: 0.5 vs 0 → team 0 wins Game.
    const history = [
      trick([play(0, "Jc"), play(1, "2d"), play(2, "3d"), play(3, "4d")], 0),
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.gameValues[0]).toBe(0.5);
    expect(breakdown.game.team).toBe(0);
  });

  test("off-jack's 0.5 can tip a tied game-point race", () => {
    // Team 0: Ah(4) + Jc(0.5) = 4.5
    // Team 1: Kh(3) + Qh(2) = 5  → actually team 1 wins here
    // Let's use: Team 0: 10h(10) + Jc(0.5) = 10.5, Team 1: As(4)+Ks(3)+Qs(2)+Js(1) = 10
    const history = [
      trick([play(0, "10h"), play(1, "2d"), play(2, "3d"), play(3, "4d")], 0), // team 0
      trick([play(0, "Jc"),  play(1, "5d"), play(2, "6d"), play(3, "7d")], 0), // team 0: off-jack
      trick([play(0, "2c"),  play(1, "As"), play(2, "3c"), play(3, "4c")], 1), // team 1: As=4
      trick([play(0, "5c"),  play(1, "Ks"), play(2, "6c"), play(3, "7c")], 1), // team 1: Ks=3
      trick([play(0, "8c"),  play(1, "Qs"), play(2, "9c"), play(3, "8d")], 1), // team 1: Qs=2
      trick([play(0, "9d"),  play(1, "Js"), play(2, "5h"), play(3, "6h")], 1), // team 1: Js=1
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    // team 0: 10(10) + Jc(0.5) = 10.5
    // team 1: A(4)+K(3)+Q(2)+J(1) = 10
    expect(breakdown.gameValues[0]).toBe(10.5);
    expect(breakdown.gameValues[1]).toBe(10);
    expect(breakdown.game.team).toBe(0);
  });

  test("all 5 points can be won by the same team", () => {
    // Team 0 (seats 0 & 2) plays and captures everything
    const history = [
      // Trick 1: team 0 plays As (high), Jc (off-jack), team 1 plays junk; team 0 wins
      trick(
        [play(0, "As"), play(1, "2h"), play(2, "Jc"), play(3, "3h")],
        0  // seat 0 (team 0) wins
      ),
      // Trick 2: team 0 plays 2s (low), Js (jack); team 0 wins
      trick(
        [play(0, "2s"), play(1, "4h"), play(2, "Js"), play(3, "5h")],
        0
      ),
      // Trick 3: team 0 wins all remaining high-value cards
      trick(
        [play(0, "10h"), play(1, "6h"), play(2, "Ah"), play(3, "7h")],
        0
      ),
    ];
    const { teamPoints, breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.high.team).toBe(0);
    expect(breakdown.low.team).toBe(0);
    expect(breakdown.jack.team).toBe(0);
    expect(breakdown.offJack.team).toBe(0);
    expect(breakdown.game.team).toBe(0);
    expect(teamPoints[0]).toBe(5);
    expect(teamPoints[1]).toBe(0);
  });

  test("points can be split across teams", () => {
    // Team 0 plays and keeps high trump (As); team 1 plays low trump (2s)
    // Team 1 wins the trick with Js inside it → jack goes to team 1
    const history = [
      trick([play(0, "As"), play(1, "2s"), play(2, "Js"), play(3, "Kh")], 1), // seat 1 (team 1) wins
    ];
    const { breakdown } = scoreRound(history, trump, s4);
    expect(breakdown.high.team).toBe(0); // As played by seat 0 → team 0
    expect(breakdown.low.team).toBe(1);  // 2s played by seat 1 → team 1
    expect(breakdown.jack.team).toBe(1); // Js captured by trick winner (seat 1) → team 1
  });
});

// ── determineTrickWinner: clarification test ──────────────────────────────────

describe("determineTrickWinner — off-jack vs other trump", () => {
  const trump = "s";

  test("K♠ and Q♠ beat the off-jack (K=12, Q=11 > off-jack=9)", () => {
    const t1 = [play(0, "Ks"), play(1, "Jc")]; // K♠ vs J♣ (off-jack)
    expect(determineTrickWinner(t1, trump)).toBe(0); // Ks wins

    const t2 = [play(0, "Qs"), play(1, "Jc")]; // Q♠ vs J♣ (off-jack)
    expect(determineTrickWinner(t2, trump)).toBe(0); // Qs wins
  });
});
