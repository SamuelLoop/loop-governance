import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useSubjectStore } from '../../stores/subjectStore';
import { PowerCard } from '../../components/PowerCard';
import { DelegationList } from '../../components/DelegationList';
import { AccreditationList } from '../../components/AccreditationList';
import { GivePowerSheet } from '../../components/GivePowerSheet';
import { colors } from '../../theme/tokens';

export default function PowerScreen() {
  const { profile } = useAuthStore();
  const { communities, activeCommunityId } = useSubjectStore();
  const [showGivePower, setShowGivePower] = useState(false);

  const activeSubject =
    communities.find((c) => c.id === activeCommunityId)?.subject ?? '';

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Power</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sign in to see your power</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Power</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <PowerCard
          userId={profile.id}
          communityId={activeCommunityId}
          subjectTag={activeSubject}
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          tier={profile.tier}
        />

        <DelegationList userId={profile.id} communityId={activeCommunityId} />

        <AccreditationList userId={profile.id} activeSubject={activeSubject} />

        <View style={styles.bottomPad} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.givePowerBtn}
          onPress={() => setShowGivePower(true)}
        >
          <Text style={styles.givePowerText}>+ Give Power</Text>
        </Pressable>
      </View>

      {showGivePower && profile && (
        <GivePowerSheet
          currentUserId={profile.id}
          communityId={activeCommunityId}
          activeSubject={activeSubject}
          onClose={() => setShowGivePower(false)}
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
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#f5f5f5',
    fontSize: 20,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#0a0a0a',
  },
  givePowerBtn: {
    backgroundColor: '#b9f2ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  givePowerText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.text.muted,
  },
  bottomPad: {
    height: 8,
  },
});
