const OWNER_TOKEN_PREFIX = 'bspaste:owner:';

export function saveOwnerToken(publicId: string, token: string): void {
  sessionStorage.setItem(`${OWNER_TOKEN_PREFIX}${publicId}`, token);
}

export function loadOwnerToken(publicId: string): string | null {
  return sessionStorage.getItem(`${OWNER_TOKEN_PREFIX}${publicId}`);
}

export function removeOwnerToken(publicId: string): void {
  sessionStorage.removeItem(`${OWNER_TOKEN_PREFIX}${publicId}`);
}
