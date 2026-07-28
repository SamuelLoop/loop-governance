import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../stores/chatStore';
import { rankToTier } from '../utils/tier';
import type { ChatMessage } from '../types';

export function useRealtimeChannel(
  communityId: string | null,
  currentUserId: string | null | undefined
) {
  const { setMessages, prependMessage, setLoading, setChannel } = useChatStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  async function fetchMessages(afterTimestamp?: string) {
    if (!communityId) return;
    if (!afterTimestamp) setLoading(true);

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, content, created_at, author_id, community_id')
      .eq('community_id', communityId)
      .eq('channel', 'community')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!msgs || msgs.length === 0) {
      setLoading(false);
      if (!afterTimestamp) setMessages([]);
      return;
    }

    const authorIds = [...new Set(msgs.map((m: any) => m.author_id as string))];

    const [usersRes, scoresRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', authorIds),
      supabase
        .from('accreditation_scores')
        .select('user_id, score, rank')
        .eq('community_id', communityId)
        .in('user_id', authorIds),
    ]);

    const userMap = new Map(
      (usersRes.data ?? []).map((u: any) => [u.id, u])
    );
    const scoreMap = new Map(
      (scoresRes.data ?? []).map((s: any) => [s.user_id, s])
    );

    const chatMsgs: ChatMessage[] = msgs.map((m: any) => {
      const user = userMap.get(m.author_id);
      const sc = scoreMap.get(m.author_id);
      const rank = sc?.rank ?? 0;
      const score = sc?.score ?? 0;
      return {
        id: m.id,
        communityId: m.community_id,
        authorId: m.author_id,
        content: m.content,
        createdAt: m.created_at,
        author: user
          ? {
              id: m.author_id,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
              tier: rankToTier(rank),
              score,
            }
          : null,
        isLeadership: score >= 80,
      };
    });

    if (afterTimestamp) {
      chatMsgs.forEach((m) => prependMessage(m));
    } else {
      setMessages(chatMsgs);
      if (chatMsgs.length > 0) {
        lastTimestampRef.current = chatMsgs[0].createdAt;
      }
    }

    setLoading(false);
  }

  function subscribe() {
    if (!communityId) return;

    const channel = supabase
      .channel(`chat:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `community_id=eq.${communityId}`,
        },
        async (payload) => {
          const raw = payload.new as any;
          if (raw.channel !== 'community') return;

          // Skip our own messages — already handled optimistically
          if (raw.author_id === currentUserIdRef.current) return;

          const [userRes, scoreRes] = await Promise.all([
            supabase
              .from('users')
              .select('display_name, avatar_url')
              .eq('id', raw.author_id)
              .single(),
            supabase
              .from('accreditation_scores')
              .select('score, rank')
              .eq('user_id', raw.author_id)
              .eq('community_id', communityId)
              .maybeSingle(),
          ]);

          const rank = scoreRes.data?.rank ?? 0;
          const score = scoreRes.data?.score ?? 0;
          const user = userRes.data;

          const msg: ChatMessage = {
            id: raw.id,
            communityId: raw.community_id,
            authorId: raw.author_id,
            content: raw.content,
            createdAt: raw.created_at,
            author: user
              ? {
                  id: raw.author_id,
                  displayName: user.display_name,
                  avatarUrl: user.avatar_url,
                  tier: rankToTier(rank),
                  score,
                }
              : null,
            isLeadership: score >= 80,
          };

          prependMessage(msg);
          lastTimestampRef.current = raw.created_at;
        }
      )
      .subscribe();

    channelRef.current = channel;
    setChannel(channel);
  }

  function unsubscribe() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setChannel(null);
    }
  }

  useEffect(() => {
    if (!communityId) return;

    fetchMessages();
    subscribe();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        unsubscribe();
        fetchMessages(lastTimestampRef.current ?? undefined);
        subscribe();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [communityId]);
}
