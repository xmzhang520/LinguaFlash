import { ReviewResult } from "../services/sr-engine";
import { db } from "./database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export function insertReview(result: ReviewResult): void {
  db.runSync(
    `INSERT INTO reviews
      (id, card_id, quality, ease_factor_before, interval_before, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      result.card.id,
      result.quality,
      result.card.easeFactor,
      result.card.interval,
      result.reviewedAt.toISOString(),
    ],
  );
}

export function insertReviews(results: ReviewResult[]): void {
  // Insert all reviews from a session in one go
  for (const result of results) {
    insertReview(result);
  }
}

export function getReviewsByCard(cardId: string): any[] {
  return db.getAllSync(
    "SELECT * FROM reviews WHERE card_id = ? ORDER BY reviewed_at DESC",
    [cardId],
  );
}

export function getReviewsToday(): any[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db.getAllSync(
    "SELECT * FROM reviews WHERE reviewed_at >= ? ORDER BY reviewed_at DESC",
    [start.toISOString()],
  );
}

export function getRetentionRate(): number {
  const row = db.getFirstSync(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) as correct
    FROM reviews
    WHERE reviewed_at >= datetime('now', '-30 days')
  `) as any;

  if (!row || row.total === 0) return 0;
  return parseFloat(((row.correct / row.total) * 100).toFixed(1));
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function insertSession(
  cardsReviewed: number,
  cardsCorrect: number,
  durationSeconds: number,
): void {
  db.runSync(
    `INSERT INTO sessions
      (id, date, cards_reviewed, cards_correct, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      new Date().toISOString().split("T")[0], // YYYY-MM-DD
      cardsReviewed,
      cardsCorrect,
      durationSeconds,
      new Date().toISOString(),
    ],
  );
}

export function getSessionsLast7Days(): any[] {
  return db.getAllSync(`
    SELECT * FROM sessions
    WHERE created_at >= datetime('now', '-7 days')
    ORDER BY created_at DESC
  `);
}

export function getTotalReviewedToday(): number {
  const today = new Date().toISOString().split("T")[0];
  const row = db.getFirstSync(
    "SELECT SUM(cards_reviewed) as total FROM sessions WHERE date = ?",
    [today],
  ) as any;
  return row?.total ?? 0;
}
