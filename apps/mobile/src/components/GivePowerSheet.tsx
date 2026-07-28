import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { AvatarRing } from './AvatarRing';
import { rankToTier, tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface SearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
}

interface Props {
  currentUserId: string;
  communityId: string | null;
  activeSubject: string;
  targetUserId?: string;
  initialMode?: 'delegate' | 'accredit';
  onClose: () => void;
  onSuccess?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

export function GivePowerSheet({
  currentUserId,
  communityId,
  activeSubject,
  targetUserId,
  initialMode,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<'search' | 'confirm'>(
    targetUserId ? 'confirm' : 'search'
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 280 });
  }, []);

  // Load pre-selected target user
  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', targetUserId)
        .single();
      if (data) {
        setSelected({
          id: data.id,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          tier: 'bronze',
        });
      }
    })();
  }, [targetUserId]);

  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [step]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (data) {
        setResults(
          data.map((u: any) => ({
            id: u.id,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            tier: 'bronze' as Tier,
          }))
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function dismiss() {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }

  function selectUser(user: SearchResult) {
    setSelected(user);
    setStep('confirm');
  }

  async function delegate() {
    if (!selected || !communityId) return;
    setLoading(true);
    const { error } = await supabase.from('delegations').insert({
      delegator_id: currentUserId,
      delegate_id: selected.id,
      subject_tag: activeSubject,
      community_id: communityId,
      active: true,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    onSuccess?.();
    dismiss();
  }

  async function accredit() {
    if (!selected) return;
    setLoading(true);
    const { error } = await supabase.from('accreditations').insert({
      giver_id: currentUserId,
      receiver_id: selected.id,
      subject_tag: activeSubject,
      weight: 1,
      active: true,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    onSuccess?.();
    dismiss();
  }

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const tierColor = selected ? tierColors[selected.tier] : '#b9f2ff';

  return (
    <Modal transparent animationType="none" visible onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={dismiss} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        {step === 'search' && (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Give Power</Text>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search by name…"
              placeholderTextColor="#3f3f46"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.resultRow} onPress={() => selectUser(item)}>
                  <AvatarRing
                    size={36}
                    tier={item.tier}
                    displayName={item.displayName}
                    avatarUrl={item.avatarUrl}
                  />
                  <Text style={styles.resultName}>{item.displayName}</Text>
                </Pressable>
              )}
              style={styles.resultList}
            />
          </View>
        )}

        {step === 'confirm' && selected && (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Give Power</Text>
            <View style={styles.selectedUser}>
              <AvatarRing
                size={56}
                tier={selected.tier}
                displayName={selected.displayName}
                avatarUrl={selected.avatarUrl}
              />
              <Text style={styles.selectedName}>{selected.displayName}</Text>
              <Text style={styles.selectedSub}>in {activeSubject || 'this community'}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, styles.delegateBtn, loading && styles.disabled]}
                onPress={delegate}
                disabled={loading}
              >
                <Text style={styles.delegateBtnText}>Delegate</Text>
                <Text style={styles.actionHint}>Pass your vote weight</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.accreditBtn, loading && styles.disabled]}
                onPress={accredit}
                disabled={loading}
              >
                <Text style={styles.accreditBtnText}>Accredit</Text>
                <Text style={[styles.actionHint, { color: '#71717a' }]}>Vouch for expertise</Text>
              </Pressable>
            </View>

            {!targetUserId && (
              <Pressable onPress={() => setStep('search')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Change person</Text>
              </Pressable>
            )}
          </View>
        )}
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
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  stepTitle: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f5f5f5',
    fontSize: 15,
    marginBottom: 12,
  },
  resultList: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  resultName: {
    color: '#f5f5f5',
    fontSize: 15,
  },
  selectedUser: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  selectedName: {
    color: '#f5f5f5',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  selectedSub: {
    color: '#71717a',
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delegateBtn: {
    backgroundColor: '#f59e0b',
  },
  delegateBtnText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
  accreditBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#b9f2ff',
  },
  accreditBtnText: {
    color: '#b9f2ff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionHint: {
    color: 'rgba(10,10,10,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  backLink: {
    alignItems: 'center',
    paddingTop: 16,
  },
  backLinkText: {
    color: '#71717a',
    fontSize: 14,
  },
});
