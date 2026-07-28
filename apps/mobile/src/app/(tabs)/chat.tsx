import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useSubjectStore } from '../../stores/subjectStore';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { SubjectSwitcher } from '../../components/SubjectSwitcher';
import { PowerBar } from '../../components/PowerBar';
import { MessageFeed } from '../../components/MessageFeed';
import { MessageInput } from '../../components/MessageInput';
import { UserBottomSheet } from '../../components/UserBottomSheet';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { GivePowerSheet } from '../../components/GivePowerSheet';
import { rankToTier } from '../../utils/tier';
import type { Community } from '../../types';

export default function ChatScreen() {
  const { communities, activeCommunityId, setCommunities, setActiveCommunity } =
    useSubjectStore();
  const { messages, isLoading } = useChatStore();
  const { profile, setProfile } = useAuthStore();
  const [showLeaders, setShowLeaders] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [givePowerTarget, setGivePowerTarget] = useState<{
    userId: string;
    mode: 'delegate' | 'accredit';
  } | null>(null);

  // Load the current user's profile from the users table
  useEffect(() => {
    if (profile) return;
    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: user } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('auth_id', session.user.id)
        .single();

      if (!user) return;

      const { data: sc } = await supabase
        .from('accreditation_scores')
        .select('score, rank')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      setProfile({
        id: user.id,
        authId: session.user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        tier: rankToTier(sc?.rank ?? 0),
        score: sc?.score ?? 0,
      });
    }
    loadProfile();
  }, []);

  // Load communities the user belongs to
  useEffect(() => {
    if (!profile) return;
    async function loadCommunities() {
      const { data } = await supabase
        .from('community_memberships')
        .select('communities(id, name, subject)')
        .eq('user_id', profile!.id)
        .limit(5);

      if (!data) return;

      const cs: Community[] = data
        .map((m: any) => m.communities)
        .filter(Boolean)
        .map((c: any) => ({ id: c.id, name: c.name, subject: c.subject }));

      setCommunities(cs);
      if (cs.length > 0 && !activeCommunityId) {
        setActiveCommunity(cs[0].id);
      }
    }
    loadCommunities();
  }, [profile?.id]);

  // Realtime subscription for active community
  useRealtimeChannel(activeCommunityId, profile?.id);

  const filteredMessages = showLeaders
    ? messages.filter((m) => m.isLeadership)
    : messages;

  const activeSubject =
    communities.find((c) => c.id === activeCommunityId)?.subject ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Pressable
          onPress={() => setShowLeaders((v) => !v)}
          style={styles.toggle}
        >
          <View style={[styles.toggleHalf, !showLeaders && styles.toggleActive]}>
            <Text
              style={[
                styles.toggleText,
                !showLeaders && styles.toggleTextActive,
              ]}
            >
              All
            </Text>
          </View>
          <View style={[styles.toggleHalf, showLeaders && styles.toggleActive]}>
            <Text
              style={[
                styles.toggleText,
                showLeaders && styles.toggleTextActive,
              ]}
            >
              Leaders
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Subject switcher */}
      <SubjectSwitcher
        communities={communities}
        activeCommunityId={activeCommunityId}
        onSelect={setActiveCommunity}
      />

      {/* Divider + Power bar */}
      <View style={styles.divider} />
      <PowerBar subjectTag={activeSubject} />

      {/* Message feed */}
      <View style={styles.feed}>
        <MessageFeed
          messages={filteredMessages}
          currentUserId={profile?.id}
          isLoading={isLoading}
          onAvatarPress={setSelectedUserId}
        />
      </View>

      {/* Composer */}
      <MessageInput
        communityId={activeCommunityId}
        currentUserId={profile?.id}
      />

      {/* User bottom sheet */}
      {selectedUserId && (
        <UserBottomSheet
          userId={selectedUserId}
          communityId={activeCommunityId}
          subjectTag={activeSubject}
          currentUserId={profile?.id}
          onClose={() => setSelectedUserId(null)}
          onDelegate={(uid) => setGivePowerTarget({ userId: uid, mode: 'delegate' })}
          onAccredit={(uid) => setGivePowerTarget({ userId: uid, mode: 'accredit' })}
        />
      )}

      {/* Give Power sheet (from UserBottomSheet delegate/accredit) */}
      {givePowerTarget && profile && (
        <GivePowerSheet
          currentUserId={profile.id}
          communityId={activeCommunityId}
          activeSubject={activeSubject}
          targetUserId={givePowerTarget.userId}
          initialMode={givePowerTarget.mode}
          onClose={() => setGivePowerTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#f5f5f5',
    fontSize: 20,
    fontWeight: '600',
  },
  toggle: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  toggleHalf: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
  },
  toggleText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#b9f2ff',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  feed: {
    flex: 1,
  },
});
