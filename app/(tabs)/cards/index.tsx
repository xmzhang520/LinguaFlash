import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../src/context/ThemeContext";
import { deleteCard, getAllCards, suspendCard } from "../../../src/db/cards";
import { Card, getCardMaturity } from "../../../src/services/sr-engine";
import { useCardStore } from "../../../src/stores/cardStore";

const MATURITY_COLORS = {
  new: "#6366f1",
  learning: "#f59e0b",
  young: "#3b82f6",
  mature: "#22c55e",
};
const MATURITY_EMOJI = {
  new: "🌱",
  learning: "📖",
  young: "🌿",
  mature: "🌳",
};

export default function CardListScreen() {
  const { colors, isDark } = useTheme();
  const { loadCards } = useCardStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "new" | "learning" | "young" | "mature"
  >("all");

  useFocusEffect(
    useCallback(() => {
      loadAllCards();
    }, []),
  );

  const loadAllCards = () => setCards(getAllCards());

  const filtered = cards.filter((card) => {
    const matchesSearch =
      card.front.toLowerCase().includes(search.toLowerCase()) ||
      card.back.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || getCardMaturity(card) === filter;
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (card: Card) => {
    router.push({ pathname: "/(tabs)/cards/edit", params: { id: card.id } });
  };

  const handleDelete = (card: Card) => {
    Alert.alert(
      "Delete Card",
      `Delete "${card.front}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCard(card.id);
            loadAllCards();
            loadCards();
          },
        },
      ],
    );
  };

  const handleSuspend = (card: Card) => {
    Alert.alert(
      "Suspend Card",
      `Suspend "${card.front}"? It won't appear in reviews.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          onPress: () => {
            suspendCard(card.id);
            loadAllCards();
            loadCards();
          },
        },
      ],
    );
  };

  const renderCard = ({ item }: { item: Card }) => {
    const maturity = getCardMaturity(item);
    const color = MATURITY_COLORS[maturity];
    const emoji = MATURITY_EMOJI[maturity];
    const dueDate = item.nextReview.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });

    return (
      <TouchableOpacity
        style={[
          styles.cardRow,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
        onPress={() => handleEdit(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.cardAccent, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text
              style={[styles.cardFront, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.front}
            </Text>
            <View style={[styles.maturityBadge, { borderColor: color }]}>
              <Text style={styles.maturityEmoji}>{emoji}</Text>
              <Text style={[styles.maturityLabel, { color }]}>{maturity}</Text>
            </View>
          </View>
          <Text
            style={[styles.cardBack, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.back}
          </Text>
          <View style={styles.cardMeta}>
            {item.tags && item.tags.length > 0 && (
              <Text style={[styles.cardTags, { color: colors.textMuted }]}>
                {item.tags.join(" · ")}
              </Text>
            )}
            <Text style={[styles.cardDue, { color: colors.textMuted }]}>
              Due {dueDate}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleSuspend(item)}
          >
            <Text style={styles.actionBtnText}>⏸️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          My Cards
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(tabs)/cards/new")}
        >
          <Text style={styles.addBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholder="Search cards..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "new", "learning", "young", "mature"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              filter === f && {
                backgroundColor: colors.accentDark,
                borderColor: colors.accent,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: colors.textSecondary },
                filter === f && { color: colors.textAccent, fontWeight: "700" },
              ]}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={[styles.countText, { color: colors.textMuted }]}>
        {filtered.length} card{filtered.length !== 1 ? "s" : ""}
      </Text>

      {/* List / Empty */}
      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🃏</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No cards found
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search
              ? "Try a different search term"
              : "Add your first card to get started"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800" },
  addBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  searchRow: { paddingHorizontal: 24, marginBottom: 12 },
  searchInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12 },
  countText: { fontSize: 12, paddingHorizontal: 24, marginBottom: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 48, gap: 10 },
  cardRow: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 4 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardFront: { fontSize: 15, fontWeight: "700", flex: 1 },
  cardBack: { fontSize: 13 },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardTags: { fontSize: 11 },
  cardDue: { fontSize: 11 },
  maturityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  maturityEmoji: { fontSize: 10 },
  maturityLabel: { fontSize: 10, fontWeight: "600" },
  cardActions: {
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  actionBtn: { padding: 6 },
  actionBtnText: { fontSize: 16 },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyText: { fontSize: 13, textAlign: "center" },
});
