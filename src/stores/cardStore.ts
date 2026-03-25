import { create } from 'zustand';
import { Card } from '../services/sr-engine';
import {
  getAllCards, insertCard, updateCard,
  getDueCount, getTotalCount, addManualCard, addErrorCard,
} from '../db/cards';
import { buildSession } from '../services/sr-engine';

interface CardStore {
  // State
  cards: Card[];
  dueCount: number;
  totalCount: number;
  sessionCards: Card[];
  loading: boolean;

  // Actions
  loadCards: () => void;
  addCard: (front: string, back: string, tags?: string[]) => Card;
  addError: (front: string, back: string, tags?: string[]) => Card;
  updateCardAfterReview: (card: Card) => void;
  buildReviewSession: (limit?: number) => void;
  refreshCounts: () => void;
}

export const useCardStore = create<CardStore>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  cards: [],
  dueCount: 0,
  totalCount: 0,
  sessionCards: [],
  loading: false,

  // ── Load all cards from SQLite ────────────────────────────────────────────
  loadCards: () => {
    set({ loading: true });
    const cards = getAllCards();
    const dueCount = getDueCount();
    const totalCount = getTotalCount();
    set({ cards, dueCount, totalCount, loading: false });
  },

  // ── Add a new manual card ─────────────────────────────────────────────────
  addCard: (front, back, tags = []) => {
    const card = addManualCard(front, back, tags);
    const cards = getAllCards();
    set({
      cards,
      totalCount: cards.length,
      dueCount: getDueCount(),
    });
    return card;
  },

  // ── Add an error card (from wrong exercise answer) ────────────────────────
  addError: (front, back, tags = []) => {
    const card = addErrorCard(front, back, tags);
    const cards = getAllCards();
    set({
      cards,
      totalCount: cards.length,
      dueCount: getDueCount(),
    });
    return card;
  },

  // ── Update card after a review ────────────────────────────────────────────
  updateCardAfterReview: (card) => {
    updateCard(card);
    const cards = getAllCards();
    set({
      cards,
      dueCount: getDueCount(),
      totalCount: getTotalCount(),
    });
  },

  // ── Build a review session queue ──────────────────────────────────────────
  buildReviewSession: (limit = 10) => {
    const { cards } = get();
    const sessionCards = buildSession(cards, limit);
    set({ sessionCards });
  },

  // ── Refresh just the counts (lightweight) ────────────────────────────────
  refreshCounts: () => {
    set({
      dueCount: getDueCount(),
      totalCount: getTotalCount(),
    });
  },
}));