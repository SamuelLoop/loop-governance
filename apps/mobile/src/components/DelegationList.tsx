import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { supabase } from '../lib/supabase';
import { AvatarRing } from './AvatarRing';
import { rankToTier, tierColors } from '../utils/tier';
import type { Tier } from '../types';

interface DelegationRow {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  communityId: string;
}

interface Props {
  userId: string;
  communityId: string | null;
}

function RevokeAction({ onRevoke }: { onRevoke: () => void }) {
  return (
    <Pressable style={styles.revokeBtn} onPress={onRevoke}>
      <Text style={styles.revokeText}>Revoke</Text>
    </Pressable>
  );
}

function DelegRow({
  row,
  onRevoke,
}: {
  row: DelegationRow;
  onRevoke?: (id: string) => void;
}) {
  const tierColor = tierColors[row.tier];
  const inner = (
    <View style={styles.row}>
      <Text style={styles.arrow}>{onRevoke ? '→' : '←'}</Text>
      <AvatarRing size={32} tier={row.tier} displayName={row.displayName} avatarUrl={row.avatarUrl} />
      <Text style={styles.rowName}>{row.displayName}</Text>
      <View style={[styles.tierPill, { borderColor: tierColor }]}>
        <Text style={[styles.tierPillText, { color: tierColor }]}>{row.tier.toUpperCase()}</Text>
      </View>
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

export function DelegationList({ userId, communityId }: Props) {
  const [outgoing, setOutgoing] = useState<DelegationRow[]>([]);
  const [incoming, setIncoming] = useState<DelegationRow[]>([]);
  const [incomingExpanded, setIncomingExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) return;
    const [outRes, inRes] = await Promise.all([
      supabase
        .from('delegations')
        .select('id, community_id, users!delegate_id(id, display_name, avatar_url)')
        .eq('delegator_id', userId)
        .eq('community_id', communityId)
        .eq('active', true),
      supabase
        .from('delegations')
        .select('id, community_id, users!delegator_id(id, display_name, avatar_url)')
        .eq('delegate_id', userId)
        .eq('community_id', communityId)
        .eq('active', true),
    ]);

    if (outRes.data) {
      setOutgoing(
        outRes.data.map((d: any) => ({
          id: d.id,
          displayName: d.users?.display_name ?? 'Unknown',
          avatarUrl: d.users?.avatar_url ?? null,
          tier: rankToTier(0),
          communityId: d.community_id,
        }))
      );
    }

    if (inRes.data) {
      setIncoming(
        inRes.data.map((d: any) => ({
          id: d.id,
          displayName: d.users?.display_name ?? 'Unknown',
          avatarUrl: d.users?.avatar_url ?? null,
          tier: rankToTier(0),
          communityId: d.community_id,
        }))
      );
    }
  }, [userId, communityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(delegationId: string) {
    setOutgoing((prev) => prev.filter((d) => d.id !== delegationId));
    const { error } = await supabase
      .from('delegations')
      .update({ active: false })
      .eq('id', delegationId);
    if (error) {
      Alert.alert('Error', 'Could not revoke delegation. Please try again.');
      load();
    }
  }

  const visibleIncoming = incomingExpanded ? incoming : incoming.slice(0, 2);

  return (
    <View>
      <Text style={styles.sectionLabel}>DELEGATIONS</Text>

      {outgoing.length === 0 ? (
        <Text style={styles.empty}>No active delegations</Text>
      ) : (
        outgoing.map((row) => (
          <DelegRow key={row.id} row={row} onRevoke={revoke} />
        ))
      )}

      {incoming.length > 0 && (
        <>
          <Pressable
            style={styles.incomingHeader}
            onPress={() => setIncomingExpanded((v) => !v)}
          >
            <Text style={styles.incomingHeaderText}>
              Delegating to you ({incoming.length})
            </Text>
            <Text style={styles.incomingChevron}>
              {incomingExpanded ? '▾' : '▸'}
            </Text>
          </Pressable>
          {visibleIncoming.map((row) => (
            <DelegRow key={row.id} row={row} />
          ))}
          {!incomingExpanded && incoming.length > 2 && (
            <Text style={styles.moreText}>+{incoming.length - 2} more</Text>
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
  rowName: {
    flex: 1,
    color: '#f5f5f5',
    fontSize: 15,
  },
  tierPill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
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
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  incomingHeaderText: {
    color: '#71717a',
    fontSize: 14,
  },
  incomingChevron: {
    color: '#71717a',
    fontSize: 14,
  },
  empty: {
    color: '#3f3f46',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  moreText: {
    color: '#71717a',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
