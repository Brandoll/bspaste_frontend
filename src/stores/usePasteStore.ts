import { LiveSessionResponse, PasteProtection } from '@/contracts';
import { base64UrlToBuffer, bufferToBase64Url, generateDEK } from '@/lib/crypto';
import { create } from 'zustand';

type EditorMode = 'create' | 'read' | 'edit';

export interface PendingAsset {
  id: string;
  file: File;
  previewUrl: string;
}

interface PasteState {
  dek: Uint8Array | null;
  dekBase64Url: string | null;
  mode: EditorMode;
  protection: PasteProtection;
  liveSession: LiveSessionResponse | null;
  ownerToken: string | null;
  readToken: string | null;
  content: string;
  pendingAssets: PendingAsset[];
  ensureDEK: () => Uint8Array;
  setDEK: (dek: Uint8Array) => void;
  setDEKFromUrl: (keyBase64Url: string) => boolean;
  setMode: (mode: EditorMode) => void;
  setProtection: (protection: PasteProtection) => void;
  setContent: (content: string) => void;
  setLiveSession: (session: LiveSessionResponse | null) => void;
  setOwnerToken: (token: string | null) => void;
  setReadToken: (token: string | null) => void;
  addPendingAssets: (files: File[]) => void;
  removePendingAsset: (id: string) => void;
  clearPendingAssets: () => void;
  resetPaste: () => void;
}

export const usePasteStore = create<PasteState>((set, get) => ({
  dek: null,
  dekBase64Url: null,
  mode: 'create',
  protection: PasteProtection.NONE,
  liveSession: null,
  ownerToken: null,
  readToken: null,
  content: '',
  pendingAssets: [],

  ensureDEK: () => {
    const current = get().dek;
    if (current) return current;
    const dek = generateDEK();
    set({ dek, dekBase64Url: bufferToBase64Url(dek) });
    return dek;
  },

  setDEK: (dek) => {
    if (dek.byteLength !== 32) throw new Error('La DEK debe contener exactamente 32 bytes');
    set({ dek, dekBase64Url: bufferToBase64Url(dek) });
  },

  setDEKFromUrl: (keyBase64Url) => {
    try {
      const dek = base64UrlToBuffer(keyBase64Url);
      if (dek.byteLength !== 32) return false;
      set({ dek, dekBase64Url: keyBase64Url });
      return true;
    } catch {
      return false;
    }
  },

  setMode: (mode) => set({ mode }),
  setProtection: (protection) => set({ protection }),
  setContent: (content) => set({ content }),
  setLiveSession: (liveSession) => set({ liveSession }),
  setOwnerToken: (ownerToken) => set({ ownerToken }),
  setReadToken: (readToken) => set({ readToken }),
  addPendingAssets: (files) =>
    set((state) => ({
      pendingAssets: [
        ...state.pendingAssets,
        ...files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ],
    })),
  removePendingAsset: (id) =>
    set((state) => {
      const target = state.pendingAssets.find((asset) => asset.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return { pendingAssets: state.pendingAssets.filter((asset) => asset.id !== id) };
    }),
  clearPendingAssets: () =>
    set((state) => {
      state.pendingAssets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl));
      return { pendingAssets: [] };
    }),
  resetPaste: () =>
    set((state) => {
      state.pendingAssets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl));
      return {
      dek: null,
      dekBase64Url: null,
      mode: 'create',
      protection: PasteProtection.NONE,
      liveSession: null,
      ownerToken: null,
      readToken: null,
      content: '',
        pendingAssets: [],
      };
    }),
}));
