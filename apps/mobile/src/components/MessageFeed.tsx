import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null | undefined;
  isLoading: boolean;
  onAvatarPress: (userId: string) => void;
}

function SkeletonRow({ width }: { width: DimensionValue }) {
  return (
    <View style={[styles.skeletonRow, { alignSelf: 'flex-start' }]}>
      <View style={styles.skeletonAvatar} />
      <View style={[styles.skeletonBubble, { width }]} />
    </View>
  );
}

export function MessageFeed({
  messages,
  currentUserId,
  isLoading,
  onAvatarPress,
}: Props) {
  // messages is stored newest-first (see chatStore); FlashList's
  // maintainVisibleContentPosition expects chronological order and anchors
  // scroll to the bottom itself, unlike the old `inverted` prop.
  const chronological = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isOwn={item.authorId === currentUserId}
        onAvatarPress={onAvatarPress}
      />
    ),
    [currentUserId, onAvatarPress]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonRow width="65%" />
        <SkeletonRow width="80%" />
        <SkeletonRow width="55%" />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>
          No messages yet. Start the conversation.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={chronological}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      maintainVisibleContentPosition={{
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: 0.2,
      }}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  content: {
    paddingVertical: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },
  skeletonBubble: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 15,
  },
});
