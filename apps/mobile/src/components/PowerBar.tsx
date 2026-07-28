import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface TierCounts {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
}

interface Props {
  subjectTag: string;
}

const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const DEFAULT_COUNTS: TierCounts = { bronze: 1, silver: 1, gold: 1, platinum: 1, diamond: 1 };

function AnimatedSegment({ color, flex: targetFlex }: { color: string; flex: number }) {
  const animFlex = useSharedValue(targetFlex);

  useEffect(() => {
    animFlex.value = withTiming(targetFlex, { duration: 300 });
  }, [targetFlex]);

  const style = useAnimatedStyle(() => ({ flex: animFlex.value }));

  return <Animated.View style={[{ backgroundColor: color }, style]} />;
}

export function PowerBar({ subjectTag }: Props) {
  const [counts, setCounts] = useState<TierCounts>(DEFAULT_COUNTS);

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase
        .from('accreditation_scores')
        .select('rank')
        .eq('subject_tag', subjectTag)
        .is('community_id', null);

      if (!data || data.length === 0) return;

      const c: TierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
      for (const row of data) {
        const r = row.rank as number;
        if (r >= 0.99) c.diamond++;
        else if (r >= 0.95) c.platinum++;
        else if (r >= 0.85) c.gold++;
        else if (r >= 0.65) c.silver++;
        else c.bronze++;
      }
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      if (total > 0) setCounts(c);
    }

    fetchCounts();
  }, [subjectTag]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.bar}>
      {TIER_ORDER.map((tier) => (
        <AnimatedSegment
          key={tier}
          color={tierColors[tier]}
          flex={total > 0 ? counts[tier] / total : 0.2}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 12,
    flexDirection: 'row',
    width: '100%',
  },
});
