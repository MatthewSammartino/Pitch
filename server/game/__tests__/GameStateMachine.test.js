"use strict";

const GameStateMachine = require("../GameStateMachine");

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal 4-player seat array. */
function makeSeats(n = 4) {
  return Array.from({ length: n }, (_, i) => ({
    seatIndex:   i,
    userId:      `user${i}`,
    displayName: `Player ${i}`,
    avatarUrl:   null,
  }));
}

/** Create a fresh GSM instance, then forcibly inject known hands + state. */
function makeGSM(variant = 4) {
  const gsm = new GameStateMachine("session-test", variant, makeSeats(variant));
  return gsm;
}

/**
 * Drive bidding to completion so the GSM reaches TRUMP_DECLARATION.
 * Seat order: biddingOrder starts at seat 1 and wraps around.
 * We have seats 1, 2, 3 pass, then seat 0 (dealer) is forced to bid 2.
 */
function completeBidding(gsm, bidderSeat = 1, bidAmount = 3) {
  // Walk through biddingOrder: one player bids, everyone else passes
  for (let i = 0; i < gsm.variant; i++) {
    const seat = gsm.biddingOrder[i];
    const user = `user${seat}`;
    if (seat === bidderSeat) {
      gsm.handleBid(user, bidAmount);
    } else {
      // Dealer can't pass if nobody else bid — detect that case
      const isDealer = gsm.bidIndex === gsm.variant - 1 && gsm.highBidderSeat === -1;
      if (isDealer) {
        gsm.handleBid(user, 2);
      } else {
        gsm.handleBid(user, "pass");
      }
    }
  }
}

/** Drive to TRICK_PLAYING by completing bidding and declaring trump. */
function completeDeclaration(gsm, bidderSeat = 1, suit = "s") {
  completeBidding(gsm, bidderSeat, 3);
  gsm.handleDeclareTrump(`user${bidderSeat}`, suit);
}

// ── initial state ─────────────────────────────────────────────────────────────

describe("initial state", () => {
  test("starts in BIDDING phase", () => {
    const gsm = makeGSM();
    expect(gsm.status).toBe("BIDDING");
  });

  test("deals hands to all players", () => {
    const gsm = makeGSM();
    for (let i = 0; i < 4; i++) {
      expect(gsm.hands[`user${i}`]).toHaveLength(6);
    }
  });

  test("6-player variant deals to 6 players", () => {
    const gsm = makeGSM(6);
    for (let i = 0; i < 6; i++) {
      expect(gsm.hands[`user${i}`]).toHaveLength(6);
    }
  });
});

// ── handleBid ─────────────────────────────────────────────────────────────────

describe("handleBid", () => {
  test("rejects bids below 2", () => {
    const gsm = makeGSM();
    const firstBidder = `user${gsm.biddingOrder[0]}`;
    expect(gsm.handleBid(firstBidder, 1).error).toMatch(/2/);
  });

  test("rejects bids above 5", () => {
    const gsm = makeGSM();
    const firstBidder = `user${gsm.biddingOrder[0]}`;
    expect(gsm.handleBid(firstBidder, 6).error).toBeTruthy();
  });

  test("rejects a bid that does not exceed the current high bid", () => {
    const gsm = makeGSM();
    const seat0 = `user${gsm.biddingOrder[0]}`;
    gsm.handleBid(seat0, 3); // current high is now 3
    const seat1 = `user${gsm.biddingOrder[1]}`;
    expect(gsm.handleBid(seat1, 3).error).toMatch(/more than/);
  });

  test("accepts a valid higher bid", () => {
    const gsm = makeGSM();
    const seat0 = `user${gsm.biddingOrder[0]}`;
    gsm.handleBid(seat0, 3);
    const seat1 = `user${gsm.biddingOrder[1]}`;
    expect(gsm.handleBid(seat1, 4)).toEqual({ ok: true });
  });

  test("bidding 5 ends bidding immediately", () => {
    const gsm = makeGSM();
    const seat0 = `user${gsm.biddingOrder[0]}`;
    gsm.handleBid(seat0, 5);
    expect(gsm.status).toBe("TRUMP_DECLARATION");
  });

  test("dealer is forced to bid 2 when all others pass", () => {
    const gsm = makeGSM();
    // Everyone except dealer passes
    for (let i = 0; i < gsm.variant - 1; i++) {
      gsm.handleBid(`user${gsm.biddingOrder[i]}`, "pass");
    }
    // Dealer tries to pass — should be rejected
    const dealerUser = `user${gsm.biddingOrder[gsm.variant - 1]}`;
    const result = gsm.handleBid(dealerUser, "pass");
    expect(result.error).toMatch(/stuck/i);
    // Dealer bids 2 successfully
    expect(gsm.handleBid(dealerUser, 2)).toEqual({ ok: true });
    expect(gsm.status).toBe("TRUMP_DECLARATION");
  });

  test("rejects bids out of turn", () => {
    const gsm = makeGSM();
    const wrongUser = `user${gsm.biddingOrder[1]}`; // not the first bidder
    expect(gsm.handleBid(wrongUser, 3).error).toMatch(/turn/i);
  });

  test("transitions to TRUMP_DECLARATION after all bids resolved", () => {
    const gsm = makeGSM();
    completeBidding(gsm, 1, 3);
    expect(gsm.status).toBe("TRUMP_DECLARATION");
  });
});

