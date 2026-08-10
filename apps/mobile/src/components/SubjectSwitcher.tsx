import React, { useEffect, useState } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import type { Community } from '../types';

interface Props {
  communities: Community[];
  activeCommunityId: string | null;
  onSelect: (communityId: string) => void;
}

export function SubjectSwitcher({ communities, activeCommunityId, onSelect }: Props) {
  const activeSubjectFromId =
    communities.find((c) => c.id === activeCommunityId)?.subject ?? null;

  const [activeSubject, setActiveSubject] = useState<string | null>(activeSubjectFromId);

  // Sync if the active community changes externally
  useEffect(() => {
    if (activeSubjectFromId) setActiveSubject(activeSubjectFromId);
  }, [activeSubjectFromId]);

  // Unique subjects in membership order
  const subjects = Array.from(new Set(communities.map((c) => c.subject)));

  // Communities belonging to the active subject
  const regionCommunities = communities.filter((c) => c.subject === activeSubject);

  function handleSubjectPress(subject: string) {
    setActiveSubject(subject);
    const first = communities.find((c) => c.subject === subject);
    if (first) onSelect(first.id);
  }

  if (communities.length === 0) return null;

  return (
    <View>
      {/* Subject row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.row}
      >
        {subjects.map((subject) => {
          const isActive = subject === activeSubject;
          return (
            <Pressable
              key={subject}
              onPress={() => handleSubjectPress(subject)}
              style={[styles.pill, isActive ? styles.pillActiveSubject : styles.pillInactive]}
            >
              <Text style={[styles.pillText, isActive ? styles.textActiveSubject : styles.textInactive]}>
                {subject}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Region row — only shown when the active subject has multiple communities */}
      {regionCommunities.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={[styles.row, styles.regionRow]}
        >
          {regionCommunities.map((c) => {
            const isActive = c.id === activeCommunityId;
            return (
              <Pressable
                key={c.id}
                onPress={() => onSelect(c.id)}
                style={[styles.regionPill, isActive ? styles.regionPillActive : styles.regionPillInactive]}
              >
                <Text style={[styles.regionText, isActive ? styles.regionTextActive : styles.regionTextInactive]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionRow: {
    paddingTop: 0,
    paddingBottom: 6,
  },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActiveSubject: {
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
  textActiveSubject: {
    color: '#b9f2ff',
  },
  textInactive: {
    color: '#71717a',
  },
  regionPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
  },
  regionPillInactive: {
    backgroundColor: 'transparent',
    borderColor: '#3f3f46',
  },
  regionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  regionTextActive: {
    color: '#f59e0b',
  },
  regionTextInactive: {
    color: '#52525b',
  },
});
