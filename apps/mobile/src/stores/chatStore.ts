import { create } from 'zustand';
import type { ChatMessage } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  channel: RealtimeChannel | null;
  setMessages: (msgs: ChatMessage[]) => void;
  prependMessage: (msg: ChatMessage) => void;
  addOptimistic: (msg: ChatMessage) => void;
  confirmOptimistic: (tempId: string, serverMsg: ChatMessage) => void;
  rollbackOptimistic: (tempId: string) => void;
  setLoading: (loading: boolean) => void;
  setChannel: (ch: RealtimeChannel | null) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  channel: null,
  setMessages: (messages) => set({ messages }),
  prependMessage: (msg) =>
    set((s) => ({ messages: [msg, ...s.messages] })),
  addOptimistic: (msg) =>
    set((s) => ({ messages: [msg, ...s.messages] })),
  confirmOptimistic: (tempId, serverMsg) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.tempId === tempId ? serverMsg : m
      ),
    })),
  rollbackOptimistic: (tempId) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.tempId !== tempId),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setChannel: (channel) => set({ channel }),
  clear: () => set({ messages: [], isLoading: false }),
}));
