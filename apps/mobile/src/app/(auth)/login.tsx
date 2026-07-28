import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, spacing, fontSize, radius } from '../../theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    const redirectTo = Linking.createURL('/auth/callback');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>Loop</Text>
      <Text style={styles.subtitle}>Governance</Text>

      {sent ? (
        <View style={styles.sentBox}>
          <Text style={styles.sentText}>Check your email for the magic link.</Text>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.text.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendMagicLink}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send magic link'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  wordmark: {
    color: colors.text.primary,
    fontSize: fontSize.hero,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: fontSize.md,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.xxl * 2,
  },
  form: {
    width: '100%',
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text.primary,
    fontSize: fontSize.md,
  },
  button: {
    backgroundColor: colors.tier.gold,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sentBox: {
    padding: spacing.xl,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sentText: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
