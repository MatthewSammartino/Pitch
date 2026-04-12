"use strict";

// QueueManager is a singleton — reset state before each test
const QM = require("../QueueManager");

beforeEach(() => {
  QM.queues[4] = [];
  QM.queues[6] = [];
});

// ── enqueue ───────────────────────────────────────────────────────────────────

describe("enqueue", () => {
  test("adds a player to the correct variant queue", () => {
    QM.enqueue("u1", 1000, 4, "sock1");
    expect(QM.queues[4]).toHaveLength(1);
    expect(QM.queues[6]).toHaveLength(0);
    expect(QM.queues[4][0].userId).toBe("u1");
  });

  test("deduplicates — re-adding same user replaces entry", () => {
    QM.enqueue("u1", 1000, 4, "sock1");
    QM.enqueue("u1", 1050, 4, "sock2"); // re-join with updated MMR
    expect(QM.queues[4]).toHaveLength(1);
    expect(QM.queues[4][0].mmr).toBe(1050);
    expect(QM.queues[4][0].socketId).toBe("sock2");
  });

  test("adding same user to different variant dequeues from old queue", () => {
    QM.enqueue("u1", 1000, 4, "sock1");
    QM.enqueue("u1", 1000, 6, "sock2");
    expect(QM.queues[4]).toHaveLength(0);
    expect(QM.queues[6]).toHaveLength(1);
  });

  test("defaults mmr to 1000 when falsy value provided", () => {
    QM.enqueue("u1", 0, 4, "sock1");
    expect(QM.queues[4][0].mmr).toBe(1000);
  });
});

// ── dequeue ───────────────────────────────────────────────────────────────────

describe("dequeue", () => {
  test("removes player from all queues", () => {
    QM.queues[4].push({ userId: "u1", mmr: 1000, socketId: "s", joinedAt: Date.now() });
    QM.queues[6].push({ userId: "u1", mmr: 1000, socketId: "s", joinedAt: Date.now() });
    QM.dequeue("u1");
    expect(QM.queues[4]).toHaveLength(0);
    expect(QM.queues[6]).toHaveLength(0);
  });

  test("is a no-op when player is not in any queue", () => {
    expect(() => QM.dequeue("nonexistent")).not.toThrow();
  });
});

// ── getCounts ─────────────────────────────────────────────────────────────────

describe("getCounts", () => {
  test("returns correct counts for both variants", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1050, 4, "s2");
    QM.enqueue("u3", 900,  6, "s3");
    expect(QM.getCounts()).toEqual({ 4: 2, 6: 1 });
  });

  test("returns zero counts when queues are empty", () => {
    expect(QM.getCounts()).toEqual({ 4: 0, 6: 0 });
  });
});

// ── tryMatch — insufficient players ──────────────────────────────────────────

describe("tryMatch — insufficient players", () => {
  test("returns null when fewer than variant players are queued (4-player)", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1010, 4, "s2");
    QM.enqueue("u3", 1020, 4, "s3");
    expect(QM.tryMatch(4)).toBeNull();
  });

  test("returns null when fewer than variant players are queued (6-player)", () => {
    for (let i = 0; i < 5; i++) QM.enqueue(`u${i}`, 1000, 6, `s${i}`);
    expect(QM.tryMatch(6)).toBeNull();
  });
});

// ── tryMatch — MMR spread threshold ──────────────────────────────────────────

describe("tryMatch — MMR spread", () => {
  test("returns null when 4 players queued but spread > 300", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1400, 4, "s4"); // spread = 400 > 300
    expect(QM.tryMatch(4)).toBeNull();
  });

  test("returns 4 matched entries when spread ≤ 300", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1300, 4, "s4"); // spread = 300 ≤ 300
    const result = QM.tryMatch(4);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });

  test("matched entries are removed from the queue", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1300, 4, "s4");
    QM.tryMatch(4);
    expect(QM.queues[4]).toHaveLength(0);
  });

  test("only matched players are removed when queue is larger than variant", () => {
    // 5 players; tightest window is u2-u5 (spread 200), u1 should remain
    QM.enqueue("u1",  800, 4, "s1"); // outlier
    QM.enqueue("u2", 1000, 4, "s2");
    QM.enqueue("u3", 1050, 4, "s3");
    QM.enqueue("u4", 1100, 4, "s4");
    QM.enqueue("u5", 1200, 4, "s5");
    const result = QM.tryMatch(4);
    expect(result).not.toBeNull();
    expect(QM.queues[4]).toHaveLength(1);
    expect(QM.queues[4][0].userId).toBe("u1");
  });
});

