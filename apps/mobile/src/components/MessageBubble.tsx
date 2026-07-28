import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AvatarRing } from './AvatarRing';
import type { ChatMessage, Tier } from '../types';
import { tierColors } from '../utils/tier';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onAvatarPress: (userId: string) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, isOwn, onAvatarPress }: Props) {
  const author = message.author;
  const tier: Tier = author?.tier ?? 'bronze';
  const tierColor = tierColors[tier];
  const displayName = author?.displayName ?? 'Unknown';

  if (isOwn) {
    return (
      <View style={styles.ownRow}>
        <View style={[styles.ownBubble, message.isOptimistic && styles.optimistic]}>
          <Text style={styles.content}>{message.content}</Text>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
        </View>
      </View>
    );
  }

  if (message.isLeadership) {
    return (
      <View
        style={[
          styles.leadershipBubble,
          {
            borderLeftColor: tierColor,
            backgroundColor: `${tierColor}14`,
          },
        ]}
      >
        <View style={styles.leaderHeader}>
          <AvatarRing
            size={36}
            tier={tier}
            displayName={displayName}
            avatarUrl={author?.avatarUrl}
            onPress={() => author && onAvatarPress(author.id)}
          />
          <Text style={styles.authorName}>{displayName}</Text>
          <View style={[styles.scorePill, { borderColor: tierColor }]}>
            <Text style={[styles.scoreText, { color: tierColor }]}>
              {Math.round(author?.score ?? 0)}
            </Text>
          </View>
        </View>
        <Text style={styles.content}>{message.content}</Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.communityRow}>
      <AvatarRing
        size={36}
        tier={tier}
        displayName={displayName}
        avatarUrl={author?.avatarUrl}
        onPress={() => author && onAvatarPress(author.id)}
      />
      <View style={styles.communityBubble}>
        <Text style={styles.authorName}>{displayName}</Text>
        <Text style={styles.content}>{message.content}</Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  ownBubble: {
    maxWidth: '80%',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 12,
  },
  optimistic: {
    opacity: 0.6,
  },
  leadershipBubble: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderLeftWidth: 2,
    borderRadius: 12,
    padding: 12,
  },
  leaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  communityBubble: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 12,
  },
  authorName: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  content: {
    color: '#f5f5f5',
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    color: '#3f3f46',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  scorePill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  scoreText: {
    fontSize: 11,
  },
});
