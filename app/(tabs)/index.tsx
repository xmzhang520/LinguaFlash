import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { getDueCount, getTotalCount } from "../../src/db/cards";
import { getTotalReviewedToday } from "../../src/db/reviews";
import {
  cancelDailyReminder,
  scheduleDailyReminder,
} from "../../src/services/notifications";

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = () => {
    setDueCount(getDueCount());
    setTotalCount(getTotalCount());
    setReviewedToday(getTotalReviewedToday());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            Good day! 👋
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={[
            styles.signOutBtn,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.signOutText, { color: colors.textSecondary }]}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {dueCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Due today
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total cards
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {reviewedToday}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Reviewed today
          </Text>
        </View>
      </View>

      {/* Main actions */}
      <View style={styles.actions}>
        {/* Review button */}
        <TouchableOpacity
          style={[
            styles.reviewBtn,
            {
              backgroundColor: colors.accentDark,
              borderColor: colors.accentBorder,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/cards/review",
              params: { practiceAll: "1" },
            })
          }
          disabled={dueCount === 0 && totalCount === 0}
        >
          <Text style={styles.reviewBtnEmoji}>🧠</Text>
          <Text style={[styles.reviewBtnTitle, { color: colors.textPrimary }]}>
            {dueCount > 0 ? `Review ${dueCount} cards` : "All caught up!"}
          </Text>
          <Text style={[styles.reviewBtnSub, { color: colors.textSecondary }]}>
            {dueCount > 0 ? "Start your session" : "No cards due right now"}
          </Text>
        </TouchableOpacity>

        {/* Add card button */}
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
          onPress={() => router.push("/(tabs)/cards/new")}
        >
          <Text style={[styles.addBtnText, { color: colors.accent }]}>
            ＋ Add New Card
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View
        style={[
          styles.notifSection,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.notifTitle, { color: colors.textSecondary }]}>
          Daily Reminder
        </Text>
        <View style={styles.notifRow}>
          <Text style={[styles.notifSub, { color: colors.textMuted }]}>
            Get reminded at 9:00 AM every day
          </Text>
          <TouchableOpacity
            style={[
              styles.notifBtn,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              notifEnabled && {
                backgroundColor: colors.accentDark,
                borderColor: colors.accent,
              },
            ]}
            onPress={async () => {
              if (notifEnabled) {
                await cancelDailyReminder();
                setNotifEnabled(false);
              } else {
                const id = await scheduleDailyReminder(9, 0, dueCount);
                setNotifEnabled(!!id);
              }
            }}
          >
            <Text
              style={[
                styles.notifBtnText,
                { color: colors.textSecondary },
                notifEnabled && { color: colors.textAccent },
              ]}
            >
              {notifEnabled ? "🔔 On" : "🔕 Off"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: "800" },
  email: { fontSize: 13, marginTop: 2 },
  signOutBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  signOutText: { fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  actions: { paddingHorizontal: 24, gap: 12 },
  reviewBtn: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  reviewBtnEmoji: { fontSize: 40 },
  reviewBtnTitle: { fontSize: 20, fontWeight: "800" },
  reviewBtnSub: { fontSize: 13 },
  addBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  notifSection: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  notifTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifSub: { fontSize: 13, flex: 1 },
  notifBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  notifBtnText: { fontSize: 13, fontWeight: "600" },
});
