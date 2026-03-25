import { create } from 'zustand';
import { ReviewResult, computeSessionStats, ReviewStats } from '../services/sr-engine';
import { insertReviews, insertSession } from '../db/reviews';
import { useCardStore } from './cardStore';

interface SessionStore {
  // State
  isActive: boolean;
  startTime: number | null;
  results: ReviewResult[];
  stats: ReviewStats | null;
  isComplete: boolean;

  // Actions
  startSession: () => void;
  addResult: (result: ReviewResult) => void;
  completeSession: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  isActive: false,
  startTime: null,
  results: [],
  stats: null,
  isComplete: false,

  // ── Start a new session ───────────────────────────────────────────────────
  startSession: () => {
    set({
      isActive: true,
      startTime: Date.now(),
      results: [],
      stats: null,
      isComplete: false,
    });
  },

  // ── Add a single review result ────────────────────────────────────────────
  addResult: (result) => {
    const { results } = get();
    const newResults = [...results, result];

    // Update card in SQLite + global store
    useCardStore.getState().updateCardAfterReview(result.card);

    set({ results: newResults });
  },

  // ── Complete the session — save everything to SQLite ─────────────────────
  completeSession: () => {
    const { results, startTime } = get();
    if (results.length === 0) return;

    const stats = computeSessionStats(results);
    const duration = startTime
      ? Math.round((Date.now() - startTime) / 1000)
      : 0;

    // Save reviews and session to SQLite
    insertReviews(results);
    insertSession(
      stats.cardsReviewed,
      Math.round((stats.retentionRate / 100) * stats.cardsReviewed),
      duration
    );

    // Refresh card counts on home screen
    useCardStore.getState().refreshCounts();

    set({ stats, isComplete: true, isActive: false });
  },

  // ── Reset for next session ────────────────────────────────────────────────
  resetSession: () => {
    set({
      isActive: false,
      startTime: null,
      results: [],
      stats: null,
      isComplete: false,
    });
  },
}));