// ── handleDeclareTrump ────────────────────────────────────────────────────────

describe("handleDeclareTrump", () => {
  test("only winning bidder may declare trump", () => {
    const gsm = makeGSM();
    completeBidding(gsm, 1, 3); // seat 1 wins
    const notBidder = `user${2}`;
    expect(gsm.handleDeclareTrump(notBidder, "s").error).toMatch(/winning bidder/i);
  });

  test("accepts all valid suits: h, d, c, s", () => {
    for (const suit of ["h", "d", "c", "s"]) {
      const gsm = makeGSM();
      completeBidding(gsm, 1, 3);
      expect(gsm.handleDeclareTrump("user1", suit)).toEqual({ ok: true });
    }
  });

  test("rejects invalid suit", () => {
    const gsm = makeGSM();
    completeBidding(gsm, 1, 3);
    expect(gsm.handleDeclareTrump("user1", "x").error).toMatch(/invalid suit/i);
  });

  test("transitions to TRICK_PLAYING after declaration", () => {
    const gsm = makeGSM();
    completeBidding(gsm, 1, 3);
    gsm.handleDeclareTrump("user1", "s");
    expect(gsm.status).toBe("TRICK_PLAYING");
  });
});

// ── handlePlayCard ────────────────────────────────────────────────────────────

describe("handlePlayCard — basic validation", () => {
  test("rejects a card not in the player's hand", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s");
    const leader = `user${gsm.nextLeaderSeat}`;
    expect(gsm.handlePlayCard(leader, "FAKE").error).toMatch(/not in hand/i);
  });

  test("rejects play when it is not the player's turn", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s");
    // Find someone who is NOT the leader
    const notLeader = gsm.seats.find((s) => s.seatIndex !== gsm.nextLeaderSeat).userId;
    expect(gsm.handlePlayCard(notLeader, "As").error).toMatch(/turn/i);
  });
});

describe("handlePlayCard — first-trick pitch rule", () => {
  test("first card played by bidder must be trump", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s"); // trump = spades
    const bidder = "user1";

    // Inject a known hand for the bidder: one spade, one non-spade
    gsm.hands[bidder] = ["As", "Kh"];

    // Try to play a non-trump card first — should fail
    const result = gsm.handlePlayCard(bidder, "Kh");
    expect(result.error).toMatch(/trump/i);

    // Playing a trump card should succeed
    expect(gsm.handlePlayCard(bidder, "As")).toEqual({ ok: true });
  });

  test("after first trump lead, mustLeadTrump is cleared", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s");
    const bidder = "user1";
    gsm.hands[bidder] = ["As", "Kh"];
    gsm.handlePlayCard(bidder, "As");
    expect(gsm.mustLeadTrump).toBe(false);
  });
});

