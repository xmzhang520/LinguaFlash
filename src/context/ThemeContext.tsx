import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof darkColors;
}

export const darkColors = {
  // Backgrounds
  bg: "#0f0f13",
  bgCard: "#18181f",
  bgCardAlt: "#1a1a2e",
  bgInput: "#18181f",

  // Borders
  border: "#27272a",
  borderAlt: "#312e81",

  // Text
  textPrimary: "#f9fafb",
  textSecondary: "#6b7280",
  textMuted: "#4b5563",
  textAccent: "#a5b4fc",

  // Brand
  accent: "#6366f1",
  accentDark: "#1e1b4b",
  accentBorder: "#4338ca",

  // Status
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  // Tab bar
  tabBar: "#0f0f13",
  tabBorder: "#1f2937",
};

export const lightColors: typeof darkColors = {
  // Backgrounds
  bg: "#f8fafc",
  bgCard: "#ffffff",
  bgCardAlt: "#eff6ff",
  bgInput: "#f1f5f9",

  // Borders
  border: "#e2e8f0",
  borderAlt: "#c7d2fe",

  // Text
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textAccent: "#4f46e5",

  // Brand
  accent: "#6366f1",
  accentDark: "#eef2ff",
  accentBorder: "#818cf8",

  // Status
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  info: "#2563eb",

  // Tab bar
  tabBar: "#ffffff",
  tabBorder: "#e2e8f0",
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>("dark");

  // Load saved theme on startup
  useEffect(() => {
    AsyncStorage.getItem("app_theme").then((saved) => {
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      } else {
        // Default to system theme
        setTheme(systemScheme === "light" ? "light" : "dark");
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await AsyncStorage.setItem("app_theme", next);
  };

  const colors = theme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{ theme, isDark: theme === "dark", toggleTheme, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
