import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface SettingsState {
  newCardLimit: number;
  setNewCardLimit: (n: number) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  newCardLimit: 5,

  loadSettings: async () => {
    const stored = await AsyncStorage.getItem("newCardLimit");
    if (stored) set({ newCardLimit: parseInt(stored, 10) });
  },

  setNewCardLimit: async (n: number) => {
    await AsyncStorage.setItem("newCardLimit", String(n));
    set({ newCardLimit: n });
  },
}));
