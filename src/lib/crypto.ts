import { argon2id } from 'hash-wasm';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

// Utilidades base64url
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  return bufferToBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64ToBuffer(base64);
}

// 1. Generar DEK (32 bytes)
export function generateDEK(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// 3 y 4. Generar nonce y salt
export function generateNonce(length = 12): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// 2. Cifrar contenido con AES-256-GCM
export async function encryptContent(dek: Uint8Array, content: string | Uint8Array) {
  const nonce = generateNonce(12);
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(dek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    toArrayBuffer(data)
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(nonce)
  };
}

export async function decryptContent(dek: Uint8Array, ciphertextB64: string, nonceB64: string) {
  const nonce = base64ToBuffer(nonceB64);
  const ciphertext = base64ToBuffer(ciphertextB64);
  
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(dek),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    toArrayBuffer(ciphertext)
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function encryptBinary(
  dek: Uint8Array,
  plaintext: ArrayBuffer,
): Promise<{ ciphertext: Uint8Array; nonce: string }> {
  const nonce = generateNonce(12);
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(dek),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    key,
    plaintext,
  );
  return { ciphertext: new Uint8Array(ciphertext), nonce: bufferToBase64(nonce) };
}

export async function decryptBinary(
  dek: Uint8Array,
  ciphertext: ArrayBuffer,
  nonceB64: string,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(dek),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64ToBuffer(nonceB64)) },
    key,
    ciphertext,
  );
}

// Derivación de claves con Argon2id (usando hash-wasm)
export async function deriveKeyArgon2id(secret: string, salt: Uint8Array, type: 'content-key' | 'access-proof'): Promise<Uint8Array> {
  const domain = `bspaste/${type}/v1:${secret}`;
  const password = new TextEncoder().encode(domain);
  
  try {
    const hashHex = await argon2id({
      password,
      salt,
      iterations: 2,
      memorySize: 65536, // 64 MB
      hashLength: 32,
      parallelism: 1,
      outputType: 'hex',
    });
    
    // Convert hex string to Uint8Array
    const hashBytes = new Uint8Array(hashHex.length / 2);
    for (let i = 0; i < hashHex.length; i += 2) {
      hashBytes[i / 2] = parseInt(hashHex.substring(i, i + 2), 16);
    }
    return hashBytes;
  } catch (error) {
    console.error("Argon2id error", error);
    throw new Error("Failed to derive key");
  }
}

// Envolver DEK (wrapKey)
export async function wrapDEK(dek: Uint8Array, secret: string, salt: Uint8Array) {
  const kek = await deriveKeyArgon2id(secret, salt, 'content-key');
  const accessProofBuffer = await deriveKeyArgon2id(secret, salt, 'access-proof');
  
  const wrapNonce = generateNonce(12);
  
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(kek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedDEK = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(wrapNonce) },
    key,
    toArrayBuffer(dek)
  );

  // wrappedKey = wrapNonce || encryptedDEK
  const wrappedKeyBuffer = new Uint8Array(wrapNonce.length + encryptedDEK.byteLength);
  wrappedKeyBuffer.set(wrapNonce, 0);
  wrappedKeyBuffer.set(new Uint8Array(encryptedDEK), wrapNonce.length);

  return {
    wrappedKey: bufferToBase64(wrappedKeyBuffer),
    accessProof: bufferToBase64Url(accessProofBuffer)
  };
}

// Desenvolver DEK
export async function unwrapDEK(wrappedKeyB64: string, secret: string, saltB64: string): Promise<Uint8Array> {
  const salt = base64ToBuffer(saltB64);
  const kek = await deriveKeyArgon2id(secret, salt, 'content-key');
  
  const wrappedKeyBuffer = base64ToBuffer(wrappedKeyB64);
  const wrapNonce = wrappedKeyBuffer.slice(0, 12);
  const encryptedDEK = wrappedKeyBuffer.slice(12);

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(kek),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const dekBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(wrapNonce) },
    key,
    toArrayBuffer(encryptedDEK)
  );

  return new Uint8Array(dekBuffer);
}

// Proveer AccessProof para unlock
export async function generateAccessProof(secret: string, saltB64: string): Promise<string> {
  const salt = base64ToBuffer(saltB64);
  const accessProofBuffer = await deriveKeyArgon2id(secret, salt, 'access-proof');
  return bufferToBase64Url(accessProofBuffer);
}