// ── tryMatch — snake-draft team assignment ────────────────────────────────────

describe("tryMatch — snake-draft team assignment (4-player)", () => {
  test("ranks [0,3] go to team A (0), ranks [1,2] go to team B (1)", () => {
    // enqueue in a known MMR order: 1000 < 1100 < 1200 < 1300
    QM.enqueue("low",  1000, 4, "s1");
    QM.enqueue("mlo",  1100, 4, "s2");
    QM.enqueue("mhi",  1200, 4, "s3");
    QM.enqueue("high", 1300, 4, "s4");

    const result = QM.tryMatch(4);
    expect(result).not.toBeNull();

    // Sort by MMR to confirm rank assignment
    const sorted = [...result].sort((a, b) => a.mmr - b.mmr);
    expect(sorted[0].team).toBe(0); // rank 0 → team A
    expect(sorted[1].team).toBe(1); // rank 1 → team B
    expect(sorted[2].team).toBe(1); // rank 2 → team B
    expect(sorted[3].team).toBe(0); // rank 3 → team A
  });

  test("each matched entry has a seatIndex assigned", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1300, 4, "s4");
    const result = QM.tryMatch(4);
    const seatIndexes = result.map((e) => e.seatIndex).sort();
    expect(seatIndexes).toEqual([0, 1, 2, 3]);
  });
});

// ── tryMatch — spread relaxes after 90 s ─────────────────────────────────────

describe("tryMatch — 90-second spread relaxation", () => {
  test("returns null at spread 400 with fresh entries (threshold=300)", () => {
    QM.enqueue("u1", 1000, 4, "s1");
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1400, 4, "s4"); // spread 400
    expect(QM.tryMatch(4)).toBeNull();
  });

  test("matches at spread 400 when any player waited > 90 s (threshold=600)", () => {
    const longAgo = Date.now() - 91_000;
    QM.queues[4].push({ userId: "u1", mmr: 1000, socketId: "s1", joinedAt: longAgo });
    QM.enqueue("u2", 1100, 4, "s2");
    QM.enqueue("u3", 1200, 4, "s3");
    QM.enqueue("u4", 1400, 4, "s4"); // spread 400, now allowed
    const result = QM.tryMatch(4);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });
});

// ── tryMatch — 6-player variant ───────────────────────────────────────────────

describe("tryMatch — 6-player variant", () => {
  test("needs exactly 6 players to match", () => {
    for (let i = 0; i < 5; i++) QM.enqueue(`u${i}`, 1000 + i * 10, 6, `s${i}`);
    expect(QM.tryMatch(6)).toBeNull();
    QM.enqueue("u5", 1050, 6, "s5");
    expect(QM.tryMatch(6)).not.toBeNull();
  });

  test("6-player snake draft: ranks [0,3,4]=team A, [1,2,5]=team B", () => {
    for (let i = 0; i < 6; i++) QM.enqueue(`u${i}`, 1000 + i * 10, 6, `s${i}`);
    const result = QM.tryMatch(6);
    expect(result).not.toBeNull();
    const sorted = [...result].sort((a, b) => a.mmr - b.mmr);
    expect(sorted[0].team).toBe(0); // rank 0 → team A
    expect(sorted[1].team).toBe(1); // rank 1 → team B
    expect(sorted[2].team).toBe(1); // rank 2 → team B
    expect(sorted[3].team).toBe(0); // rank 3 → team A
    expect(sorted[4].team).toBe(0); // rank 4 → team A
    expect(sorted[5].team).toBe(1); // rank 5 → team B
  });
});
