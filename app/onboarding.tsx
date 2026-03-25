import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🌐",
    title: "Welcome to LinguaFlash",
    subtitle:
      "The smartest way to learn a new language — one flashcard at a time.",
    color: "#6366f1",
  },
  {
    emoji: "🧠",
    title: "Spaced Repetition",
    subtitle:
      "Our SM-2 algorithm schedules reviews at the perfect time so you never forget a word.",
    color: "#3b82f6",
  },
  {
    emoji: "🤖",
    title: "AI-Powered Hints",
    subtitle:
      "Stuck on a word? Get instant hints and grammar explanations powered by Claude AI.",
    color: "#8b5cf6",
  },
  {
    emoji: "📊",
    title: "Track Your Progress",
    subtitle:
      "Watch your retention rate climb as you build streaks and master your vocabulary.",
    color: "#22c55e",
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_W,
        animated: true,
      });
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    router.replace("/(auth)/login");
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleGetStarted}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View
              style={[
                styles.glowCircle,
                { backgroundColor: slide.color + "20" },
              ]}
            />
            <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            <Text style={[styles.slideTitle, { color: slide.color }]}>
              {slide.title}
            </Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
              i === activeIndex && { backgroundColor: slide.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.bottomRow}>
        {isLast ? (
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={handleGetStarted}
          >
            <Text style={styles.btnText}>Get Started →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: currentSlide.color }]}
            onPress={handleNext}
          >
            <Text style={styles.btnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f13" },
  scrollView: { flex: 1 },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    backgroundColor: "#18181f",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  skipText: { fontSize: 13, color: "#6b7280" },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 20,
  },
  glowCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  slideEmoji: { fontSize: 80 },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#27272a" },
  dotActive: { width: 24 },
  bottomRow: { paddingHorizontal: 24, paddingBottom: 40 },
  nextBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  getStartedBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
