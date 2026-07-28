import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { supabase } from '../lib/supabase';
import { AvatarRing } from './AvatarRing';
import { rankToTier, tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface AccredRow {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  subjectTag: string;
  weight: number;
}

interface Props {
  userId: string;
  activeSubject: string;
}

function RevokeAction({ onRevoke }: { onRevoke: () => void }) {
  return (
    <Pressable style={styles.revokeBtn} onPress={onRevoke}>
      <Text style={styles.revokeText}>Revoke</Text>
    </Pressable>
  );
}

function AccredRow({
  row,
  direction,
  onRevoke,
}: {
  row: AccredRow;
  direction: 'given' | 'received';
  onRevoke?: (id: string) => void;
}) {
  const tierColor = tierColors[row.tier];
  const inner = (
    <View style={styles.row}>
      <Text style={styles.arrow}>{direction === 'given' ? '→' : '←'}</Text>
      <AvatarRing size={32} tier={row.tier} displayName={row.displayName} avatarUrl={row.avatarUrl} />
      <View style={styles.rowMid}>
        <Text style={styles.rowName}>{row.displayName}</Text>
        <Text style={styles.rowSubject}>{row.subjectTag}</Text>
      </View>
      {row.weight > 1 && (
        <Text style={styles.weight}>×{row.weight}</Text>
      )}
    </View>
  );

  if (!onRevoke) return inner;

  return (
    <Swipeable
      renderRightActions={() => (
        <RevokeAction onRevoke={() => onRevoke(row.id)} />
      )}
      rightThreshold={50}
    >
      {inner}
    </Swipeable>
  );
}

export function AccreditationList({ userId, activeSubject }: Props) {
  const [given, setGiven] = useState<AccredRow[]>([]);
  const [received, setReceived] = useState<AccredRow[]>([]);
  const [receivedExpanded, setReceivedExpanded] = useState(false);

  const load = useCallback(async () => {
    const [givenRes, receivedRes] = await Promise.all([
      supabase
        .from('accreditations')
        .select('id, subject_tag, weight, active, users!receiver_id(id, display_name, avatar_url)')
        .eq('giver_id', userId)
        .eq('active', true)
        .eq('subject_tag', activeSubject),
      supabase
        .from('accreditations')
        .select('id, subject_tag, weight, active, users!giver_id(id, display_name, avatar_url)')
        .eq('receiver_id', userId)
        .eq('active', true)
        .eq('subject_tag', activeSubject),
    ]);

    if (givenRes.data) {
      setGiven(
        givenRes.data.map((a: any) => ({
          id: a.id,
          displayName: a.users?.display_name ?? 'Unknown',
          avatarUrl: a.users?.avatar_url ?? null,
          tier: rankToTier(0),
          subjectTag: a.subject_tag,
          weight: a.weight ?? 1,
        }))
      );
    }

    if (receivedRes.data) {
      setReceived(
        receivedRes.data.map((a: any) => ({
          id: a.id,
          displayName: a.users?.display_name ?? 'Unknown',
          avatarUrl: a.users?.avatar_url ?? null,
          tier: rankToTier(0),
          subjectTag: a.subject_tag,
          weight: a.weight ?? 1,
        }))
      );
    }
  }, [userId, activeSubject]);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(accreditationId: string) {
    setGiven((prev) => prev.filter((a) => a.id !== accreditationId));
    const { error } = await supabase
      .from('accreditations')
      .update({ active: false })
      .eq('id', accreditationId);
    if (error) {
      Alert.alert('Error', 'Could not revoke accreditation. Please try again.');
      load();
    }
  }

  const visibleReceived = receivedExpanded ? received : received.slice(0, 2);

  if (given.length === 0 && received.length === 0) return null;

  return (
    <View>
      <Text style={styles.sectionLabel}>ACCREDITATIONS</Text>

      {given.map((row) => (
        <AccredRow key={row.id} row={row} direction="given" onRevoke={revoke} />
      ))}

      {received.length > 0 && (
        <>
          <Pressable
            style={styles.receivedHeader}
            onPress={() => setReceivedExpanded((v) => !v)}
          >
            <Text style={styles.receivedHeaderText}>
              Accrediting you ({received.length})
            </Text>
            <Text style={styles.chevron}>{receivedExpanded ? '▾' : '▸'}</Text>
          </Pressable>
          {visibleReceived.map((row) => (
            <AccredRow key={row.id} row={row} direction="received" />
          ))}
          {!receivedExpanded && received.length > 2 && (
            <Text style={styles.moreText}>+{received.length - 2} more</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#0a0a0a',
  },
  arrow: {
    color: '#b9f2ff',
    fontSize: 16,
    width: 16,
  },
  rowMid: {
    flex: 1,
  },
  rowName: {
    color: '#f5f5f5',
    fontSize: 15,
  },
  rowSubject: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 1,
  },
  weight: {
    color: '#71717a',
    fontSize: 13,
  },
  revokeBtn: {
    backgroundColor: '#ef4444',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  receivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  receivedHeaderText: {
    color: '#71717a',
    fontSize: 14,
  },
  chevron: {
    color: '#71717a',
    fontSize: 14,
  },
  moreText: {
    color: '#71717a',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
