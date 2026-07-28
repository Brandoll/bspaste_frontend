const PREFIX = 'bspaste:key:';

export function saveLocalPasteKey(publicId: string, key: string): void {
  sessionStorage.setItem(`${PREFIX}${publicId}`, key);
}

export function loadLocalPasteKey(publicId: string): string | null {
  return sessionStorage.getItem(`${PREFIX}${publicId}`);
}
