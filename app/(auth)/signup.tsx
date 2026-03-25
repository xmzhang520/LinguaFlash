import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';

const LANGUAGES = [
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'jp', label: '🇯🇵 Japanese' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
];

export default function SignupScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [targetLang, setTargetLang] = useState('es');
  const [loading, setLoading]   = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { target_lang: targetLang, native_lang: 'en' },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup failed', error.message);
    }
    // AuthContext detects the new session and redirects automatically
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🌐</Text>
          <Text style={styles.logoText}>Create Account</Text>
          <Text style={styles.logoSub}>Start learning a new language today</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Language picker */}
          <Text style={styles.label}>I want to learn</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  targetLang === lang.code && styles.langBtnActive,
                ]}
                onPress={() => setTargetLang(lang.code)}
              >
                <Text style={[
                  styles.langBtnText,
                  targetLang === lang.code && styles.langBtnTextActive,
                ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Login link */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  inner: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 48, gap: 28,
  },

  // Header
  logoBox: { alignItems: 'center', gap: 8 },
  logoEmoji: { fontSize: 48 },
  logoText: {
    fontSize: 28, fontWeight: '800',
    color: '#f9fafb', letterSpacing: -0.5,
  },
  logoSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  // Form
  form: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: -4 },
  input: {
    backgroundColor: '#18181f',
    borderWidth: 1, borderColor: '#27272a',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: '#f9fafb',
  },

  // Language grid
  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4,
  },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#18181f',
    borderWidth: 1, borderColor: '#27272a',
  },
  langBtnActive: {
    backgroundColor: '#1e1b4b',
    borderColor: '#6366f1',
  },
  langBtnText: { fontSize: 13, color: '#6b7280' },
  langBtnTextActive: { color: '#a5b4fc', fontWeight: '600' },

  // Button
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Switch
  switchText: { textAlign: 'center', fontSize: 14, color: '#6b7280' },
  switchLink: { color: '#6366f1', fontWeight: '600' },
});