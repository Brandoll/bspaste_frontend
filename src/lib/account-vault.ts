import {
  base64ToBuffer,
  bufferToBase64,
  deriveKeyArgon2id,
  generateDEK,
  generateSalt,
  unwrapKeyWithKey,
  wrapKeyWithKey,
} from '@/lib/crypto';

const PREFIX = 'bspaste:vault:';

export interface AccountVaultBundle {
  salt: string;
  wrappedKey: string;
  version: number;
}

export async function createAccountVault(password: string): Promise<{
  vaultKey: Uint8Array;
  bundle: AccountVaultBundle;
}> {
  const vaultKey = generateDEK();
  const salt = generateSalt(16);
  const passwordKey = await deriveKeyArgon2id(password, salt, 'account-vault');
  return {
    vaultKey,
    bundle: {
      salt: bufferToBase64(salt),
      wrappedKey: await wrapKeyWithKey(vaultKey, passwordKey),
      version: 1,
    },
  };
}

export async function unlockAccountVault(
  password: string,
  bundle: AccountVaultBundle,
): Promise<Uint8Array> {
  const passwordKey = await deriveKeyArgon2id(
    password,
    base64ToBuffer(bundle.salt),
    'account-vault',
  );
  const vaultKey = await unwrapKeyWithKey(bundle.wrappedKey, passwordKey);
  if (vaultKey.byteLength !== 32) throw new Error('La bóveda contiene una clave inválida.');
  return vaultKey;
}

export function saveVaultKey(userId: string, vaultKey: Uint8Array): string {
  const encoded = bufferToBase64(vaultKey);
  sessionStorage.setItem(`${PREFIX}${userId}`, encoded);
  return encoded;
}

export function loadVaultKey(userId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(`${PREFIX}${userId}`);
}

export function removeVaultKey(userId: string): void {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(`${PREFIX}${userId}`);
}
