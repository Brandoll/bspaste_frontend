import {
  ApiErrorBody,
  CreatePasteRequest,
  CreatePasteResponse,
  CreateUploadUrlRequest,
  CreateUploadUrlResponse,
  DownloadUrlResponse,
  GetPasteResponse,
  HealthResponse,
  LiveSessionResponse,
  UnlockPasteRequest,
  UnlockPasteResponse,
} from '@/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = ApiError.name;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      signal: init?.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'API_TIMEOUT', 'La API tardó demasiado en responder.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con la API de BSPaste.');
  } finally {
    window.clearTimeout(timeout);
  }
  const body = (await response.json().catch(() => undefined)) as ApiErrorBody | T | undefined;

  if (!response.ok) {
    const error = body as ApiErrorBody | undefined;
    const rawMessage = error?.message ?? `La API respondió con estado ${response.status}`;
    throw new ApiError(
      response.status,
      error?.code ?? 'API_ERROR',
      Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage,
      error?.details,
    );
  }

  return body as T;
}

function bearer(token?: string): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function useCreatePaste() {
  return useMutation<CreatePasteResponse, ApiError, CreatePasteRequest>({
    mutationFn: (data) => {
      const token = useAuthStore.getState().accessToken;
      return (
      requestJson<CreatePasteResponse>('/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(data),
      })
      );
    },
  });
}

export function useGetPaste(
  publicId: string,
  accessToken?: string,
  enabled = true,
  ownerToken?: string,
) {
  const accountToken = useAuthStore((state) => state.accessToken);
  return useQuery<GetPasteResponse, ApiError>({
    queryKey: [
      'paste',
      publicId,
      accessToken ?? 'locked',
      accountToken ?? 'guest',
      ownerToken ? 'owner' : 'recipient',
    ],
    queryFn: () =>
      requestJson<GetPasteResponse>(`/pastes/${encodeURIComponent(publicId)}`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(accountToken ? { 'X-Account-Authorization': `Bearer ${accountToken}` } : {}),
          ...(ownerToken ? { 'X-Owner-Authorization': `Bearer ${ownerToken}` } : {}),
        },
        cache: 'no-store',
      }),
    enabled: Boolean(publicId) && enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
    refetchOnMount: false,
  });
}

export function useUnlockPaste() {
  return useMutation<
    UnlockPasteResponse,
    ApiError,
    { publicId: string; request: UnlockPasteRequest }
  >({
    mutationFn: ({ publicId, request }) =>
      requestJson<UnlockPasteResponse>(`/pastes/${encodeURIComponent(publicId)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }),
  });
}

export function useCreateLiveSession() {
  return useMutation<LiveSessionResponse, ApiError, { publicId: string; ownerToken: string }>({
    mutationFn: ({ publicId, ownerToken }) =>
      requestJson<LiveSessionResponse>(`/pastes/${encodeURIComponent(publicId)}/live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      }),
  });
}

export function useDeletePaste() {
  return useMutation<void, ApiError, { publicId: string; ownerToken: string }>({
    mutationFn: ({ publicId, ownerToken }) =>
      requestJson<void>(`/pastes/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        headers: bearer(ownerToken),
      }),
  });
}

export function useCreateUploadUrl() {
  return useMutation<
    CreateUploadUrlResponse,
    ApiError,
    { request: CreateUploadUrlRequest; ownerToken: string }
  >({
    mutationFn: ({ request, ownerToken }) =>
      requestJson<CreateUploadUrlResponse>('/assets/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify(request),
      }),
  });
}

export function useCompleteAssetUpload() {
  return useMutation<void, ApiError, { assetId: string; ownerToken: string }>({
    mutationFn: ({ assetId, ownerToken }) =>
      requestJson<void>(`/assets/${encodeURIComponent(assetId)}/complete`, {
        method: 'POST',
        headers: bearer(ownerToken),
      }),
  });
}

export function useGetAssetUrl() {
  return useMutation<DownloadUrlResponse, ApiError, { assetId: string; accessToken?: string }>({
    mutationFn: ({ assetId, accessToken }) => {
      const token = accessToken ?? useAuthStore.getState().accessToken ?? undefined;
      return (
      requestJson<DownloadUrlResponse>(`/assets/${encodeURIComponent(assetId)}`, {
        headers: bearer(token),
        cache: 'no-store',
      })
      );
    },
  });
}

export function useDeleteAsset() {
  return useMutation<void, ApiError, { assetId: string; ownerToken: string }>({
    mutationFn: ({ assetId, ownerToken }) =>
      requestJson<void>(`/assets/${encodeURIComponent(assetId)}`, {
        method: 'DELETE',
        headers: bearer(ownerToken),
      }),
  });
}

export function useHealth() {
  return useQuery<HealthResponse, ApiError>({
    queryKey: ['api-health'],
    queryFn: () => requestJson<HealthResponse>('/health', { cache: 'no-store' }),
    retry: false,
    refetchInterval: 30_000,
  });
}

export async function uploadToSignedUrl(
  uploadUrl: string,
  encryptedBytes: Uint8Array,
  requiredHeaders: Record<string, string>,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: requiredHeaders,
    body: new Blob([Uint8Array.from(encryptedBytes)], { type: 'application/octet-stream' }),
  });
  if (!response.ok) throw new Error(`R2 rechazó la subida (${response.status})`);
}
