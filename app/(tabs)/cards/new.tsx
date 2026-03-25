import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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
import { useTheme } from "../../../src/context/ThemeContext";
import { addManualCard } from "../../../src/db/cards";
import { haptics } from "../../../src/services/haptics";
import { speakWord } from "../../../src/services/speech";
import { useAuthStore } from "../../../src/stores/authStore";

const TAGS = ["verb", "noun", "adjective", "phrase", "number", "grammar"];

export default function NewCardScreen() {
  const { colors, isDark } = useTheme();
  const { profile } = useAuthStore();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [context, setContext] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFront("");
      setBack("");
      setContext("");
      setPronunciation("");
      setSelectedTags([]);
      setSaved(false);
    }, []),
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSpeak = async (text: string) => {
    if (!text.trim()) return;
    setSpeaking(true);
    await speakWord(text, profile?.targetLang ?? "es");
    setSpeaking(false);
  };

  const handleSave = () => {
    if (!front.trim() || !back.trim()) {
      haptics.error();
      Alert.alert(
        "Missing fields",
        "Please fill in both the front and back of the card.",
      );
      return;
    }
    addManualCard(front.trim(), back.trim(), selectedTags);
    haptics.success();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setFront("");
      setBack("");
      setContext("");
      setPronunciation("");
      setSelectedTags([]);
    }, 1200);
  };

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
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.backBtnText, { color: colors.textSecondary }]}
              >
                ← Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              New Card
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Card preview */}
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                Front
              </Text>
              <Text
                style={[styles.previewText, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {front || "Word or phrase"}
              </Text>
            </View>
            <Text style={[styles.previewArrow, { color: colors.textMuted }]}>
              →
            </Text>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.bgCardAlt,
                  borderColor: colors.borderAlt,
                },
              ]}
            >
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                Back
              </Text>
              <Text
                style={[styles.previewText, { color: colors.textAccent }]}
                numberOfLines={2}
              >
                {back || "Translation"}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Front — word or phrase
            </Text>
            <View style={styles.pronounceRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.bgInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="e.g. Bonjour"
                placeholderTextColor={colors.textMuted}
                value={front}
                onChangeText={setFront}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[
                  styles.speakBtn,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                  },
                  speaking && {
                    borderColor: colors.accent,
                    backgroundColor: colors.accentDark,
                  },
                ]}
                onPress={() => handleSpeak(front)}
                disabled={!front.trim()}
              >
                <Text style={styles.speakBtnText}>{speaking ? "⏸" : "🔊"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Back — translation or meaning
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. Hello"
              placeholderTextColor={colors.textMuted}
              value={back}
              onChangeText={setBack}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Context sentence{" "}
              <Text style={[styles.optional, { color: colors.textMuted }]}>
                (optional)
              </Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. Bonjour, comment ça va?"
              placeholderTextColor={colors.textMuted}
              value={context}
              onChangeText={setContext}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Pronunciation{" "}
              <Text style={[styles.optional, { color: colors.textMuted }]}>
                (romanization, e.g. "bon-ZHOOR")
              </Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. bon-ZHOOR"
              placeholderTextColor={colors.textMuted}
              value={pronunciation}
              onChangeText={setPronunciation}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Tags{" "}
              <Text style={[styles.optional, { color: colors.textMuted }]}>
                (optional)
              </Text>
            </Text>
            <View style={styles.tagsRow}>
              {TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.border,
                    },
                    selectedTags.includes(tag) && {
                      backgroundColor: colors.accentDark,
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: colors.textSecondary },
                      selectedTags.includes(tag) && {
                        color: colors.textAccent,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnSaved]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>
                {saved ? "✓ Saved!" : "Save Card"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.doneBtn,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
              onPress={() => router.back()}
            >
              <Text
                style={[styles.doneBtnText, { color: colors.textSecondary }]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24, gap: 20, paddingBottom: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 13 },
  title: { fontSize: 18, fontWeight: "800" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  previewCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  previewLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  previewText: { fontSize: 16, fontWeight: "700" },
  previewArrow: { fontSize: 18 },
  form: { gap: 10 },
  label: { fontSize: 13, fontWeight: "600" },
  optional: { fontWeight: "400" },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  inputMultiline: { height: 80, textAlignVertical: "top" },
  pronounceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  speakBtn: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  speakBtnText: { fontSize: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: { fontSize: 12 },
  btnRow: { gap: 10, marginTop: 8 },
  saveBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveBtnSaved: { backgroundColor: "#16a34a" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  doneBtnText: { fontSize: 14, fontWeight: "600" },
});
