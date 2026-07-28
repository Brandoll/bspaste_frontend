import { AccountUser, AuthResponse, LibraryAsset, PasteSummary } from '@/contracts';
import { requestJson } from '@/hooks/usePasteApi';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useRegister() {
  return useMutation<AuthResponse, Error, { username: string; password: string; email?: string; displayName?: string }>({
    mutationFn: (body) => requestJson('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

export function useLogin() {
  return useMutation<AuthResponse, Error, { username: string; password: string }>({
    mutationFn: (body) => requestJson('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

export function useLogout() {
  return useMutation<void, Error>({ mutationFn: () => requestJson('/auth/logout', { method: 'POST' }) });
}

export function useMe(enabled = true) {
  return useQuery<AccountUser>({ queryKey: ['account', 'me'], queryFn: () => requestJson('/auth/me', { headers: authHeaders() }), enabled });
}

export function useLibraryPastes() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<PasteSummary[]>({ queryKey: ['library', 'pastes', token], queryFn: () => requestJson('/library/pastes', { headers: authHeaders() }), enabled: Boolean(token) });
}

export function useFavorites() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<PasteSummary[]>({ queryKey: ['library', 'favorites', token], queryFn: () => requestJson('/library/favorites', { headers: authHeaders() }), enabled: Boolean(token) });
}

export function useLibraryAssets() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<LibraryAsset[]>({ queryKey: ['library', 'assets', token], queryFn: () => requestJson('/library/assets', { headers: authHeaders() }), enabled: Boolean(token) });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation<void, Error, { publicId: string; favorite: boolean }>({
    mutationFn: async ({ publicId, favorite }) => {
      await requestJson(`/library/favorites/${encodeURIComponent(publicId)}`, { method: favorite ? 'DELETE' : 'POST', headers: authHeaders() });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['library'] }),
  });
}

export function useUpdateSlug() {
  const client = useQueryClient();
  return useMutation<{ publicId: string; customSlug: string }, Error, { publicId: string; slug: string }>({
    mutationFn: ({ publicId, slug }) => requestJson(`/pastes/${encodeURIComponent(publicId)}/slug`, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['library'] }),
  });
}
