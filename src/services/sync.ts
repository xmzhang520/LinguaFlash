import { db } from "../db/database";
import { supabase } from "./supabase";

// ── Sync cards to Supabase ────────────────────────────────────────────────────
console.log("sync.ts loaded");
export async function syncCards(userId: string): Promise<void> {
  try {
    // Get all unsynced cards from SQLite
    const unsyncedCards = db.getAllSync(
      "SELECT * FROM cards WHERE synced = 0",
    ) as any[];

    if (unsyncedCards.length === 0) return;

    // Format for Supabase
    const rows = unsyncedCards.map((card) => ({
      id: card.id,
      user_id: userId,
      front: card.front,
      back: card.back,
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      next_review: card.next_review,
      last_review: card.last_review,
      source: card.source,
      tags: JSON.parse(card.tags || "[]"),
      deck_id: card.deck_id,
      context: card.context,
      hint: card.hint,
      is_suspended: card.is_suspended === 1,
      created_at: card.created_at,
    }));

    // Upsert to Supabase (insert or update)
    const { error } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Card sync error:", error.message);
      return;
    }

    // Mark cards as synced in SQLite
    const ids = unsyncedCards.map((c) => `'${c.id}'`).join(",");
    db.runSync(`UPDATE cards SET synced = 1 WHERE id IN (${ids})`);

    console.log(`✅ Synced ${unsyncedCards.length} cards to Supabase`);
  } catch (error: any) {
    console.error("syncCards failed:", error.message);
  }
}

// ── Sync reviews to Supabase ──────────────────────────────────────────────────

export async function syncReviews(userId: string): Promise<void> {
  try {
    // Get all unsynced reviews from SQLite
    const unsyncedReviews = db.getAllSync(
      "SELECT * FROM reviews WHERE synced = 0",
    ) as any[];

    if (unsyncedReviews.length === 0) return;

    // Format for Supabase
    const rows = unsyncedReviews.map((review) => ({
      id: review.id,
      user_id: userId,
      card_id: review.card_id,
      quality: review.quality,
      ease_factor_before: review.ease_factor_before,
      interval_before: review.interval_before,
      reviewed_at: review.reviewed_at,
    }));

    // Upsert to Supabase
    const { error } = await supabase
      .from("reviews")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Review sync error:", error.message);
      return;
    }

    // Mark reviews as synced in SQLite
    const ids = unsyncedReviews.map((r) => `'${r.id}'`).join(",");
    db.runSync(`UPDATE reviews SET synced = 1 WHERE id IN (${ids})`);

    console.log(`✅ Synced ${unsyncedReviews.length} reviews to Supabase`);
  } catch (error: any) {
    console.error("syncReviews failed:", error.message);
  }
}

// ── Sync sessions to Supabase ─────────────────────────────────────────────────

export async function syncSessions(userId: string): Promise<void> {
  try {
    const unsyncedSessions = db.getAllSync(
      "SELECT * FROM sessions WHERE synced = 0",
    ) as any[];

    if (unsyncedSessions.length === 0) return;

    const rows = unsyncedSessions.map((session) => ({
      id: session.id,
      user_id: userId,
      date: session.date,
      cards_reviewed: session.cards_reviewed,
      cards_correct: session.cards_correct,
      duration_seconds: session.duration_seconds,
      created_at: session.created_at,
    }));

    const { error } = await supabase
      .from("sessions")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Session sync error:", error.message);
      return;
    }

    const ids = unsyncedSessions.map((s) => `'${s.id}'`).join(",");
    db.runSync(`UPDATE sessions SET synced = 1 WHERE id IN (${ids})`);

    console.log(`✅ Synced ${unsyncedSessions.length} sessions to Supabase`);
  } catch (error: any) {
    console.error("syncSessions failed:", error.message);
  }
}

// ── Full sync — runs all three ────────────────────────────────────────────────

export async function syncAll(userId: string): Promise<void> {
  await syncCards(userId); // cards first
  await syncReviews(userId); // reviews depend on cards
  await syncSessions(userId); // sessions last
}
