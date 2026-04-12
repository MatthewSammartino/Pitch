/**
 * QueueManager — in-memory matchmaking queue per game variant.
 *
 * Each entry: { userId, mmr, socketId, joinedAt }
 *
 * Matching:
 *   - Sort by MMR ascending
 *   - Find the variant-sized window with the smallest MMR spread
 *   - Spread threshold: 300 pts base; relaxes to 600 if any entry waited > 90s
 *   - Snake-draft teams for balance:
 *       4p: sorted ranks [0,1,2,3] → team A = [0,3], team B = [1,2]
 *       6p: sorted ranks [0,1,2,3,4,5] → team A = [0,3,4], team B = [1,2,5]
 */

const SPREAD_BASE    = 300;
const SPREAD_RELAXED = 600;
const RELAX_AFTER_MS = 90_000;

// Snake-draft seat assignments per variant
// Each entry is [seatIndex, team] for sorted MMR positions [0..n-1]
const TEAM_DRAFT = {
  4: [
    [0, 0], // rank 0 → seat 0, team A
    [1, 1], // rank 1 → seat 1, team B
    [2, 1], // rank 2 → seat 2, team B
    [3, 0], // rank 3 → seat 3, team A
  ],
  6: [
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 0],
    [4, 0],
    [5, 1],
  ],
};

class QueueManager {
  constructor() {
    // Map<variant, entry[]>
    this.queues = { 4: [], 6: [] };
  }

  /** Add or update a player in the queue for a variant. */
  enqueue(userId, mmr, variant, socketId) {
    if (!this.queues[variant]) return;
    // Remove any existing entry for this user (re-joining)
    this.dequeue(userId);
    this.queues[variant].push({ userId, mmr: mmr || 1000, socketId, joinedAt: Date.now() });
  }

  /** Remove a player from all queues. */
  dequeue(userId) {
    for (const variant of [4, 6]) {
      this.queues[variant] = this.queues[variant].filter((e) => e.userId !== userId);
    }
  }

  /** Returns { 4: count, 6: count } */
  getCounts() {
    return { 4: this.queues[4].length, 6: this.queues[6].length };
  }

  /**
   * Attempt to form a match for the given variant.
   * Returns the matched entries (with seatIndex and team assigned) or null.
   */
  tryMatch(variant) {
    const q = this.queues[variant];
    if (q.length < variant) return null;

    // Sort by MMR ascending
    const sorted = [...q].sort((a, b) => a.mmr - b.mmr);

    // Determine spread threshold — relax if anyone has been waiting long enough
    const now = Date.now();
    const anyRelaxed = sorted.some((e) => now - e.joinedAt >= RELAX_AFTER_MS);
    const threshold = anyRelaxed ? SPREAD_RELAXED : SPREAD_BASE;

    // Sliding window of size `variant` — find tightest spread
    let bestWindow = null;
    let bestSpread = Infinity;

    for (let i = 0; i <= sorted.length - variant; i++) {
      const window = sorted.slice(i, i + variant);
      const spread = window[variant - 1].mmr - window[0].mmr;
      if (spread < bestSpread) {
        bestSpread = spread;
        bestWindow = window;
      }
    }

    if (bestSpread > threshold) return null;

    // Assign seats + teams via snake draft
    const draft = TEAM_DRAFT[variant];
    const matched = bestWindow.map((entry, rank) => ({
      ...entry,
      seatIndex: draft[rank][0],
      team:      draft[rank][1],
    }));

    // Remove matched players from the queue
    const matchedIds = new Set(matched.map((e) => e.userId));
    this.queues[variant] = this.queues[variant].filter((e) => !matchedIds.has(e.userId));

    return matched;
  }
}

module.exports = new QueueManager();
