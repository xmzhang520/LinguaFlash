import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { supabase } from "../../src/services/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { useSettingsStore } from "../../src/stores/settingsStore";

const LANGUAGES = [
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
];

const NATIVE_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
];

export default function SettingsScreen() {
  const { theme, toggleTheme, colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, loadProfile } = useAuthStore();
  const { newCardLimit, setNewCardLimit, loadSettings } = useSettingsStore();

  const [targetLang, setTargetLang] = useState(profile?.targetLang ?? "es");
  const [nativeLang, setNativeLang] = useState(profile?.nativeLang ?? "en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadProfile(user.id);
      setTargetLang(profile?.targetLang ?? "es");
      setNativeLang(profile?.nativeLang ?? "en");
    }, [profile?.targetLang, profile?.nativeLang]),
  );

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ target_lang: targetLang, native_lang: nativeLang })
        .eq("id", user.id);
      if (error) throw error;
      await loadProfile(user.id);
      Alert.alert("Saved!", "Your language settings have been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Settings
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <TouchableOpacity
            style={[
              styles.themeToggle,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
            onPress={toggleTheme}
          >
            <Text style={styles.themeEmoji}>
              {theme === "dark" ? "🌙" : "☀️"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </Text>
              <Text style={[styles.themeSub, { color: colors.textSecondary }]}>
                Tap to switch to {theme === "dark" ? "light" : "dark"} mode
              </Text>
            </View>
            <View
              style={[
                styles.themeSwitch,
                {
                  backgroundColor:
                    theme === "dark" ? colors.accent : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.themeSwitchThumb,
                  { transform: [{ translateX: theme === "dark" ? 0 : 20 }] },
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Daily new cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Daily New Cards
          </Text>
          <View
            style={[
              styles.limitCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <View style={styles.limitRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.limitLabel, { color: colors.textPrimary }]}
                >
                  New cards per day
                </Text>
                <Text style={[styles.limitHint, { color: colors.textMuted }]}>
                  Each new card goes through: 10 min → 1 day → 3 days → 7 days
                </Text>
              </View>
              <View style={styles.limitControls}>
                <TouchableOpacity
                  style={[
                    styles.limitBtn,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                  onPress={() => setNewCardLimit(Math.max(1, newCardLimit - 1))}
                >
                  <Text
                    style={[styles.limitBtnText, { color: colors.textPrimary }]}
                  >
                    −
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.limitValue, { color: colors.accent }]}>
                  {newCardLimit}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.limitBtn,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    setNewCardLimit(Math.min(20, newCardLimit + 1))
                  }
                >
                  <Text
                    style={[styles.limitBtnText, { color: colors.textPrimary }]}
                  >
                    ＋
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Visual step indicator */}
            <View style={styles.stepsRow}>
              {["New", "10 min", "1 day", "3 days", "7 days", "SM-2 ♾️"].map(
                (step, i) => (
                  <View key={step} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor:
                            i === 0 ? colors.accent : colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: i === 0 ? colors.accent : colors.textMuted },
                      ]}
                    >
                      {step}
                    </Text>
                    {i < 5 && (
                      <Text
                        style={[styles.stepArrow, { color: colors.textMuted }]}
                      >
                        →
                      </Text>
                    )}
                  </View>
                ),
              )}
            </View>
          </View>
        </View>

        {/* Target language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            I want to learn
          </Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                  },
                  targetLang === lang.code && {
                    backgroundColor: colors.accentDark,
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => setTargetLang(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    { color: colors.textSecondary },
                    targetLang === lang.code && {
                      color: colors.textAccent,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Native language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            My native language
          </Text>
          <View style={styles.langGrid}>
            {NATIVE_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                  },
                  nativeLang === lang.code && {
                    backgroundColor: colors.accentDark,
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => setNativeLang(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    { color: colors.textSecondary },
                    nativeLang === lang.code && {
                      color: colors.textAccent,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
          <View
            style={[
              styles.accountCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.accountRow, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.accountLabel, { color: colors.textSecondary }]}
              >
                Email
              </Text>
              <Text
                style={[styles.accountValue, { color: colors.textPrimary }]}
              >
                {user?.email}
              </Text>
            </View>
            <View
              style={[styles.accountRow, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.accountLabel, { color: colors.textSecondary }]}
              >
                Streak
              </Text>
              <Text
                style={[styles.accountValue, { color: colors.textPrimary }]}
              >
                🔥 {profile?.streak ?? 0} days
              </Text>
            </View>
            <View style={[styles.accountRow, { borderBottomWidth: 0 }]}>
              <Text
                style={[styles.accountLabel, { color: colors.textSecondary }]}
              >
                Member since
              </Text>
              <Text
                style={[styles.accountValue, { color: colors.textPrimary }]}
              >
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Settings"}
          </Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.bgCard }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24, gap: 24, paddingBottom: 48 },
  header: { gap: 4 },
  headerTitle: { fontSize: 26, fontWeight: "800" },
  headerSub: { fontSize: 13 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Theme toggle
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  themeEmoji: { fontSize: 24 },
  themeLabel: { fontSize: 15, fontWeight: "700" },
  themeSub: { fontSize: 12, marginTop: 2 },
  themeSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  themeSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  // New card limit
  limitCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  limitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  limitLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  limitHint: { fontSize: 11, lineHeight: 16 },
  limitControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  limitBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  limitBtnText: { fontSize: 20, fontWeight: "700" },
  limitValue: {
    fontSize: 24,
    fontWeight: "800",
    minWidth: 32,
    textAlign: "center",
  },

  // Step indicator
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: { width: 6, height: 6, borderRadius: 3 },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  stepArrow: { fontSize: 10 },

  // Languages
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: "45%",
    flex: 1,
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 13, fontWeight: "500" },

  // Account
  accountCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  accountLabel: { fontSize: 13 },
  accountValue: { fontSize: 13, fontWeight: "600" },

  // Buttons
  saveBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  signOutBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7f1d1d",
  },
  signOutText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
});