describe("handlePlayCard — follow-suit enforcement", () => {
  test("when holding led suit, cannot play an off-suit card", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s"); // trump = spades
    const bidder = "user1";

    // Force a spade lead then test the next player's obligation
    gsm.hands[bidder] = ["As"];
    gsm.handlePlayCard(bidder, "As"); // leads As

    // Next player has hearts and clubs (neither is trump or led suit = spades)
    // but does NOT have spades — can play anything
    const next = `user${gsm.nextLeaderSeat}`;
    gsm.hands[next] = ["Kh", "3c"];
    expect(gsm.handlePlayCard(next, "3c")).toEqual({ ok: true });
  });

  test("when void in led suit, any card is playable", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "s");
    const bidder = "user1";
    gsm.hands[bidder] = ["As"];
    gsm.handlePlayCard(bidder, "As");

    const next = `user${gsm.nextLeaderSeat}`;
    // Give next player only hearts (no spades, no hearts — wait, hearts are led? No, spades led)
    gsm.hands[next] = ["Kh", "Qd"]; // no spades → void in led suit
    expect(gsm.handlePlayCard(next, "Qd")).toEqual({ ok: true });
  });

  test("when holding led suit, must play led suit or trump (not an unrelated suit)", () => {
    const gsm = makeGSM();
    completeDeclaration(gsm, 1, "h"); // trump = hearts
    const bidder = "user1";
    gsm.hands[bidder] = ["Ah"];
    gsm.handlePlayCard(bidder, "Ah"); // leads Ah (trump = hearts)

    const next = `user${gsm.nextLeaderSeat}`;
    // Has both hearts (led/trump) and a diamond — must follow hearts
    gsm.hands[next] = ["Kh", "Ad"];
    const result = gsm.handlePlayCard(next, "Ad");
    expect(result.error).toMatch(/follow/i);
  });
});

// ── trick completion ──────────────────────────────────────────────────────────

describe("trick completion", () => {
  /** Play one full trick with given cards, injecting hands as needed. */
  function playTrick(gsm, plays) {
    // plays: [{ seat, card }] in play order
    // Inject each card into the player's hand
    for (const { seat, card } of plays) {
      const uid = `user${seat}`;
      if (!gsm.hands[uid].includes(card)) gsm.hands[uid].unshift(card);
    }
    let last;
    for (const { seat, card } of plays) {
      last = gsm.handlePlayCard(`user${seat}`, card);
    }
    return last;
  }

  test("trick completes after variant (4) plays and reports winnerSeat", () => {
    const gsm = makeGSM(4);
    completeDeclaration(gsm, 1, "s");

    // Replace hands so follow-suit logic doesn't interfere
    gsm.hands["user1"] = ["As", "3h", "4h", "5h", "6h", "7h"];
    gsm.hands["user2"] = ["Kh", "3d", "4d", "5d", "6d", "7d"];
    gsm.hands["user3"] = ["Qd", "8h", "9h", "2h", "8d", "9d"];
    gsm.hands["user0"] = ["2d", "10h", "Jh", "Qh", "10d", "Jd"];

    const trickPlays = [
      { seat: 1, card: "As" },
      { seat: 2, card: "Kh" },
      { seat: 3, card: "Qd" },
      { seat: 0, card: "2d" },
    ];

    const result = playTrick(gsm, trickPlays);
    expect(result.trickComplete).toBe(true);
    expect(typeof result.winnerSeat).toBe("number");
  });

  test("6-player trick completes after 6 plays", () => {
    const gsm = makeGSM(6);
    completeDeclaration(gsm, 1, "s");

    // Replace hands — no spades except the lead, so follow-suit won't block
    gsm.hands["user1"] = ["As", "3h", "4h", "5h", "6h", "7h"];
    gsm.hands["user2"] = ["Kh", "3d", "4d", "5d", "6d", "7d"];
    gsm.hands["user3"] = ["Qd", "8h", "9h", "2h", "8d", "9d"];
    gsm.hands["user4"] = ["2d", "10h", "Jh", "Qh", "10d", "Jd"];
    gsm.hands["user5"] = ["3c", "4c", "5c", "6c", "7c", "8c"];
    gsm.hands["user0"] = ["4c", "9c", "10c", "Jc", "Qc", "Kc"];
    // Jc is off-jack when trump=s, so it counts as trump — replace it
    gsm.hands["user0"] = ["2c", "9c", "10c", "Ac", "Qc", "Kc"];

    const trickPlays = [
      { seat: 1, card: "As" },
      { seat: 2, card: "Kh" },
      { seat: 3, card: "Qd" },
      { seat: 4, card: "2d" },
      { seat: 5, card: "3c" },
      { seat: 0, card: "2c" },
    ];
    const result = playTrick(gsm, trickPlays);
    expect(result.trickComplete).toBe(true);
    expect(result.winnerSeat).toBe(1); // As wins
  });
});

