import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Toast } from '../components/Toast';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { profile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: incoming delegation notifications
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`delegations:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delegations',
          filter: `delegate_id=eq.${profile.id}`,
        },
        async (payload: any) => {
          const delegatorId = payload.new?.delegator_id;
          let name = 'Someone';
          if (delegatorId) {
            const { data } = await supabase
              .from('users')
              .select('display_name')
              .eq('id', delegatorId)
              .single();
            if (data?.display_name) name = data.display_name;
          }
          setToastMsg(`${name} delegated to you`);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/chat');
    }
  }, [session, initialized, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
        </Stack>
        {toastMsg && (
          <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}
