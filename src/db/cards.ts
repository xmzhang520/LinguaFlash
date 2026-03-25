import { Card, createCard, createErrorCard } from "../services/sr-engine";
import { db } from "./database";

// ── Helpers ───────────────────────────────────────────────────────────────────

const rowToCard = (row: any): Card => ({
  id: row.id,
  front: row.front,
  back: row.back,
  tags: row.tags ? JSON.parse(row.tags) : [],
  easeFactor: row.ease_factor,
  interval: row.interval,
  repetitions: row.repetitions,
  nextReview: new Date(row.next_review),
  createdAt: new Date(row.created_at),
  source: row.source ?? "manual",
  pronunciation: row.pronunciation ?? null,
  context: row.context ?? null,
  // ← ADD THESE:
  cardState: row.cardState ?? "review",
  learningStep: row.learningStep ?? 0,
});

// ── Insert ────────────────────────────────────────────────────────────────────

export const insertCard = (card: Card) => {
  db.runSync(
    `INSERT INTO cards
      (id, front, back, tags, ease_factor, interval, repetitions,
       next_review, created_at, source, pronunciation, context,
       cardState, learningStep)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      card.id,
      card.front,
      card.back,
      JSON.stringify(card.tags),
      card.easeFactor,
      card.interval,
      card.repetitions,
      card.nextReview.toISOString(),
      card.createdAt.toISOString(),
      card.source ?? "manual",
      card.pronunciation ?? null,
      card.context ?? null,
      card.cardState ?? "new",
      card.learningStep ?? 0,
    ],
  );
};

// ── Update (after a review) ───────────────────────────────────────────────────

export const updateCard = (card: Card) => {
  db.runSync(
    `UPDATE cards SET
      front=?, back=?, tags=?, ease_factor=?, interval=?,
      repetitions=?, next_review=?, source=?,
      pronunciation=?, context=?, cardState=?, learningStep=?
     WHERE id=?`,
    [
      card.front,
      card.back,
      JSON.stringify(card.tags),
      card.easeFactor,
      card.interval,
      card.repetitions,
      card.nextReview.toISOString(),
      card.source ?? "manual",
      card.pronunciation ?? null,
      card.context ?? null,
      card.cardState ?? "review",
      card.learningStep ?? 0,
      card.id,
    ],
  );
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function getAllCards(): Card[] {
  const rows = db.getAllSync("SELECT * FROM cards WHERE is_suspended = 0");
  return rows.map(rowToCard);
}

export function getDueCards(): Card[] {
  const now = new Date().toISOString();
  const rows = db.getAllSync(
    "SELECT * FROM cards WHERE next_review <= ? AND is_suspended = 0 ORDER BY next_review ASC",
    [now],
  );
  return rows.map(rowToCard);
}

export function getCardById(id: string): Card | null {
  const row = db.getFirstSync("SELECT * FROM cards WHERE id = ?", [id]);
  return row ? rowToCard(row) : null;
}

export function getDueCount(): number {
  const now = new Date().toISOString();
  const row = db.getFirstSync(
    "SELECT COUNT(*) as count FROM cards WHERE next_review <= ? AND is_suspended = 0",
    [now],
  ) as any;
  return row?.count ?? 0;
}

export function getTotalCount(): number {
  const row = db.getFirstSync(
    "SELECT COUNT(*) as count FROM cards WHERE is_suspended = 0",
  ) as any;
  return row?.count ?? 0;
}

export function suspendCard(id: string): void {
  db.runSync("UPDATE cards SET is_suspended = 1 WHERE id = ?", [id]);
}

export function deleteCard(id: string): void {
  db.runSync("DELETE FROM cards WHERE id = ?", [id]);
}

// ── Quick create helpers ──────────────────────────────────────────────────────

export function addManualCard(
  front: string,
  back: string,
  tags: string[] = [],
): Card {
  const card = createCard(front, back, { tags });
  insertCard(card);
  return card;
}

export function addErrorCard(
  front: string,
  back: string,
  tags: string[] = [],
): Card {
  const card = createErrorCard(front, back, tags);
  insertCard(card);
  return card;
}
