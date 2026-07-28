import { create } from 'zustand';
import type { Community } from '../types';

interface SubjectState {
  communities: Community[];
  activeCommunityId: string | null;
  setCommunities: (cs: Community[]) => void;
  setActiveCommunity: (id: string) => void;
}

export const useSubjectStore = create<SubjectState>((set) => ({
  communities: [],
  activeCommunityId: null,
  setCommunities: (communities) => set({ communities }),
  setActiveCommunity: (activeCommunityId) => set({ activeCommunityId }),
}));