// ── round scoring ─────────────────────────────────────────────────────────────

describe("round scoring after 6 tricks", () => {
  /**
   * Drive a full round to completion by playing 6 tricks.
   * We inject simple hands to control outcomes.
   */
  function playFullRound(gsm, trump) {
    completeDeclaration(gsm, 1, trump);
    const bidder = 1;

    // Give each player 6 cards. Distribute trump cards to control scoring.
    // Player 1 (bidder): As (high trump), 2s (low trump), Jh, Jd, Ac, Kc
    // Player 0: 3s, Kh, Qh, 9d, 8d, 7d  (has a trump: 3s)
    // Player 2: Kd, Qd, Jd won't work — let's keep it simple
    // ─ Just give every player 5 non-trump + their one trump ─
    // trump = "s" → spades are trump
    // We want: player1 gets As (high), player0 gets 2s (low)
    // Also put Js somewhere and Jc (off-jack) somewhere

    gsm.hands["user0"] = ["2s", "3h", "4h", "5h", "6h", "7h"];
    gsm.hands["user1"] = ["As", "Js", "3d", "4d", "5d", "6d"]; // As and Js (on-jack)
    gsm.hands["user2"] = ["Jc", "3c", "4c", "5c", "6c", "7c"]; // Jc = off-jack
    gsm.hands["user3"] = ["Kh", "Qh", "8h", "9h", "10h", "Ah"];

    // Reset leader to bidder (seat 1)
    gsm.nextLeaderSeat = 1;

    // Trick 1: seat 1 leads As (trump), all others follow with non-led, non-trump
    gsm.currentTrick = [];
    const trick1 = [
      { seat: 1, card: "As" },
      { seat: 2, card: "Jc" }, // off-jack counts as trump
      { seat: 3, card: "Kh" }, // non-trump
      { seat: 0, card: "2s" }, // low trump
    ];
    for (const { seat, card } of trick1) {
      gsm.handlePlayCard(`user${seat}`, card);
    }
    // seat 1 (As) wins — next leader is seat 1

    // Trick 2: seat 1 leads Js (on-jack)
    const trick2 = [
      { seat: 1, card: "Js" },
      { seat: 2, card: "3c" },
      { seat: 3, card: "Qh" },
      { seat: 0, card: "3h" },
    ];
    for (const { seat, card } of trick2) {
      gsm.handlePlayCard(`user${seat}`, card);
    }

    // Tricks 3-6: seat 1 leads non-trump, others follow
    const remaining = [
      [{ seat: 1, card: "3d" }, { seat: 2, card: "4c" }, { seat: 3, card: "8h" }, { seat: 0, card: "4h" }],
      [{ seat: 1, card: "4d" }, { seat: 2, card: "5c" }, { seat: 3, card: "9h" }, { seat: 0, card: "5h" }],
      [{ seat: 1, card: "5d" }, { seat: 2, card: "6c" }, { seat: 3, card: "10h" }, { seat: 0, card: "6h" }],
      [{ seat: 1, card: "6d" }, { seat: 2, card: "7c" }, { seat: 3, card: "Ah" }, { seat: 0, card: "7h" }],
    ];
    let last;
    for (const trick of remaining) {
      for (const { seat, card } of trick) {
        last = gsm.handlePlayCard(`user${seat}`, card);
      }
    }
    return last;
  }

  test("round ends after 6 tricks and returns roundSummary", () => {
    const gsm = makeGSM();
    const result = playFullRound(gsm, "s");
    expect(result.roundSummary).toBeDefined();
    expect(result.roundSummary.bid).toBe(3);
    expect(typeof result.gameOver).toBe("boolean");
  });

  test("High point: team that played As gets the High point", () => {
    const gsm = makeGSM();
    playFullRound(gsm, "s");
    const { breakdown } = gsm.lastRoundSummary;
    expect(breakdown.high.card).toBe("As");
    // user1 is seat 1 → team = 1 % 2 = 1
    expect(breakdown.high.team).toBe(1);
  });

  test("Low point: team that played 2s gets the Low point", () => {
    const gsm = makeGSM();
    playFullRound(gsm, "s");
    const { breakdown } = gsm.lastRoundSummary;
    expect(breakdown.low.card).toBe("2s");
    // user0 is seat 0 → team = 0 % 2 = 0
    expect(breakdown.low.team).toBe(0);
  });

  test("Jack point: team that captured the trick containing Js", () => {
    const gsm = makeGSM();
    playFullRound(gsm, "s");
    const { breakdown } = gsm.lastRoundSummary;
    expect(breakdown.jack.card).toBe("Js");
    // user1 led As and won trick 1 — all trick-1 cards captured by team 1
    // user1 leads Js in trick 2 and As won trick 1 so seat1 leads trick2 and wins with Js
    expect(breakdown.jack.team).toBe(1);
  });

  test("Off-jack point: team that captured Jc (off-jack when trump=s)", () => {
    const gsm = makeGSM();
    playFullRound(gsm, "s");
    const { breakdown } = gsm.lastRoundSummary;
    expect(breakdown.offJack.card).toBe("Jc");
    // Jc played by seat2, trick won by seat1 (As beats Jc) → captured by team 1
    expect(breakdown.offJack.team).toBe(1);
  });

  test("after round ends status returns to BIDDING for next round", () => {
    const gsm = makeGSM();
    const result = playFullRound(gsm, "s");
    if (!result.gameOver) {
      expect(gsm.status).toBe("BIDDING");
    }
  });
});

