import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { addErrorCard } from "../../src/db/cards";
import { haptics } from "../../src/services/haptics";
import { Card } from "../../src/services/sr-engine";
import { useAuthStore } from "../../src/stores/authStore";
import { useCardStore } from "../../src/stores/cardStore";

type ExerciseState =
  | "question"
  | "checking"
  | "correct"
  | "partial"
  | "incorrect";

interface AIFeedback {
  correct: boolean;
  partial: boolean;
  explanation: string;
  correction?: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
async function checkAnswerWithAI(
  front: string,
  back: string,
  userAnswer: string,
  nativeLang: string,
  targetLang: string,
): Promise<AIFeedback> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a language learning assistant checking a translation exercise.

Word/phrase being translated: "${front}" (${targetLang})
Expected answer: "${back}"
Student's answer: "${userAnswer}"
Student's native language: ${nativeLang}

Evaluate if the student's answer is correct. Be lenient with:
- Minor spelling mistakes
- Capitalization differences  
- Alternative valid translations
- Different but correct phrasing

Respond ONLY with a JSON object, no markdown, no explanation outside JSON:
{
  "correct": true/false,
  "partial": true/false,
  "explanation": "Brief encouraging explanation in ${nativeLang} (1-2 sentences max)",
  "correction": "The correct answer if wrong, or null if correct"
}`,
        },
      ],
    }),
  });

  const data = await response.json();
  console.log("AI response:", JSON.stringify(data)); // ← add temporarily
  const text = data.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
}

export default function ExerciseScreen() {
  const { colors, isDark } = useTheme();
  const { cards, loadCards } = useCardStore();
  const { profile } = useAuthStore();

  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [userInput, setUserInput] = useState("");
  const [state, setState] = useState<ExerciseState>("question");
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [errorAdded, setErrorAdded] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCards();
      pickNextCard();
      setScore({ correct: 0, incorrect: 0 });
      setStreak(0);
    }, []),
  );

  const pickNextCard = useCallback(() => {
    if (cards.length === 0) return;
    setCurrentCard(pickRandom(cards));
    setUserInput("");
    setState("question");
    setErrorAdded(false);
    setFeedback(null);
  }, [cards]);

  const handleNext = useCallback(() => {
    pickNextCard();
  }, [pickNextCard]);

  const handleSubmit = useCallback(async () => {
    if (!currentCard || !userInput.trim() || state !== "question") return;

    setState("checking");
    haptics.light();

    try {
      const result = await checkAnswerWithAI(
        currentCard.front,
        currentCard.back,
        userInput.trim(),
        profile?.nativeLang ?? "English",
        profile?.targetLang ?? "Japanese",
      );

      setFeedback(result);

      if (result.correct) {
        haptics.success();
        if (streak + 1 >= 3) haptics.heavy();
        setState("correct");
        setScore((s) => ({ ...s, correct: s.correct + 1 }));
        setStreak((s) => s + 1);
      } else if (result.partial) {
        haptics.medium();
        setState("partial");
        setScore((s) => ({ ...s, correct: s.correct + 1 }));
        setStreak((s) => s + 1);
      } else {
        haptics.error();
        setState("incorrect");
        setScore((s) => ({ ...s, incorrect: s.incorrect + 1 }));
        setStreak(0);
        if (!errorAdded) {
          addErrorCard(currentCard.front, currentCard.back, [
            ...(currentCard.tags ?? []),
            "exercise-error",
          ]);
          setErrorAdded(true);
          loadCards();
        }
      }
    } catch (e: any) {
      // Fallback to simple string match if API fails
      const normalize = (s: string) =>
        s
          .trim()
          .toLowerCase()
          .replace(/[.,!?;:'"]/g, "")
          .replace(/\s+/g, " ");
      const isCorrect = normalize(userInput) === normalize(currentCard.back);
      setFeedback({
        correct: isCorrect,
        partial: false,
        explanation: isCorrect ? "Correct!" : `Expected: ${currentCard.back}`,
        correction: isCorrect ? undefined : currentCard.back,
      });
      if (isCorrect) {
        haptics.success();
        setState("correct");
        setScore((s) => ({ ...s, correct: s.correct + 1 }));
        setStreak((s) => s + 1);
      } else {
        haptics.error();
        setState("incorrect");
        setScore((s) => ({ ...s, incorrect: s.incorrect + 1 }));
        setStreak(0);
      }
    }
  }, [currentCard, userInput, errorAdded, streak, state, profile]);

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No cards yet!
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Add some flashcards first, then come back to practice.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Exercise
            </Text>
            <View style={styles.scoreRow}>
              {streak >= 3 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streak}</Text>
                </View>
              )}
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.scoreCorrect}>✓ {score.correct}</Text>
                <Text style={[styles.scoreSep, { color: colors.textMuted }]}>
                  ·
                </Text>
                <Text style={styles.scoreIncorrect}>✗ {score.incorrect}</Text>
              </View>
            </View>
          </View>

          {/* Question card */}
          <View
            style={[
              styles.questionCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.questionLabel, { color: colors.textMuted }]}>
              Translate this
            </Text>
            <Text style={[styles.questionText, { color: colors.textPrimary }]}>
              {currentCard?.front}
            </Text>
            {currentCard?.context && (
              <Text
                style={[
                  styles.questionContext,
                  { color: colors.textSecondary },
                ]}
              >
                "{currentCard.context}"
              </Text>
            )}
            {currentCard?.tags && currentCard.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {currentCard.tags
                  .filter((t) => t !== "exercise-error")
                  .map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: colors.accentDark,
                          borderColor: colors.accentBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.tagText, { color: colors.textAccent }]}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Your answer
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
                state === "correct" && styles.inputCorrect,
                state === "partial" && styles.inputPartial,
                state === "incorrect" && styles.inputIncorrect,
              ]}
              placeholder="Type translation here..."
              placeholderTextColor={colors.textMuted}
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={state === "question" ? handleSubmit : handleNext}
              editable={state === "question"}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Checking indicator */}
          {state === "checking" && (
            <View
              style={[
                styles.checkingBox,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator color={colors.accent} size="small" />
              <Text
                style={[styles.checkingText, { color: colors.textSecondary }]}
              >
                ✦ AI is checking your answer...
              </Text>
            </View>
          )}

          {/* Correct feedback */}
          {state === "correct" && feedback && (
            <View style={styles.resultBox}>
              <Text style={styles.resultEmoji}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>
                  {streak >= 3 ? `🔥 ${streak} in a row!` : "Correct!"}
                </Text>
                <Text style={styles.resultSub}>{feedback.explanation}</Text>
              </View>
            </View>
          )}

          {/* Partial feedback */}
          {state === "partial" && feedback && (
            <View style={[styles.resultBox, styles.resultBoxPartial]}>
              <Text style={styles.resultEmoji}>🟡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, styles.resultTitlePartial]}>
                  Close enough!
                </Text>
                <Text style={styles.resultSub}>{feedback.explanation}</Text>
                {feedback.correction && (
                  <Text
                    style={[
                      styles.resultCorrectAnswer,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Best answer:{" "}
                    <Text
                      style={[
                        styles.resultCorrectAnswerValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {feedback.correction}
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Incorrect feedback */}
          {state === "incorrect" && feedback && (
            <View style={[styles.resultBox, styles.resultBoxIncorrect]}>
              <Text style={styles.resultEmoji}>❌</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, styles.resultTitleIncorrect]}>
                  Not quite!
                </Text>
                <Text style={[styles.resultSub, { color: "#fca5a5" }]}>
                  {feedback.explanation}
                </Text>
                {feedback.correction && (
                  <Text
                    style={[
                      styles.resultCorrectAnswer,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Correct answer:{" "}
                    <Text
                      style={[
                        styles.resultCorrectAnswerValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {feedback.correction}
                    </Text>
                  </Text>
                )}
                {errorAdded && (
                  <Text style={styles.errorCardNote}>
                    ⚠ Added to your deck for extra review
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            {state === "question" && (
              <>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    !userInput.trim() && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!userInput.trim()}
                >
                  <Text style={styles.submitBtnText}>Check Answer ✦ AI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.skipBtn,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleNext}
                >
                  <Text
                    style={[
                      styles.skipBtnText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Skip
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {state === "checking" && (
              <TouchableOpacity
                style={[styles.submitBtn, styles.submitBtnDisabled]}
                disabled
              >
                <Text style={styles.submitBtnText}>Checking...</Text>
              </TouchableOpacity>
            )}
            {(state === "correct" ||
              state === "partial" ||
              state === "incorrect") && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Next Question →</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24, gap: 20, paddingBottom: 48 },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 24, fontWeight: "800" },
  emptyText: { fontSize: 14, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  scoreCorrect: { fontSize: 13, fontWeight: "700", color: "#22c55e" },
  scoreIncorrect: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
  scoreSep: { fontSize: 13 },
  streakBadge: {
    backgroundColor: "#7c2d1220",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#f97316",
  },
  streakText: { fontSize: 13, fontWeight: "700", color: "#f97316" },
  questionCard: {
    borderRadius: 20,
    padding: 28,
    gap: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  questionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  questionContext: { fontSize: 13, fontStyle: "italic", textAlign: "center" },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  tagText: { fontSize: 11 },
  inputSection: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    textAlign: "center",
  },
  inputCorrect: { borderColor: "#22c55e", backgroundColor: "#052e1620" },
  inputPartial: { borderColor: "#f59e0b", backgroundColor: "#78350f20" },
  inputIncorrect: { borderColor: "#ef4444", backgroundColor: "#7f1d1d20" },
  checkingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  checkingText: { fontSize: 13 },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#052e1620",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  resultBoxPartial: { backgroundColor: "#78350f20", borderColor: "#f59e0b" },
  resultBoxIncorrect: { backgroundColor: "#7f1d1d20", borderColor: "#ef4444" },
  resultEmoji: { fontSize: 24, flexShrink: 0 },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: 2,
  },
  resultTitlePartial: { color: "#f59e0b" },
  resultTitleIncorrect: { color: "#ef4444" },
  resultSub: { fontSize: 13, color: "#16a34a", marginBottom: 4 },
  resultCorrectAnswer: { fontSize: 13, marginBottom: 4 },
  resultCorrectAnswerValue: { fontWeight: "700" },
  errorCardNote: { fontSize: 11, color: "#f97316", marginTop: 4 },
  btnRow: { gap: 10 },
  submitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  nextBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: {
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  skipBtnText: { fontSize: 14 },
});
