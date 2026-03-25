import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  username: string | null;
  nativeLang: string;
  targetLang: string;
  streak: number;
  longestStreak: number;
  lastActive: string | null;
}

interface AuthStore {
  // State
  profile: Profile | null;
  loading: boolean;

  // Actions
  loadProfile: (userId: string) => Promise<void>;
  updateStreak: (userId: string) => Promise<void>;
  updateTargetLang: (userId: string, lang: string) => Promise<void>;
  clearProfile: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  profile: null,
  loading: false,

  // ── Load profile from Supabase ────────────────────────────────────────────
  loadProfile: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      set({ loading: false });
      return;
    }

    set({
      profile: {
        id: data.id,
        username: data.username,
        nativeLang: data.native_lang,
        targetLang: data.target_lang,
        streak: data.streak,
        longestStreak: data.longest_streak,
        lastActive: data.last_active,
      },
      loading: false,
    });
  },

  // ── Update streak via Supabase stored procedure ───────────────────────────
  updateStreak: async (userId) => {
    await supabase.rpc('update_streak', { p_user_id: userId });

    // Reload profile to get updated streak
    const { data } = await supabase
      .from('profiles')
      .select('streak, longest_streak, last_active')
      .eq('id', userId)
      .single();

    if (data) {
      set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          streak: data.streak,
          longestStreak: data.longest_streak,
          lastActive: data.last_active,
        } : null,
      }));
    }
  },

  // ── Update target language ────────────────────────────────────────────────
  updateTargetLang: async (userId, lang) => {
    await supabase
      .from('profiles')
      .update({ target_lang: lang })
      .eq('id', userId);

    set((state) => ({
      profile: state.profile
        ? { ...state.profile, targetLang: lang }
        : null,
    }));
  },

  // ── Clear on sign out ─────────────────────────────────────────────────────
  clearProfile: () => {
    set({ profile: null });
  },
}));