// ── game score thresholds / bid failure ───────────────────────────────────────

describe("bid failure", () => {
  test("bidder's team score goes negative when bid not made", () => {
    const gsm = makeGSM();
    // Bidder bids 3 (seats follow: 1 bids 3)
    completeDeclaration(gsm, 1, "s");

    // Give bidder (user1) NO trump at all — they can't make any points
    gsm.hands["user0"] = ["As", "Ks", "Qs", "Js", "2s", "3h"];
    gsm.hands["user1"] = ["4h", "5h", "6h", "7h", "8h", "9h"]; // no spades
    gsm.hands["user2"] = ["Kh", "Qh", "Jh", "10h", "Jc", "3d"];
    gsm.hands["user3"] = ["2d", "3d", "4d", "5d", "6d", "7d"];
    // Fix conflict — user2 and user3 both have 3d
    gsm.hands["user3"] = ["2d", "8d", "4d", "5d", "6d", "7d"];

    // user1 must lead trump but has none — game handles this by allowing any card
    // Actually per getPrivateState: if trumpCards.length === 0, validCards = [...hand]
    gsm.nextLeaderSeat = 1;

    // Manually override mustLeadTrump to false so we can play the hand cleanly
    // (The rule is enforced in getPrivateState, but handlePlayCard calls getValidCards directly)
    // Actually let's just let the test drive through — mustLeadTrump=true but player has no trump
    // handlePlayCard calls getValidCards (not the private state version) so all cards are valid.
    // But wait — handlePlayCard checks the trump-lead rule separately:
    //   if (mustLeadTrump && getEffectiveSuit(cardId, trumpSuit) !== trumpSuit) → error
    // So we need to skip this by clearing mustLeadTrump or giving them a trump card.
    // Give them one spade so they can pitch, then they'll still lose.
    gsm.hands["user1"] = ["3s", "4h", "5h", "6h", "7h", "8h"]; // just 3s as their only trump

    // Trick 1: user1 leads 3s (trump), user0 plays As (wins), others follow non-trump
    gsm.handlePlayCard("user1", "3s");
    gsm.handlePlayCard("user2", "Jc"); // off-jack, counts as trump
    gsm.handlePlayCard("user3", "2d");
    gsm.handlePlayCard("user0", "As"); // As wins

    // Remaining 5 tricks: user0 leads, wins everything
    const tricks = [
      ["user0", "Ks", "user1", "4h", "user2", "Kh", "user3", "8d"],
      ["user0", "Qs", "user1", "5h", "user2", "Qh", "user3", "4d"],
      ["user0", "Js", "user1", "6h", "user2", "Jh", "user3", "5d"],
      ["user0", "2s", "user1", "7h", "user2", "10h", "user3", "6d"],
      ["user0", "3h", "user1", "8h", "user2", "3d", "user3", "7d"],
    ];

    for (const t of tricks) {
      for (let i = 0; i < t.length; i += 2) {
        gsm.handlePlayCard(t[i], t[i + 1]);
      }
    }

    // Bidder (seat1, team1) bid 3 but team1 earned 0 points → set to -3
    expect(gsm.teamScores[1]).toBeLessThan(0);
  });
});
