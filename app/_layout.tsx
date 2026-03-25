import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { runMigrations } from "../src/db/database";
import { syncAll } from "../src/services/sync";
import { useAuthStore } from "../src/stores/authStore";
import { useCardStore } from "../src/stores/cardStore";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const { loadProfile } = useAuthStore();
  const { loadCards } = useCardStore();

  // Run DB migrations on startup
  useEffect(() => {
    runMigrations();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (loading) return;

    if (!session) {
      AsyncStorage.getItem("onboarding_complete").then((value) => {
        if (value === "true") {
          router.replace("/(auth)/login");
        } else {
          router.replace("/onboarding");
        }
      });
    } else {
      router.replace("/(tabs)");
    }
  }, [session, loading]);

  // Load profile and cards when session starts
  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id);
      loadCards();
      syncAll(session.user.id);
    }
  }, [session]);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => {
        router.push("/(tabs)/cards/review");
      },
    );
    return () => subscription.remove();
  }, []);

  // Schedule daily reminder when user logs in
  useEffect(() => {
    if (session?.user) {
      Notifications.requestPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          Notifications.cancelAllScheduledNotificationsAsync().then(() => {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "LinguaFlash 🌐",
                body: "Time to review your flashcards! 🧠",
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                hour: 9,
                minute: 0,
                repeats: true,
              },
            });
          });
        }
      });
    }
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
