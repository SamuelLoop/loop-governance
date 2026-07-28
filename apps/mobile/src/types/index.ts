export type Tier = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';

export interface MessageAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  score: number;
}

export interface ChatMessage {
  id: string;
  communityId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: MessageAuthor | null;
  isLeadership: boolean;
  isOptimistic?: boolean;
  tempId?: string;
}

export interface Community {
  id: string;
  name: string;
  subject: string;
}

export interface UserProfile {
  id: string;
  authId: string;
  displayName: string;
  avatarUrl: string | null;
  tier: Tier;
  score: number;
}
