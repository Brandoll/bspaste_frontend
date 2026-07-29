import { AccountUser } from '@/contracts';
import { loadVaultKey, removeVaultKey, saveVaultKey } from '@/lib/account-vault';
import { create } from 'zustand';

interface AuthState {
  user: AccountUser | null;
  accessToken: string | null;
  initialized: boolean;
  vaultKey: string | null;
  setSession: (user: AccountUser, accessToken: string) => void;
  clearSession: () => void;
  setVaultKey: (vaultKey: Uint8Array) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  vaultKey: null,
  setSession: (user, accessToken) => set({
    user,
    accessToken,
    initialized: true,
    vaultKey: loadVaultKey(user.id),
  }),
  clearSession: () => set((state) => {
    if (state.user) removeVaultKey(state.user.id);
    return { user: null, accessToken: null, vaultKey: null, initialized: true };
  }),
  setVaultKey: (vaultKey) => set((state) => ({
    vaultKey: state.user ? saveVaultKey(state.user.id, vaultKey) : null,
  })),
  setInitialized: (initialized) => set({ initialized }),
}));
