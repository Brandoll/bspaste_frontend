'use client';

import { MainEditor } from '@/components/editor/MainEditor';
import { AssetGallery } from '@/components/assets/AssetGallery';
import { AppShell } from '@/components/layout/AppShell';
import { PasteActions } from '@/components/paste/PasteActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasteProtection } from '@/contracts';
import { useGetPaste, useUnlockPaste } from '@/hooks/usePasteApi';
import { base64ToBuffer, decryptContent, generateAccessProof, unwrapDEK, unwrapKeyWithKey, wrapKeyWithKey } from '@/lib/crypto';
import { loadOwnerToken } from '@/lib/owner-credentials';
import { loadLocalPasteKey, saveLocalPasteKey } from '@/lib/local-key-cache';
import { usePasteStore } from '@/stores/usePasteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLogin, useSetPasteVaultKey } from '@/hooks/useAccountApi';
import { unlockAccountVault } from '@/lib/account-vault';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PastePage() {
  const { id } = useParams<{ id: string }>();
  const {
    dek,
    setDEK,
    setDEKFromUrl,
    setContent,
    setMode,
    setProtection,
    setOwnerToken,
    setReadToken,
    ownerToken,
  } = usePasteStore();
  const [accessToken, setAccessToken] = useState<string>();
  const [unlockSecret, setUnlockSecret] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');
  const keyLocationChecked = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string>();
  const decryptedFingerprint = useRef<string | undefined>(undefined);
  const migratedVaultKey = useRef<string | undefined>(undefined);
  const unlock = useUnlockPaste();
  const login = useLogin();
  const setPasteVaultKey = useSetPasteVaultKey();
  const user = useAuthStore((state) => state.user);
  const accountToken = useAuthStore((state) => state.accessToken);
  const vaultKey = useAuthStore((state) => state.vaultKey);
  const setSession = useAuthStore((state) => state.setSession);
  const setVaultKey = useAuthStore((state) => state.setVaultKey);
  const pasteQuery = useGetPaste(id, accessToken, keyLocationChecked);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const sharedKey = fragment.get('key');
    if (sharedKey) {
      const valid = setDEKFromUrl(sharedKey);
      if (!valid) toast.error('La clave incluida en el enlace no es válida.');
    }
    setOwnerToken(loadOwnerToken(id));
    setMode('read');
  }, [id, setDEKFromUrl, setMode, setOwnerToken]);

  useEffect(() => {
    const paste = pasteQuery.data;
    const publicId = paste?.publicId;
    if (!publicId || paste.protection !== PasteProtection.NONE) return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const sharedKey = fragment.get('key');
    if (sharedKey) saveLocalPasteKey(publicId, sharedKey);
    else {
      const cachedKey = loadLocalPasteKey(publicId);
      if (cachedKey) {
        setDEKFromUrl(cachedKey);
        fragment.set('key', cachedKey);
        window.history.replaceState(null, '', `${window.location.pathname}#${fragment.toString()}`);
      }
    }
  }, [pasteQuery.data, setDEKFromUrl]);

  useEffect(() => {
    const publicId = pasteQuery.data?.publicId;
    if (publicId) setOwnerToken(loadOwnerToken(publicId));
  }, [pasteQuery.data?.publicId, setOwnerToken]);

  useEffect(() => {
    const paste = pasteQuery.data;
    if (!paste) return;
    setProtection(paste.protection);
    setReadToken(paste.readToken ?? null);
  }, [pasteQuery.data, setProtection, setReadToken]);

  useEffect(() => {
    const paste = pasteQuery.data;
    if (!paste?.ciphertext || !paste.nonce || paste.requiresUnlock) return;
    const ciphertext = paste.ciphertext;
    const nonce = paste.nonce;
    const fingerprint = `${paste.publicId}:${paste.nonce}`;
    if (decryptedFingerprint.current === fingerprint) return;

    let cancelled = false;
    const decryptPaste = async () => {
      setIsDecrypting(true);
      setDecryptionError(undefined);
      try {
        let activeDek = dek;
        let derivedDek: Uint8Array | undefined;
        if (!activeDek && paste.vaultWrappedKey && vaultKey) {
          derivedDek = await unwrapKeyWithKey(paste.vaultWrappedKey, base64ToBuffer(vaultKey));
          activeDek = derivedDek;
        }
        if (!activeDek && paste.owned && paste.vaultWrappedKey && !vaultKey) {
          throw new Error('Tu bóveda está bloqueada. Introduce la contraseña de tu cuenta.');
        }
        if (paste.protection !== PasteProtection.NONE && paste.wrappedKey && paste.salt) {
          if (!unlockSecret && !activeDek) {
            throw new Error('Vuelve a introducir el PIN o la contraseña para derivar la clave.');
          }
          if (unlockSecret) {
            derivedDek = await unwrapDEK(paste.wrappedKey, unlockSecret, paste.salt);
            activeDek = derivedDek;
          }
        }
        if (!activeDek) throw new Error('El enlace no contiene la clave de descifrado.');

        const plaintext = await decryptContent(activeDek, ciphertext, nonce);
        if (!cancelled) {
          if (derivedDek) setDEK(derivedDek);
          setContent(plaintext);
          decryptedFingerprint.current = fingerprint;
        }
      } catch (error) {
        if (!cancelled) {
          setDecryptionError(
            error instanceof Error ? error.message : 'No se pudo descifrar el contenido.',
          );
        }
      } finally {
        if (!cancelled) setIsDecrypting(false);
      }
    };

    void decryptPaste();
    return () => {
      cancelled = true;
    };
  }, [dek, pasteQuery.data, setContent, setDEK, unlockSecret, vaultKey]);

  useEffect(() => {
    const paste = pasteQuery.data;
    if (!paste?.owned || paste.vaultWrappedKey || !dek || !vaultKey) return;
    if (migratedVaultKey.current === paste.publicId) return;
    migratedVaultKey.current = paste.publicId;
    void wrapKeyWithKey(dek, base64ToBuffer(vaultKey))
      .then((vaultWrappedKey) => setPasteVaultKey.mutateAsync({
        publicId: paste.publicId,
        vaultWrappedKey,
      }))
      .then(() => toast.success('Clave sincronizada con tus dispositivos'))
      .catch(() => {
        migratedVaultKey.current = undefined;
      });
  }, [dek, pasteQuery.data, setPasteVaultKey, vaultKey]);

  const handleUnlock = async () => {
    const paste = pasteQuery.data;
    if (!paste?.salt || !unlockSecret) {
      toast.error('El servidor no proporcionó los parámetros necesarios para desbloquear.');
      return;
    }
    try {
      const accessProof = await generateAccessProof(unlockSecret, paste.salt);
      const result = await unlock.mutateAsync({ publicId: id, request: { accessProof } });
      setAccessToken(result.accessToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PIN o contraseña incorrectos');
    }
  };

  const handleVaultUnlock = async () => {
    if (!user || !vaultPassword) return;
    try {
      const session = await login.mutateAsync({ username: user.username, password: vaultPassword });
      if (!session.user.vault) throw new Error('Esta cuenta todavía no tiene una bóveda inicializada.');
      const unlocked = await unlockAccountVault(vaultPassword, session.user.vault);
      setSession(session.user, session.accessToken);
      setVaultKey(unlocked);
      setVaultPassword('');
      setDecryptionError(undefined);
      toast.success('Bóveda desbloqueada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo desbloquear la bóveda');
    }
  };

  const isLocked = pasteQuery.data?.requiresUnlock && !accessToken;
  const canRenderEditor =
    Boolean(pasteQuery.data?.ciphertext) &&
    !pasteQuery.data?.requiresUnlock &&
    !isDecrypting &&
    !decryptionError;

  return (
    <AppShell canvasClassName="lg:h-[calc(100vh-1rem)]">
      <div className="flex h-full min-w-0 flex-col">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h1 className="truncate font-semibold">Paste {id}</h1>
            <p className="text-xs text-muted-foreground">{pasteQuery.data?.expiresAt ? <>Expira: <time dateTime={pasteQuery.data.expiresAt}>{pasteQuery.data.expiresAt.replace('T', ' ').slice(0, 16)} UTC</time></> : 'Sin expiración'}</p>
          </div>
          <PasteActions publicId={id} ownerToken={ownerToken ?? undefined} owned={pasteQuery.data?.owned} expiresAt={pasteQuery.data?.expiresAt} />
        </header>

        <main className="flex min-h-[calc(100vh-9rem)] flex-1 lg:min-h-0">
          {(pasteQuery.isLoading || isDecrypting) && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {!pasteQuery.isLoading && isLocked && (
            <div className="flex flex-1 items-center justify-center bg-muted/20 p-6">
              <div className="w-full max-w-sm rounded-[1.4rem] border bg-card p-8 text-center shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} />
                </div>
                <h2 className="text-xl font-bold mb-2">Paste protegido</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Introduce {pasteQuery.data?.protection === PasteProtection.PIN ? 'el PIN' : 'la contraseña'} para descifrarlo en este dispositivo.
                </p>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleUnlock();
                  }}
                >
                  <Input
                    type="password"
                    inputMode={
                      pasteQuery.data?.protection === PasteProtection.PIN ? 'numeric' : 'text'
                    }
                    autoComplete="current-password"
                    placeholder={
                      pasteQuery.data?.protection === PasteProtection.PIN ? 'PIN' : 'Contraseña'
                    }
                    value={unlockSecret}
                    onChange={(event) => setUnlockSecret(event.target.value)}
                    className="text-center"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={unlock.isPending || !unlockSecret}
                    className="w-full"
                  >
                    {unlock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Desbloquear
                  </Button>
                </form>
              </div>
            </div>
          )}

          {(pasteQuery.error || decryptionError) && !isLocked && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md text-center">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">No se pudo abrir el paste</h2>
                <p className="text-sm text-muted-foreground">
                  {decryptionError ?? pasteQuery.error?.message}
                </p>
                {decryptionError?.includes('bóveda') && user && (
                  <form className="mx-auto mt-5 flex max-w-sm gap-2" onSubmit={(event) => { event.preventDefault(); void handleVaultUnlock(); }}>
                    <Input type="password" autoComplete="current-password" placeholder="Contraseña de tu cuenta" value={vaultPassword} onChange={(event) => setVaultPassword(event.target.value)} />
                    <Button type="submit" disabled={login.isPending || !vaultPassword}>{login.isPending ? <Loader2 className="animate-spin" /> : 'Abrir'}</Button>
                  </form>
                )}
                {decryptionError && pasteQuery.data?.protection !== PasteProtection.NONE && !pasteQuery.data?.vaultWrappedKey && (
                  <form className="mx-auto mt-5 flex max-w-sm gap-2" onSubmit={(event) => { event.preventDefault(); void handleUnlock(); }}>
                    <Input type="password" inputMode={pasteQuery.data?.protection === PasteProtection.PIN ? 'numeric' : 'text'} placeholder={pasteQuery.data?.protection === PasteProtection.PIN ? 'PIN del paste' : 'Contraseña del paste'} value={unlockSecret} onChange={(event) => setUnlockSecret(event.target.value)} />
                    <Button type="submit" disabled={unlock.isPending || !unlockSecret}>{unlock.isPending ? <Loader2 className="animate-spin" /> : 'Abrir'}</Button>
                  </form>
                )}
              </div>
            </div>
          )}

          {canRenderEditor && (
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
              <MainEditor />
              {dek && pasteQuery.data?.assets && (
                <AssetGallery
                  assets={pasteQuery.data.assets}
                  dek={dek}
                  accessToken={pasteQuery.data.readToken}
                  ownerToken={ownerToken ?? (pasteQuery.data.owned ? accountToken ?? undefined : undefined)}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
