/**
 * SM-2 Spaced Repetition Engine
 * Based on the SuperMemo SM-2 algorithm
 *
 * Quality ratings (0–5):
 *   5 — Perfect recall
 *   4 — Correct with slight hesitation
 *   3 — Correct with difficulty
 *   2 — Incorrect, but correct answer felt obvious
 *   1 — Incorrect, correct answer was hard
 *   0 — Complete blackout
 */

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  createdAt: Date;
  source?: string;
  pronunciation?: string | null;
  context?: string | null;
  cardState: "new" | "learning" | "review";
  learningStep: number;
}

export interface ReviewResult {
  card: Card;
  quality: Quality;
  reviewedAt: Date;
}

export interface ReviewStats {
  cardsReviewed: number;
  averageQuality: number;
  retentionRate: number;
}

// ── Core SM-2 Algorithm ───────────────────────────────────────────────────────

export function calculateNextReview(card: Card, quality: Quality): Card {
  const now = new Date();
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const nextReview = addDays(now, interval);

  return { ...card, easeFactor, interval, repetitions, nextReview };
}

// ── Card Factories ────────────────────────────────────────────────────────────

export function createCard(
  front: string,
  back: string,
  options: Partial<Pick<Card, "source" | "tags" | "id">> = {},
): Card {
  return {
    id: options.id ?? generateId(),
    front,
    back,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date(),
    source: options.source ?? "manual",
    tags: options.tags ?? [],
    createdAt: new Date(),
    cardState: "new",
    learningStep: 0,
  };
}

export function createErrorCard(
  front: string,
  back: string,
  tags: string[] = [],
): Card {
  return createCard(front, back, { source: "error", tags });
}

// ── Queue & Scheduling ────────────────────────────────────────────────────────

export function getDueCards(cards: Card[]): Card[] {
  const now = new Date();
  return cards
    .filter((card) => card.cardState === "review" && card.nextReview <= now)
    .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
}

export function getNewCards(cards: Card[], limit = 10): Card[] {
  return cards.filter((card) => card.cardState === "new").slice(0, limit);
}

export function buildSession(cards: Card[], newCardLimit = 10): Card[] {
  const due = getDueCards(cards);
  const fresh = getNewCards(cards, newCardLimit);
  const dueIds = new Set(due.map((c) => c.id));
  const uniqueFresh = fresh.filter((c) => !dueIds.has(c.id));
  return [...due, ...uniqueFresh];
}

// ── Statistics ────────────────────────────────────────────────────────────────

export function computeSessionStats(results: ReviewResult[]): ReviewStats {
  if (results.length === 0) {
    return { cardsReviewed: 0, averageQuality: 0, retentionRate: 0 };
  }
  const totalQuality = results.reduce((sum, r) => sum + r.quality, 0);
  const correct = results.filter((r) => r.quality >= 3).length;
  return {
    cardsReviewed: results.length,
    averageQuality: parseFloat((totalQuality / results.length).toFixed(2)),
    retentionRate: parseFloat(((correct / results.length) * 100).toFixed(1)),
  };
}

export function getCardMaturity(
  card: Card,
): "new" | "learning" | "young" | "mature" {
  if (card.cardState === "new") return "new";
  if (card.cardState === "learning") return "learning";
  if (card.interval < 21) return "young";
  return "mature";
}

export function forecastDue(
  cards: Card[],
  days = 7,
): { date: string; count: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const target = addDays(new Date(), i);
    target.setHours(23, 59, 59, 999);
    const start = addDays(new Date(), i);
    start.setHours(0, 0, 0, 0);
    const count = cards.filter(
      (c) => c.nextReview >= start && c.nextReview <= target,
    ).length;
    return { date: start.toISOString().split("T")[0], count };
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Graduated learning steps (in minutes) ────────────────────────────────────
export const LEARNING_STEPS_MINUTES = [10, 24 * 60, 3 * 24 * 60, 7 * 24 * 60];
// 10min → 1day → 3days → 7days → enters SM-2

export const calculateLearningStep = (card: Card, quality: Quality): Card => {
  const now = new Date();

  if (quality < 3) {
    const next = new Date(
      now.getTime() + LEARNING_STEPS_MINUTES[0] * 60 * 1000,
    );
    return {
      ...card,
      cardState: "learning",
      learningStep: 0,
      nextReview: next,
      repetitions: 0,
      interval: 0,
    };
  }

  const nextStep = card.learningStep + 1;

  if (nextStep >= LEARNING_STEPS_MINUTES.length) {
    return {
      ...card,
      cardState: "review",
      learningStep: 0,
      repetitions: 1,
      interval: 7,
      nextReview: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  const nextMinutes = LEARNING_STEPS_MINUTES[nextStep];
  const next = new Date(now.getTime() + nextMinutes * 60 * 1000);
  return {
    ...card,
    cardState: "learning",
    learningStep: nextStep,
    nextReview: next,
  };
};

// ── Interleaved session builder ───────────────────────────────────────────────
export const buildInterleavedSession = (
  allCards: Card[],
  newCardLimit: number,
): Card[] => {
  const now = new Date();

  const dueReviews = allCards.filter(
    (c) => c.cardState === "review" && c.nextReview <= now,
  );
  const dueLearning = allCards.filter(
    (c) => c.cardState === "learning" && c.nextReview <= now,
  );
  const newCards = allCards
    .filter((c) => c.cardState === "new")
    .slice(0, newCardLimit);

  const session: Card[] = [];
  let reviewIdx = 0;
  let newIdx = 0;

  // Learning cards first — most time-sensitive
  session.push(...dueLearning);

  // Interleave reviews and new cards — every 3rd slot is a new card
  const totalSlots = dueReviews.length + newCards.length;
  for (let i = 0; i < totalSlots; i++) {
    if ((i + 1) % 3 === 0 && newIdx < newCards.length) {
      session.push(newCards[newIdx++]);
    } else if (reviewIdx < dueReviews.length) {
      session.push(dueReviews[reviewIdx++]);
    } else if (newIdx < newCards.length) {
      session.push(newCards[newIdx++]);
    }
  }

  return session;
};

// ── Get counts for home screen ────────────────────────────────────────────────
export const getSessionCounts = (allCards: Card[], newCardLimit: number) => {
  const now = new Date();
  const dueReviews = allCards.filter(
    (c) => c.cardState === "review" && c.nextReview <= now,
  ).length;
  const dueLearning = allCards.filter(
    (c) => c.cardState === "learning" && c.nextReview <= now,
  ).length;
  const newCards = Math.min(
    allCards.filter((c) => c.cardState === "new").length,
    newCardLimit,
  );
  return {
    dueReviews,
    dueLearning,
    newCards,
    total: dueReviews + dueLearning + newCards,
  };
};
