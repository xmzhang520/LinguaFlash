import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlashcardReview from "../../../src/components/FlashcardReview";
import { useAuth } from "../../../src/context/AuthContext";
import { getAllCards, updateCard } from "../../../src/db/cards";
import { insertReviews, insertSession } from "../../../src/db/reviews";
import { getHint } from "../../../src/services/ai";
import {
  buildInterleavedSession,
  calculateLearningStep,
  Card,
  computeSessionStats,
  ReviewResult,
} from "../../../src/services/sr-engine";
import { syncAll } from "../../../src/services/sync";
import { useAuthStore } from "../../../src/stores/authStore";
import { useSettingsStore } from "../../../src/stores/settingsStore";

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ practiceAll?: string }>();
  const isPracticeAll = params.practiceAll === "1";

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStart] = useState(Date.now());
  const { user } = useAuth();
  const { profile } = useAuthStore();
  const { newCardLimit, loadSettings } = useSettingsStore();

  const loadCards = useCallback(() => {
    setSessionDone(false);
    setLoading(true);
    const allCards = getAllCards();
    if (isPracticeAll) {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
    } else {
      const session = buildInterleavedSession(allCards, newCardLimit);
      setCards(session);
    }
    setLoading(false);
  }, [isPracticeAll, newCardLimit]);

  useEffect(() => {
    loadSettings().then(loadCards);
  }, [isPracticeAll]);

  const handleSessionComplete = (results: ReviewResult[]) => {
    for (const result of results) {
      // Use graduated steps for new/learning cards, SM-2 for review cards
      const originalCard = result.card;
      if (originalCard.cardState !== "review") {
        const stepped = calculateLearningStep(originalCard, result.quality);
        updateCard(stepped);
      } else {
        updateCard(result.card);
      }
    }
    insertReviews(results);
    const stats = computeSessionStats(results);
    const duration = Math.round((Date.now() - sessionStart) / 1000);
    insertSession(
      stats.cardsReviewed,
      Math.round((stats.retentionRate / 100) * stats.cardsReviewed),
      duration,
    );
    if (user?.id) syncAll(user.id);
    setSessionDone(true);
  };

  const handleRequestHint = useCallback(
    async (card: Card) =>
      getHint(
        card,
        profile?.nativeLang ?? "English",
        profile?.targetLang ?? "Spanish",
      ),
    [profile],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading cards...</Text>
      </SafeAreaView>
    );
  }

  if (sessionDone || cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>{sessionDone ? "🎉" : "✅"}</Text>
          <Text style={styles.emptyTitle}>
            {sessionDone ? "Session Complete!" : "All caught up!"}
          </Text>
          <Text style={styles.emptyText}>
            {sessionDone
              ? "Great work! Want to keep going?"
              : "No cards due right now."}
          </Text>
          {!isPracticeAll && (
            <TouchableOpacity
              style={styles.practiceBtn}
              onPress={() =>
                router.replace({
                  pathname: "/(tabs)/cards/review",
                  params: { practiceAll: "1" },
                })
              }
            >
              <Text style={styles.practiceBtnText}>
                🔁 Practice all cards anyway
              </Text>
            </TouchableOpacity>
          )}
          {isPracticeAll && (
            <TouchableOpacity style={styles.practiceBtn} onPress={loadCards}>
              <Text style={styles.practiceBtnText}>🔄 Shuffle & go again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.backBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <FlashcardReview
      key={`${isPracticeAll}-${cards.length}-${sessionDone}`}
      cards={cards}
      onSessionComplete={handleSessionComplete}
      onRequestHint={handleRequestHint}
      isPracticeMode={isPracticeAll}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f13",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#6b7280", fontSize: 14 },
  emptyBox: { alignItems: "center", gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 24, fontWeight: "800", color: "#f9fafb" },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  practiceBtn: {
    backgroundColor: "#1e1b4b",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#6366f1",
    marginTop: 4,
  },
  practiceBtnText: { color: "#a5b4fc", fontSize: 14, fontWeight: "600" },
  backBtn: {
    backgroundColor: "#18181f",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    marginTop: 4,
  },
  backBtnText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
});
