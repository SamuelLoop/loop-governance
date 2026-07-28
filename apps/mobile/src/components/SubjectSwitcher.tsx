import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import type { Community } from '../types';

interface Props {
  communities: Community[];
  activeCommunityId: string | null;
  onSelect: (communityId: string) => void;
}

const MAX_VISIBLE = 5;

export function SubjectSwitcher({ communities, activeCommunityId, onSelect }: Props) {
  const visible = communities.slice(0, MAX_VISIBLE);
  const overflowCount = communities.length - MAX_VISIBLE;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {visible.map((c) => {
        const isActive = c.id === activeCommunityId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isActive ? styles.textActive : styles.textInactive,
              ]}
            >
              {c.subject}
            </Text>
          </Pressable>
        );
      })}
      {overflowCount > 0 && (
        <View style={[styles.pill, styles.pillInactive]}>
          <Text style={styles.textInactive}>+{overflowCount}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: 'rgba(185, 242, 255, 0.10)',
    borderColor: '#b9f2ff',
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: '#2a2a2a',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  textActive: {
    color: '#b9f2ff',
  },
  textInactive: {
    color: '#71717a',
  },
});
