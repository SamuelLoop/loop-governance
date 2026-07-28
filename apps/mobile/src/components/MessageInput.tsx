import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../stores/chatStore';
import type { ChatMessage } from '../types';

interface Props {
  communityId: string | null;
  currentUserId: string | null | undefined;
}

export function MessageInput({ communityId, currentUserId }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { addOptimistic, confirmOptimistic, rollbackOptimistic } = useChatStore();

  async function handleSend() {
    const body = text.trim();
    if (!body || !communityId || !currentUserId || sending) return;

    setText('');
    setSending(true);

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      communityId,
      authorId: currentUserId,
      content: body,
      createdAt: new Date().toISOString(),
      author: null,
      isLeadership: false,
      isOptimistic: true,
      tempId,
    };

    addOptimistic(optimistic);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        community_id: communityId,
        author_id: currentUserId,
        content: body,
      })
      .select('id, content, created_at, author_id, community_id')
      .single();

    setSending(false);

    if (error || !data) {
      rollbackOptimistic(tempId);
      Alert.alert('Error', 'Failed to send. Please try again.');
      return;
    }

    const serverMsg: ChatMessage = {
      id: data.id,
      communityId: data.community_id,
      authorId: data.author_id,
      content: data.content,
      createdAt: data.created_at,
      author: null,
      isLeadership: false,
    };

    confirmOptimistic(tempId, serverMsg);
  }

  const canSend = !!text.trim() && !!communityId && !!currentUserId && !sending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#3f3f46"
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#141414',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f5f5f5',
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#b9f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendIcon: {
    color: '#0a0a0a',
    fontSize: 18,
    fontWeight: '700',
  },
});
