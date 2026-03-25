import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  ScrollView, // ← add this
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { haptics } from "../services/haptics";
import { speakWord } from "../services/speech";
import {
  Card,
  Quality,
  calculateNextReview,
  computeSessionStats,
} from "../services/sr-engine";
import { useAuthStore } from "../stores/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewResult {
  card: Card;
  quality: Quality;
  reviewedAt: Date;
}

interface FlashcardReviewProps {
  cards: Card[];
  onSessionComplete: (results: ReviewResult[]) => void;
  onRequestHint?: (card: Card) => Promise<string>;
  isPracticeMode?: boolean; // ← add this
}

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W - 48;
const CARD_H = SCREEN_H * 0.44;
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

const RATING_BUTTONS: {
  quality: Quality;
  label: string;
  sublabel: string;
  color: string;
}[] = [
  { quality: 0, label: "Again", sublabel: "< 1 min", color: "#ef4444" },
  { quality: 2, label: "Hard", sublabel: "~1 day", color: "#f97316" },
  { quality: 4, label: "Good", sublabel: "~3 days", color: "#22c55e" },
  { quality: 5, label: "Easy", sublabel: "1 week+", color: "#3b82f6" },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function FlashcardReview({
  cards: initialCards,
  onSessionComplete,
  onRequestHint,
  isPracticeMode = false,
}: FlashcardReviewProps) {
  const { profile } = useAuthStore();

  const [queue, setQueue] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [swipeLabel, setSwipeLabel] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [finalResults, setFinalResults] = useState<ReviewResult[]>([]);
  const [speaking, setSpeaking] = useState(false);

  // Animation values
  const flipProgress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const swipeLabelOpacity = useSharedValue(0);

  const currentCard = queue[currentIndex];
  const progress = currentIndex / initialCards.length;

  // ── Animated styles ───────────────────────────────────────────────────────

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      {
        rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg`,
      },
    ],
    opacity: flipProgress.value > 0.5 ? 0 : 1,
    backfaceVisibility: "hidden",
    position: "absolute",
    width: "100%",
    height: "100%",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      {
        rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360], Extrapolation.CLAMP)}deg`,
      },
    ],
    opacity: flipProgress.value > 0.5 ? 1 : 0,
    backfaceVisibility: "hidden",
    position: "absolute",
    width: "100%",
    height: "100%",
  }));

  const cardWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_W, 0, SCREEN_W],
          [-15, 0, 15],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
    opacity: cardOpacity.value,
  }));

  const swipeLabelStyle = useAnimatedStyle(() => ({
    opacity: swipeLabelOpacity.value,
  }));

  // ── Speak ─────────────────────────────────────────────────────────────────

  const handleSpeak = async () => {
    if (!currentCard?.front) return;
    setSpeaking(true);
    await speakWord(currentCard.front, profile?.targetLang ?? "en");
    setSpeaking(false);
  };

  // ── Flip ──────────────────────────────────────────────────────────────────

  const flipCard = useCallback(() => {
    if (isFlipped) return;
    haptics.light();
    flipProgress.value = withTiming(1, { duration: 500 });
    setIsFlipped(true);
    setHint(null);
  }, [isFlipped]);

  // ── Advance ───────────────────────────────────────────────────────────────

  const advanceCard = useCallback(
    (quality: Quality) => {
      if (!currentCard) return;
      if (quality >= 3) {
        haptics.medium();
      } else {
        haptics.error();
      }

      const updated = calculateNextReview(currentCard, quality);
      const result: ReviewResult = {
        card: updated,
        quality,
        reviewedAt: new Date(),
      };
      const newResults = [...results, result];

      const nextQueue = [...queue];
      if (quality < 3) {
        nextQueue.splice(currentIndex + 3, 0, updated);
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex >= nextQueue.length) {
        setFinalResults(newResults);
        onSessionComplete(newResults);
        haptics.success();
        setIsDone(true);
      } else {
        translateX.value = 0;
        translateY.value = 0;
        cardOpacity.value = 1;
        flipProgress.value = 0;
        setIsFlipped(false);
        setHint(null);
        setSwipeLabel(null);
        setResults(newResults);
        setQueue(nextQueue);
        setCurrentIndex(nextIndex);
      }
    },
    [currentCard, currentIndex, queue, results, onSessionComplete],
  );

  // ── Swipe gesture ─────────────────────────────────────────────────────────

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!isFlipped) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
      if (Math.abs(e.translationX) > 60) {
        const label = e.translationX > 0 ? "GOOD ✓" : "AGAIN ✗";
        runOnJS(setSwipeLabel)(label);
        swipeLabelOpacity.value = withTiming(1, { duration: 100 });
      } else {
        swipeLabelOpacity.value = withTiming(0, { duration: 100 });
      }
    })
    .onEnd((e) => {
      if (!isFlipped) return;
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_W * 1.5, { duration: 300 });
        cardOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(advanceCard)(4);
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_W * 1.5, { duration: 300 });
        cardOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(advanceCard)(0);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        swipeLabelOpacity.value = withTiming(0);
        runOnJS(setSwipeLabel)(null);
      }
    });

  // ── AI Hint ───────────────────────────────────────────────────────────────

  const handleHint = async () => {
    if (!onRequestHint || !currentCard || loadingHint) return;
    setLoadingHint(true);
    try {
      const result = await onRequestHint(currentCard);
      setHint(result);
    } catch (e: any) {
      setHint(`Error: ${e.message}`);
    } finally {
      setLoadingHint(false);
    }
  };

  // ── Done screen ───────────────────────────────────────────────────────────

  if (isDone) {
    const stats = computeSessionStats(finalResults);
    const pct = stats.retentionRate;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneBox}>
          <Text style={styles.doneEmoji}>
            {pct >= 80 ? "🔥" : pct >= 50 ? "👍" : "💪"}
          </Text>
          <Text style={styles.doneTitle}>Session Complete!</Text>
          <View style={styles.statsRow}>
            <StatBox label="Reviewed" value={`${stats.cardsReviewed}`} />
            <StatBox
              label="Correct"
              value={`${Math.round((pct / 100) * stats.cardsReviewed)}`}
              color="#22c55e"
            />
            <StatBox label="Retention" value={`${pct}%`} color="#3b82f6" />
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Review screen ─────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>
            {currentIndex + 1} / {queue.length}
          </Text>
          {isPracticeMode ? (
            <View style={styles.practiceBadge}>
              <Text style={styles.practiceBadgeText}>🔁 Practice</Text>
            </View>
          ) : currentCard?.source === "error" ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>⚠ Error card</Text>
            </View>
          ) : null}
          <Text style={styles.headerRight}>
            {queue.length - currentIndex - 1} left
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        {/* Card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardWrapper, cardWrapperStyle]}>
            {/* Swipe label */}
            <Animated.View
              style={[
                styles.swipeLabel,
                swipeLabelStyle,
                {
                  backgroundColor: swipeLabel?.startsWith("GOOD")
                    ? "#22c55e33"
                    : "#ef444433",
                  borderColor: swipeLabel?.startsWith("GOOD")
                    ? "#22c55e"
                    : "#ef4444",
                },
              ]}
            >
              <Text
                style={[
                  styles.swipeLabelText,
                  {
                    color: swipeLabel?.startsWith("GOOD")
                      ? "#22c55e"
                      : "#ef4444",
                  },
                ]}
              >
                {swipeLabel}
              </Text>
            </Animated.View>

            {/* Front */}
            <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
              <Text style={styles.cardLangTag}>
                {currentCard?.tags?.join(" · ") || "Word"}
              </Text>
              <Text style={styles.cardFrontText}>{currentCard?.front}</Text>

              {/* Pronunciation */}
              {currentCard?.pronunciation && (
                <Text style={styles.pronunciationText}>
                  {currentCard.pronunciation}
                </Text>
              )}

              {currentCard?.context && (
                <Text style={styles.cardContext}>"{currentCard.context}"</Text>
              )}

              {/* Speak + Tap hint row */}
              <View style={styles.cardBottomRow}>
                <TouchableOpacity
                  style={[styles.speakBtn, speaking && styles.speakBtnActive]}
                  onPress={handleSpeak}
                >
                  <Text style={styles.speakBtnText}>
                    {speaking ? "⏸" : "🔊"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tapHint} onPress={flipCard}>
                  <Text style={styles.tapHintText}>Tap to reveal ↓</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
              <Text style={styles.cardLangTag}>Answer</Text>
              {hint ? (
                <ScrollView
                  style={styles.backScroll}
                  contentContainerStyle={styles.backScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.cardBackText}>{currentCard?.back}</Text>
                  <View style={styles.hintBox}>
                    <Text style={styles.hintIcon}>✦ AI Hint</Text>
                    <Text style={styles.hintText}>{hint}</Text>
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.cardBackText}>{currentCard?.back}</Text>
              )}
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {!isFlipped ? (
            <TouchableOpacity style={styles.flipBtn} onPress={flipCard}>
              <Text style={styles.flipBtnText}>Show Answer</Text>
            </TouchableOpacity>
          ) : (
            onRequestHint && (
              <TouchableOpacity
                style={[styles.hintBtn, loadingHint && { opacity: 0.6 }]}
                onPress={handleHint}
                disabled={loadingHint || !!hint}
              >
                <Text style={styles.hintBtnText}>
                  {loadingHint
                    ? "Loading…"
                    : hint
                      ? "Hint shown ✓"
                      : "✦ AI Hint"}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Rating buttons */}
        {isFlipped && (
          <View style={styles.ratingsContainer}>
            <Text style={styles.ratingsLabel}>How did it go?</Text>
            <View style={styles.ratings}>
              {RATING_BUTTONS.map((btn) => (
                <TouchableOpacity
                  key={btn.quality}
                  style={[styles.ratingBtn, { borderColor: btn.color }]}
                  onPress={() => advanceCard(btn.quality)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.ratingLabel, { color: btn.color }]}>
                    {btn.label}
                  </Text>
                  <Text style={styles.ratingSubLabel}>{btn.sublabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.swipeHint}>
              swipe right = Good · swipe left = Again
            </Text>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f13", alignItems: "center" },

  // Header
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLabel: { color: "#6b7280", fontSize: 13 },
  headerRight: { color: "#6b7280", fontSize: 13 },
  errorBadge: {
    backgroundColor: "#7c2d1220",
    borderColor: "#f97316",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  errorBadgeText: { color: "#f97316", fontSize: 11, fontWeight: "600" },

  // Progress
  progressTrack: {
    width: SCREEN_W - 48,
    height: 3,
    backgroundColor: "#1f2937",
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#6366f1", borderRadius: 2 },

  // Card
  cardWrapper: { width: CARD_W, height: CARD_H, position: "relative" },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  cardFront: {
    backgroundColor: "#18181f",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardBack: {
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#312e81",
  },
  cardLangTag: {
    position: "absolute",
    top: 18,
    left: 22,
    color: "#4b5563",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardFrontText: {
    color: "#f9fafb",
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  cardBackText: {
    color: "#a5b4fc",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  pronunciationText: {
    color: "#6b7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  cardContext: {
    position: "absolute",
    bottom: 54,
    color: "#6b7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cardBottomRow: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  speakBtn: {
    backgroundColor: "#27272a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#374151",
  },
  speakBtnActive: { borderColor: "#6366f1", backgroundColor: "#1e1b4b" },
  speakBtnText: { fontSize: 16 },
  tapHint: {},
  tapHintText: { color: "#374151", fontSize: 12 },

  backScroll: { width: "100%", flex: 1, marginTop: 8 },
  backScrollContent: { alignItems: "center", gap: 12, paddingBottom: 8 },

  // Hint
  hintBox: {
    marginTop: 20,
    backgroundColor: "#1e1b4b",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#4338ca",
    width: "100%",
  },
  hintIcon: {
    color: "#818cf8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  hintText: { color: "#c7d2fe", fontSize: 14, lineHeight: 20 },

  // Swipe label
  swipeLabel: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
    zIndex: 10,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  swipeLabelText: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },

  // Action row
  actionRow: { marginTop: 20, alignItems: "center" },
  flipBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  flipBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hintBtn: {
    backgroundColor: "#1e1b4b",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4338ca",
  },
  hintBtnText: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  // Ratings
  ratingsContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: "center",
  },
  ratingsLabel: {
    color: "#4b5563",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  ratings: { flexDirection: "row", gap: 10, justifyContent: "center" },
  ratingBtn: {
    flex: 1,
    maxWidth: 82,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#18181f",
    borderWidth: 1.5,
  },
  ratingLabel: { fontSize: 14, fontWeight: "700" },
  ratingSubLabel: { color: "#4b5563", fontSize: 10, marginTop: 2 },
  swipeHint: { color: "#374151", fontSize: 11, marginTop: 12 },

  // Done screen
  doneBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  doneEmoji: { fontSize: 64 },
  doneTitle: { color: "#f9fafb", fontSize: 28, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 8,
    backgroundColor: "#18181f",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  statBox: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { color: "#6b7280", fontSize: 12 },
  homeBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  homeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  practiceBadge: {
    backgroundColor: "#1e1b4b",
    borderColor: "#6366f1",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  practiceBadgeText: { color: "#a5b4fc", fontSize: 11, fontWeight: "600" },
});
