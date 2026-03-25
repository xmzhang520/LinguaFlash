import * as Notifications from "expo-notifications";

// ── Configure how notifications appear ───────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // ← add this
    shouldShowList: true, // ← add this
  }),
});

// ── Request permissions ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Schedule daily reminder ───────────────────────────────────────────────────

export async function scheduleDailyReminder(
  hour: number = 9,
  minute: number = 0,
  dueCount: number = 0,
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    // Cancel any existing reminders first
    await cancelDailyReminder();

    const body =
      dueCount > 0
        ? `You have ${dueCount} card${dueCount !== 1 ? "s" : ""} due for review today! 🧠`
        : "Time to practice your flashcards! 🧠";

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "LinguaFlash 🌐",
        body,
        sound: true,
        badge: dueCount,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });

    return id;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

// ── Cancel daily reminder ─────────────────────────────────────────────────────

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Get all scheduled notifications ──────────────────────────────────────────

export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ── Handle notification tap ───────────────────────────────────────────────────

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
