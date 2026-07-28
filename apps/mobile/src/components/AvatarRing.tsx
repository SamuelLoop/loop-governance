import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { Tier } from '../types';
import { tierColors, tierRingWidth, getInitials } from '../utils/tier';

interface Props {
  size: number;
  tier: Tier;
  displayName: string;
  avatarUrl?: string | null;
  onPress?: () => void;
  showAccreditation?: boolean;
}

export function AvatarRing({
  size,
  tier,
  displayName,
  avatarUrl,
  onPress,
  showAccreditation,
}: Props) {
  const ringColor = tierColors[tier];
  const ringWidth = tierRingWidth[tier];
  const shimmer = useSharedValue(1);

  useEffect(() => {
    if (tier === 'diamond') {
      shimmer.value = withRepeat(
        withSequence(
          withTiming(0.7, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.0, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      shimmer.value = 1;
    }
  }, [tier]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
    borderColor: ringColor,
  }));

  const initials = getInitials(displayName);
  const totalSize = size + ringWidth * 2 + 4;

  return (
    <Pressable
      onPress={onPress}
      style={{ width: totalSize, height: totalSize }}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.ring,
          shimmerStyle,
          {
            width: totalSize,
            height: totalSize,
            borderRadius: totalSize / 2,
            borderWidth: ringWidth,
            padding: 2,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
            {initials}
          </Text>
        </View>
      </Animated.View>
      {showAccreditation && (
        <View
          style={[
            styles.badge,
            { backgroundColor: ringColor },
          ]}
        >
          <Text style={styles.badgeCheck}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#f5f5f5',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheck: {
    color: '#0a0a0a',
    fontSize: 8,
    fontWeight: '700',
  },
});
