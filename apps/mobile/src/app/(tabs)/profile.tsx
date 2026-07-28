import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SectionList,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useSubjectStore } from '../../stores/subjectStore';
import { AvatarRing } from '../../components/AvatarRing';
import { tierColors } from '../../utils/tier';
import { colors } from '../../theme/tokens';

const CONSOLE_BASE = 'https://console.loopcmbntr.live';

const SECONDARY_FEATURES = [
  { key: 'proposals', label: 'Proposals', path: '/proposals' },
  { key: 'elections', label: 'Elections', path: '/elections' },
  { key: 'earnings', label: 'Earnings', path: '/earnings' },
  { key: 'campaigns', label: 'Campaigns', path: '/campaigns' },
  { key: 'map', label: 'Map', path: '/map' },
  { key: 'badge', label: 'My badge', path: '/badge' },
];

function SettingsRow({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
      onPress={onPress}
    >
      <Text style={[styles.settingsLabel, destructive && styles.settingsLabelMuted]}>
        {label}
      </Text>
      {!destructive && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen() {
  const { profile, setProfile } = useAuthStore();
  const { communities, activeCommunityId, setActiveCommunity } = useSubjectStore();

  const activeCommunity = communities.find((c) => c.id === activeCommunityId);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  function openFeature(path: string) {
    Linking.openURL(`${CONSOLE_BASE}${path}`).catch(() =>
      Alert.alert('Error', 'Could not open link.')
    );
  }

  function cycleSubject() {
    if (communities.length < 2) return;
    const idx = communities.findIndex((c) => c.id === activeCommunityId);
    const next = communities[(idx + 1) % communities.length];
    setActiveCommunity(next.id);
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Not signed in</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tierColor = tierColors[profile.tier];

  const sections = [
    {
      title: 'ACCOUNT',
      data: [
        { key: 'subject', label: `Active subject: ${activeCommunity?.subject ?? 'None'}`, action: cycleSubject },
      ],
    },
    {
      title: 'MORE',
      data: SECONDARY_FEATURES.map((f) => ({
        key: f.key,
        label: f.label,
        action: () => openFeature(f.path),
      })),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + tier hero */}
        <View style={styles.hero}>
          <AvatarRing
            size={72}
            tier={profile.tier}
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
          />
          <Text style={styles.heroName}>{profile.displayName}</Text>
          <Text style={[styles.heroTier, { color: tierColor }]}>
            {profile.tier.toUpperCase()}
          </Text>
          <Text style={styles.heroScore}>{Math.round(profile.score)} pts</Text>
        </View>

        <View style={styles.divider} />

        {sections.map((section) => (
          <View key={section.title}>
            <SectionHeader title={section.title} />
            {section.data.map((item) => (
              <SettingsRow key={item.key} label={item.label} onPress={item.action} />
            ))}
            <View style={styles.divider} />
          </View>
        ))}

        <SettingsRow label="Sign out" onPress={signOut} destructive />
        <View style={styles.divider} />

        <View style={styles.bottomPad} />
      </ScrollView>
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
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroName: {
    color: '#f5f5f5',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  heroTier: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  heroScore: {
    color: '#f5f5f5',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  sectionHeader: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  settingsRowPressed: {
    backgroundColor: '#1e1e1e',
  },
  settingsLabel: {
    color: '#f5f5f5',
    fontSize: 14,
  },
  settingsLabelMuted: {
    color: '#71717a',
  },
  chevron: {
    color: '#71717a',
    fontSize: 18,
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
    height: 32,
  },
});
