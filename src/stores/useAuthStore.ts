import { AccountUser } from '@/contracts';
import { create } from 'zustand';

interface AuthState {
  user: AccountUser | null;
  accessToken: string | null;
  initialized: boolean;
  setSession: (user: AccountUser, accessToken: string) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setSession: (user, accessToken) => set({ user, accessToken, initialized: true }),
  clearSession: () => set({ user: null, accessToken: null, initialized: true }),
  setInitialized: (initialized) => set({ initialized }),
}));
