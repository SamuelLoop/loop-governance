import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/tokens';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code as string | undefined;

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(tabs)/chat');
        }
      });
    }
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.tier.gold} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
