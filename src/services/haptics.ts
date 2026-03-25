import * as Haptics from "expo-haptics";

export const haptics = {
  // Light tap — card flip, button press
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium tap — correct answer, rating buttons
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy tap — wrong answer, session complete
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success — streak milestone, all correct
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Error — wrong answer
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // Warning — card due soon
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
