export enum PasteProtection {
  NONE = 'NONE',
  PIN = 'PIN',
  PASSWORD = 'PASSWORD',
}

export interface PasteAsset {
  id: string;
  mimeType: string;
  size: number;
  nonce?: string;
}

export interface PasteDescriptor {
  publicId: string;
  protection: PasteProtection;
  burnAfterRead: boolean;
  expiresAt: string;
  contentType: string;
  encryptionVersion: number;
  requiresUnlock: boolean;
  owned?: boolean;
}

export interface CreatePasteRequest {
  ciphertext: string;
  nonce: string;
  salt: string;
  wrappedKey?: string;
  protection: PasteProtection;
  accessProof?: string;
  contentType?: string;
  expiresInSeconds?: number;
  burnAfterRead?: boolean;
}

export interface CreatePasteResponse extends PasteDescriptor {
  deleteToken: string;
}

export interface UnlockPasteRequest {
  accessProof: string;
}

export interface UnlockPasteResponse {
  accessToken: string;
  expiresIn: number;
}

export interface GetPasteResponse extends PasteDescriptor {
  salt?: string;
  ciphertext?: string;
  nonce?: string;
  wrappedKey?: string;
  readToken?: string;
  assets?: PasteAsset[];
}

export interface CreateUploadUrlRequest {
  pasteId: string;
  size: number;
  mimeType?: string;
  nonce?: string;
}

export interface CreateUploadUrlResponse {
  assetId: string;
  uploadUrl: string;
  expiresIn: number;
  requiredHeaders: Record<string, string>;
}

export interface DownloadUrlResponse {
  url: string;
  expiresIn: number;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  services: {
    database: 'ok';
    r2Configured: boolean;
  };
}

export interface LiveSessionResponse {
  roomId: string;
  viewerToken: string;
  editorToken: string;
  expiresAt: string;
}

export interface EncryptedUpdate {
  ciphertext: string;
  nonce: string;
  baseVersion: number;
  clientId: string;
}

export interface LiveJoinSnapshot {
  roomId: string;
  permission: 'READ' | 'EDIT';
  ciphertext: string;
  nonce: string;
  version: number;
}

export interface PresenceUpdate {
  clientId: string;
  state?: 'joined' | 'left';
  permission?: 'READ' | 'EDIT';
  cursor?: number;
  active?: boolean;
}

export interface ServerToClientEvents {
  exception: (data: { status?: string; message?: string }) => void;
  'paste.lock': (data: { reason?: string; clientId?: string }) => void;
  'paste.update': (data: EncryptedUpdate) => void;
  'presence.update': (data: PresenceUpdate) => void;
  'asset.added': (data: { assetId: string }) => void;
  'asset.removed': (data: { assetId: string }) => void;
  'paste.join': (data: LiveJoinSnapshot) => void;
}

export interface ClientToServerEvents {
  'paste.join': () => void;
  'paste.leave': () => void;
  'paste.update': (data: EncryptedUpdate) => void;
  'paste.lock': () => void;
  'asset.added': (data: { assetId: string }) => void;
  'asset.removed': (data: { assetId: string }) => void;
  'presence.update': (data: { cursor?: number; active?: boolean }) => void;
  'paste.delete': (data: { publicId: string; ownerToken: string }) => void;
}

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  details?: Record<string, unknown>;
}

export interface AccountUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AccountUser;
}

export interface PasteSummary {
  publicId: string;
  customSlug: string | null;
  protection: PasteProtection;
  burnAfterRead: boolean;
  expiresAt: string;
  status: 'ACTIVE' | 'CONSUMED' | 'DELETED';
  contentType: string;
  createdAt: string;
  assetCount: number;
  accessCount: number;
  favorite: boolean;
  owned: boolean;
}

export interface LibraryAsset {
  id: string;
  mimeType: string;
  size: number;
  nonce?: string;
  createdAt: string;
  paste: {
    publicId: string;
    customSlug: string | null;
    expiresAt: string;
    status: string;
  };
}
