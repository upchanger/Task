import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/domain';

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
  initialized: boolean;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  initialized: false,
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ firebaseUser: null, profile: null, initialized: true }),
}));
