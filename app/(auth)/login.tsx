import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    }
    // No need to navigate — AuthContext detects the session and redirects automatically
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🌐</Text>
          <Text style={styles.logoText}>LinguaFlash</Text>
          <Text style={styles.logoSub}>Learn languages with smart flashcards</Text>
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
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  inner: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 28, gap: 28,
  },

  // Logo
  logoBox: { alignItems: 'center', gap: 8 },
  logoEmoji: { fontSize: 48 },
  logoText: {
    fontSize: 32, fontWeight: '800',
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
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Switch
  switchText: { textAlign: 'center', fontSize: 14, color: '#6b7280' },
  switchLink: { color: '#6366f1', fontWeight: '600' },
});