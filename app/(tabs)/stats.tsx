import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { getAllCards } from "../../src/db/cards";
import {
  getRetentionRate,
  getReviewsToday,
  getSessionsLast7Days,
} from "../../src/db/reviews";
import { forecastDue, getCardMaturity } from "../../src/services/sr-engine";
import { useAuthStore } from "../../src/stores/authStore";
import { useCardStore } from "../../src/stores/cardStore";

interface MaturityCount {
  new: number;
  learning: number;
  young: number;
  mature: number;
}
interface ForecastDay {
  date: string;
  count: number;
}

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const { profile } = useAuthStore();
  const { dueCount, totalCount } = useCardStore();

  const [retention, setRetention] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [maturity, setMaturity] = useState<MaturityCount>({
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
  });
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = () => {
    const cards = getAllCards();
    setRetention(getRetentionRate());
    setReviewedToday(getReviewsToday().length);
    setSessionsCount(getSessionsLast7Days().length);
    const counts: MaturityCount = { new: 0, learning: 0, young: 0, mature: 0 };
    for (const card of cards) counts[getCardMaturity(card)]++;
    setMaturity(counts);
    setForecast(forecastDue(cards, 7));
  };

  const maxForecast = Math.max(...forecast.map((d) => d.count), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Your Progress
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Learning {profile?.targetLang?.toUpperCase() ?? "a language"}
          </Text>
        </View>

        {/* Streak card */}
        <View
          style={[
            styles.streakCard,
            {
              backgroundColor: isDark ? "#1c1400" : "#fff7ed",
              borderColor: isDark ? "#92400e" : "#fed7aa",
            },
          ]}
        >
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakValue}>
              {profile?.streak ?? 0} day streak
            </Text>
            <Text
              style={[
                styles.streakSub,
                { color: isDark ? "#78350f" : "#9a3412" },
              ]}
            >
              Longest: {profile?.longestStreak ?? 0} days
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Cards"
            value={`${totalCount}`}
            emoji="🃏"
            color="#6366f1"
            bgCard={colors.bgCard}
            border={colors.border}
            labelColor={colors.textSecondary}
          />
          <StatCard
            label="Due Today"
            value={`${dueCount}`}
            emoji="⏰"
            color="#f97316"
            bgCard={colors.bgCard}
            border={colors.border}
            labelColor={colors.textSecondary}
          />
          <StatCard
            label="Reviewed Today"
            value={`${reviewedToday}`}
            emoji="✅"
            color="#22c55e"
            bgCard={colors.bgCard}
            border={colors.border}
            labelColor={colors.textSecondary}
          />
          <StatCard
            label="Retention (30d)"
            value={`${retention}%`}
            emoji="🎯"
            color="#3b82f6"
            bgCard={colors.bgCard}
            border={colors.border}
            labelColor={colors.textSecondary}
          />
        </View>

        {/* Maturity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Card Maturity
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <MaturityRow
              label="New"
              count={maturity.new}
              total={totalCount}
              color="#6366f1"
              emoji="🌱"
              barBg={colors.border}
            />
            <MaturityRow
              label="Learning"
              count={maturity.learning}
              total={totalCount}
              color="#f59e0b"
              emoji="📖"
              barBg={colors.border}
            />
            <MaturityRow
              label="Young"
              count={maturity.young}
              total={totalCount}
              color="#3b82f6"
              emoji="🌿"
              barBg={colors.border}
            />
            <MaturityRow
              label="Mature"
              count={maturity.mature}
              total={totalCount}
              color="#22c55e"
              emoji="🌳"
              barBg={colors.border}
            />
          </View>
        </View>

        {/* Forecast */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            7-Day Review Forecast
          </Text>
          <View
            style={[
              styles.forecastCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            {forecast.map((day, i) => {
              const barHeight =
                maxForecast > 0
                  ? Math.max(
                      (day.count / maxForecast) * 100,
                      day.count > 0 ? 8 : 0,
                    )
                  : 0;
              const isToday = i === 0;
              const dayLabel = isToday
                ? "Today"
                : new Date(day.date).toLocaleDateString("en", {
                    weekday: "short",
                  });
              return (
                <View key={day.date} style={styles.forecastCol}>
                  <Text
                    style={[styles.forecastCount, { color: colors.textMuted }]}
                  >
                    {day.count > 0 ? day.count : ""}
                  </Text>
                  <View
                    style={[
                      styles.forecastBarBg,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.forecastBar,
                        {
                          height: `${barHeight}%`,
                          backgroundColor: isToday
                            ? colors.accent
                            : isDark
                              ? "#312e81"
                              : "#c7d2fe",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.forecastLabel,
                      { color: colors.textMuted },
                      isToday && { color: colors.accent, fontWeight: "700" },
                    ]}
                  >
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sessions */}
        <View
          style={[
            styles.sessionsBadge,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sessionsText, { color: colors.textSecondary }]}>
            📅 {sessionsCount} study session{sessionsCount !== 1 ? "s" : ""} in
            the last 7 days
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  emoji,
  color,
  bgCard,
  border,
  labelColor,
}: {
  label: string;
  value: string;
  emoji: string;
  color: string;
  bgCard: string;
  border: string;
  labelColor: string;
}) {
  return (
    <View
      style={[
        statCardStyles.card,
        { backgroundColor: bgCard, borderColor: `${color}40` },
      ]}
    >
      <Text style={statCardStyles.emoji}>{emoji}</Text>
      <Text style={[statCardStyles.value, { color }]}>{value}</Text>
      <Text style={[statCardStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    minWidth: "45%",
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 11, textAlign: "center" },
});

function MaturityRow({
  label,
  count,
  total,
  color,
  emoji,
  barBg,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  emoji: string;
  barBg: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={maturityStyles.row}>
      <Text style={maturityStyles.emoji}>{emoji}</Text>
      <Text style={[maturityStyles.label, { color }]}>{label}</Text>
      <View style={[maturityStyles.barBg, { backgroundColor: barBg }]}>
        <View
          style={[
            maturityStyles.bar,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[maturityStyles.count, { color }]}>{count}</Text>
    </View>
  );
}

const maturityStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  emoji: { fontSize: 16, width: 22, textAlign: "center" },
  label: { fontSize: 13, width: 64 },
  barBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bar: { height: "100%", borderRadius: 4, minWidth: 4 },
  count: { fontSize: 13, fontWeight: "700", width: 28, textAlign: "right" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24, gap: 20, paddingBottom: 48 },
  header: { gap: 4 },
  headerTitle: { fontSize: 26, fontWeight: "800" },
  headerSub: { fontSize: 13 },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  streakEmoji: { fontSize: 36 },
  streakValue: { fontSize: 20, fontWeight: "800", color: "#f97316" },
  streakSub: { fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: { borderRadius: 16, padding: 20, borderWidth: 1 },
  forecastCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
  },
  forecastCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    height: "100%",
  },
  forecastCount: { fontSize: 10, height: 14 },
  forecastBarBg: {
    width: 24,
    flex: 1,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  forecastBar: { width: "100%", borderRadius: 4 },
  forecastLabel: { fontSize: 10 },
  sessionsBadge: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  sessionsText: { fontSize: 13 },
});
