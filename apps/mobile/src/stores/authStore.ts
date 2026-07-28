import { create } from 'zustand';
import type { UserProfile } from '../types';

interface AuthState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
