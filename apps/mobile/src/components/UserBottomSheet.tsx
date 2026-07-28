import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { AvatarRing } from './AvatarRing';
import { PowerTreeMini } from './PowerTreeMini';
import { rankToTier, tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface UserData {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  score: number;
}

interface TreeNode {
  id: string;
  displayName: string;
  tier: Tier;
}

interface Props {
  userId: string;
  communityId: string | null;
  subjectTag: string;
  currentUserId: string | null | undefined;
  onClose: () => void;
  onDelegate?: (targetUserId: string) => void;
  onAccredit?: (targetUserId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.65);

export function UserBottomSheet({
  userId,
  communityId,
  subjectTag,
  currentUserId,
  onClose,
  onDelegate,
  onAccredit,
}: Props) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isDelegating, setIsDelegating] = useState(false);
  const [upstream, setUpstream] = useState<TreeNode[]>([]);
  const [downstream, setDownstream] = useState<TreeNode[]>([]);
  const [totalUp, setTotalUp] = useState(0);
  const [totalDown, setTotalDown] = useState(0);

  const translateY = useSharedValue(SHEET_HEIGHT);

  async function fetchData() {
    if (!communityId) return;

    const [userRes, scoreRes, delRes, upRes, downRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', userId)
        .single(),
      // Subject-scoped scores (community_id IS NULL — see migration 035)
      supabase
        .from('accreditation_scores')
        .select('score, rank')
        .eq('user_id', userId)
        .eq('subject_tag', subjectTag)
        .is('community_id', null)
        .maybeSingle(),
      currentUserId
        ? supabase
            .from('delegations')
            .select('id')
            .eq('delegator_id', currentUserId)
            .eq('delegate_id', userId)
            .eq('subject_tag', subjectTag)
            .eq('active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('delegations')
        .select('delegator_id, users!delegator_id(id, display_name)')
        .eq('delegate_id', userId)
        .eq('subject_tag', subjectTag)
        .eq('active', true)
        .limit(5),
      supabase
        .from('delegations')
        .select('delegate_id, users!delegate_id(id, display_name)')
        .eq('delegator_id', userId)
        .eq('subject_tag', subjectTag)
        .eq('active', true)
        .limit(4),
    ]);

    if (userRes.data) {
      const rank = scoreRes.data?.rank ?? 0;
      const score = scoreRes.data?.score ?? 0;
      setUserData({
        id: userId,
        displayName: userRes.data.display_name,
        avatarUrl: userRes.data.avatar_url,
        tier: rankToTier(rank),
        score,
      });
    }

    setIsDelegating(!!delRes.data);

    if (upRes.data) {
      const nodes: TreeNode[] = upRes.data.map((d: any) => ({
        id: d.delegator_id,
        displayName: d.users?.display_name ?? 'Unknown',
        tier: 'bronze',
      }));
      setUpstream(nodes);
      setTotalUp(nodes.length);
    }

    if (downRes.data) {
      const nodes: TreeNode[] = downRes.data.map((d: any) => ({
        id: d.delegate_id,
        displayName: d.users?.display_name ?? 'Unknown',
        tier: 'bronze',
      }));
      setDownstream(nodes);
      setTotalDown(nodes.length);
    }
  }

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 280 });
    fetchData();
  }, [userId]);

  function dismiss() {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const isOwnProfile = userId === currentUserId;

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={dismiss} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            {userData ? (
              <AvatarRing
                size={56}
                tier={userData.tier}
                displayName={userData.displayName}
                avatarUrl={userData.avatarUrl}
              />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <Text style={styles.name}>{userData?.displayName ?? '…'}</Text>
            <Text style={styles.tierLine}>
              {userData
                ? `${userData.tier.toUpperCase()} · `
                : ''}
              <Text style={styles.score}>
                {Math.round(userData?.score ?? 0)} pts
              </Text>
            </Text>
          </View>

          {userData && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>POWER TREE</Text>
                <PowerTreeMini
                  upstream={upstream}
                  downstream={downstream}
                  centerTier={userData.tier}
                  totalUpstream={totalUp}
                  totalDownstream={totalDown}
                />
              </View>
            </>
          )}

          {!isOwnProfile && (
            <>
              <View style={styles.divider} />
              <View style={styles.ctaRow}>
                <Pressable
                  style={styles.ctaPrimary}
                  onPress={() => {
                    dismiss();
                    onDelegate?.(userId);
                  }}
                >
                  <Text style={styles.ctaPrimaryText}>
                    {isDelegating ? 'Change Delegation' : 'Delegate'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.ctaOutlined}
                  onPress={() => {
                    dismiss();
                    onAccredit?.(userId);
                  }}
                >
                  <Text style={styles.ctaOutlinedText}>Accredit</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2a2a2a',
  },
  name: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  tierLine: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 4,
  },
  score: {
    color: '#f5f5f5',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 8,
  },
  section: {
    paddingVertical: 12,
  },
  sectionLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  ctaPrimary: {
    flex: 1,
    height: 44,
    backgroundColor: '#b9f2ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: '600',
  },
  ctaOutlined: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b9f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlinedText: {
    color: '#b9f2ff',
    fontSize: 15,
    fontWeight: '600',
  },
});
