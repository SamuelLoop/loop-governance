import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { AvatarRing } from './AvatarRing';
import { PowerTreeMini } from './PowerTreeMini';
import { tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface TreeNode {
  id: string;
  displayName: string;
  tier: Tier;
}

interface Props {
  userId: string;
  communityId: string | null;
  subjectTag: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
}

const TIER_BOUNDS: Record<Tier, [number, number]> = {
  bronze:   [0,    0.65],
  silver:   [0.65, 0.85],
  gold:     [0.85, 0.95],
  platinum: [0.95, 0.99],
  diamond:  [0.99, 1.0],
};

function rankProgress(rank: number, tier: Tier): number {
  const [lo, hi] = TIER_BOUNDS[tier];
  if (hi <= lo) return 1;
  return Math.min(1, Math.max(0, (rank - lo) / (hi - lo)));
}

export function PowerCard({ userId, communityId, subjectTag, displayName, avatarUrl, tier }: Props) {
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [upstream, setUpstream] = useState<TreeNode[]>([]);
  const [downstream, setDownstream] = useState<TreeNode[]>([]);
  const [totalUp, setTotalUp] = useState(0);
  const [totalDown, setTotalDown] = useState(0);

  useEffect(() => {
    (async () => {
      const [scoreRes, upRes, downRes] = await Promise.all([
        // Subject-scoped scores (community_id IS NULL — see migration 035)
        supabase
          .from('accreditation_scores')
          .select('score, rank')
          .eq('user_id', userId)
          .eq('subject_tag', subjectTag)
          .is('community_id', null)
          .maybeSingle(),
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

      if (scoreRes.data) {
        setScore(scoreRes.data.score ?? 0);
        setProgress(rankProgress(scoreRes.data.rank ?? 0, tier));
      }

      if (upRes.data) {
        const nodes: TreeNode[] = upRes.data.map((d: any) => ({
          id: d.delegator_id,
          displayName: d.users?.display_name ?? 'Unknown',
          tier: 'bronze' as Tier,
        }));
        setUpstream(nodes);
        setTotalUp(nodes.length);
      }

      if (downRes.data) {
        const nodes: TreeNode[] = downRes.data.map((d: any) => ({
          id: d.delegate_id,
          displayName: d.users?.display_name ?? 'Unknown',
          tier: 'bronze' as Tier,
        }));
        setDownstream(nodes);
        setTotalDown(nodes.length);
      }
    })();
  }, [userId, subjectTag, tier]);

  const tierColor = tierColors[tier];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AvatarRing size={48} tier={tier} displayName={displayName} avatarUrl={avatarUrl} />
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.tierRow}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              {tier.toUpperCase()}
            </Text>
            <Text style={styles.score}>{Math.round(score)} pts</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: tierColor, width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.tree}>
        <PowerTreeMini
          upstream={upstream}
          downstream={downstream}
          centerTier={tier}
          totalUpstream={totalUp}
          totalDownstream={totalDown}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  score: {
    color: '#71717a',
    fontSize: 13,
  },
  track: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  tree: {
    marginTop: 12,
    alignItems: 'center',
  },
});
