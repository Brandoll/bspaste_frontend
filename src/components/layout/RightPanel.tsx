'use client';

import { PasteProtection } from '@/contracts';
import {
  uploadToSignedUrl,
  useCompleteAssetUpload,
  useCreateLiveSession,
  useCreatePaste,
  useCreateUploadUrl,
  useDeletePaste,
  useHealth,
} from '@/hooks/usePasteApi';
import {
  bufferToBase64,
  bufferToBase64Url,
  encryptBinary,
  encryptContent,
  generateSalt,
  wrapDEK,
} from '@/lib/crypto';
import { saveOwnerToken } from '@/lib/owner-credentials';
import { saveLocalPasteKey } from '@/lib/local-key-cache';
import { cn } from '@/lib/utils';
import { usePasteStore } from '@/stores/usePasteStore';
import {
  AlertTriangle,
  Clock3,
  EyeOff,
  FileLock2,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LockOpen,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const protectionOptions = [
  {
    value: PasteProtection.NONE,
    label: 'Sin clave',
    description: 'Acceso mediante enlace',
    icon: LockOpen,
  },
  {
    value: PasteProtection.PIN,
    label: 'PIN',
    description: 'Entre 4 y 8 dígitos',
    icon: KeyRound,
  },
  {
    value: PasteProtection.PASSWORD,
    label: 'Contraseña',
    description: 'Mínimo 8 caracteres',
    icon: FileLock2,
  },
] as const;

function assetFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  if (raw.toLowerCase().includes('r2') && raw.toLowerCase().includes('configured')) {
    return 'Cloudflare R2 no está configurado en el backend.';
  }
  if (raw.includes('Failed to fetch')) {
    return 'R2 rechazó la conexión. Revisa el CORS del bucket.';
  }
  return raw || 'No se pudo completar la subida cifrada a R2.';
}

export function RightPanel({ defaultLive = false }: { defaultLive?: boolean }) {
  const {
    protection,
    setProtection,
    content,
    ensureDEK,
    setLiveSession,
    setOwnerToken,
    pendingAssets,
    clearPendingAssets,
  } = usePasteStore();
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('86400');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(defaultLive);
  const [activeTab, setActiveTab] = useState<'general' | 'advanced'>('general');
  const [creationStage, setCreationStage] = useState<string>();
  const createPaste = useCreatePaste();
  const createLiveSession = useCreateLiveSession();
  const createUploadUrl = useCreateUploadUrl();
  const completeUpload = useCompleteAssetUpload();
  const deletePaste = useDeletePaste();
  const health = useHealth();
  const router = useRouter();
  const r2Unavailable = health.data?.services?.r2Configured === false;

  const isPending =
    createPaste.isPending ||
    createLiveSession.isPending ||
    createUploadUrl.isPending ||
    completeUpload.isPending ||
    deletePaste.isPending;

  const handleCreate = async () => {
    const secret = protection === PasteProtection.PIN ? pin : password;
    if (protection === PasteProtection.PIN && !/^\d{4,8}$/.test(pin)) {
      toast.error('El PIN debe contener entre 4 y 8 dígitos');
      return;
    }
    if (protection === PasteProtection.PASSWORD && password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (liveEnabled && burnAfterRead) {
      toast.error('Live Share no es compatible con Burn After Read');
      return;
    }

    try {
      setCreationStage('Cifrando contenido…');
      const currentDek = ensureDEK();
      const { ciphertext, nonce } = await encryptContent(currentDek, content || ' ');
      const saltBuffer = generateSalt();
      let wrappedKey: string | undefined;
      let accessProof: string | undefined;

      if (protection !== PasteProtection.NONE) {
        setCreationStage('Derivando clave con Argon2id…');
        const wrapped = await wrapDEK(currentDek, secret, saltBuffer);
        wrappedKey = wrapped.wrappedKey;
        accessProof = wrapped.accessProof;
      }

      setCreationStage('Creando paste…');
      const paste = await createPaste.mutateAsync({
        ciphertext,
        nonce,
        salt: bufferToBase64(saltBuffer),
        wrappedKey,
        accessProof,
        protection,
        contentType: 'text/html',
        expiresInSeconds: Number(expiresIn),
        burnAfterRead,
      });

      saveOwnerToken(paste.publicId, paste.deleteToken);
      if (protection === PasteProtection.NONE) {
        saveLocalPasteKey(paste.publicId, bufferToBase64Url(currentDek));
      }
      setOwnerToken(paste.deleteToken);
      let liveViewerToken: string | undefined;

      try {
        for (const [index, asset] of pendingAssets.entries()) {
          setCreationStage(`Cifrando y subiendo archivo ${index + 1} de ${pendingAssets.length}…`);
          const encrypted = await encryptBinary(currentDek, await asset.file.arrayBuffer());
          const signed = await createUploadUrl.mutateAsync({
            ownerToken: paste.deleteToken,
            request: {
              pasteId: paste.publicId,
              size: encrypted.ciphertext.byteLength,
              mimeType: asset.file.type || 'application/octet-stream',
              nonce: encrypted.nonce,
            },
          });
          await uploadToSignedUrl(signed.uploadUrl, encrypted.ciphertext, signed.requiredHeaders);
          await completeUpload.mutateAsync({
            assetId: signed.assetId,
            ownerToken: paste.deleteToken,
          });
        }
      } catch (error) {
        await deletePaste
          .mutateAsync({ publicId: paste.publicId, ownerToken: paste.deleteToken })
          .catch(() => undefined);
        throw new Error(
          `Las imágenes siguen en este dispositivo. ${assetFailureMessage(error)}`,
        );
      }

      if (pendingAssets.length > 0) clearPendingAssets();

      if (liveEnabled) {
        setCreationStage('Iniciando Live Share…');
        try {
          const session = await createLiveSession.mutateAsync({
            publicId: paste.publicId,
            ownerToken: paste.deleteToken,
          });
          setLiveSession(session);
          liveViewerToken = session.viewerToken;
        } catch {
          setLiveSession(null);
          toast.warning('El paste se creó, pero Live Share no pudo iniciarse.');
        }
      } else {
        setLiveSession(null);
      }

      const fragment = new URLSearchParams();
      if (protection === PasteProtection.NONE) {
        fragment.set('key', bufferToBase64Url(currentDek));
      }
      if (liveViewerToken) fragment.set('live', liveViewerToken);
      const keyFragment = fragment.size > 0 ? `#${fragment.toString()}` : '';
      toast.success('Paste creado correctamente');
      router.push(`/p/${paste.publicId}${keyFragment}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el paste');
    } finally {
      setCreationStage(undefined);
    }
  };

  return (
    <aside className="w-full overflow-y-auto border-t bg-card xl:h-full xl:w-[23rem] xl:shrink-0 xl:border-l xl:border-t-0">
      <div className="flex min-h-full flex-col">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Configuración del paste</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Define acceso, duración y comportamiento antes de compartir.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'general' | 'advanced')}
          className="min-w-0 flex-1 flex-col p-4"
        >
          <TabsList
            className={cn(
              'mb-5 grid h-11 w-full grid-cols-2 overflow-hidden rounded-xl border-0 p-0 transition-colors',
              activeTab === 'general'
                ? 'border-primary/20 bg-primary/[0.08]'
                : 'border-slate-900/15 bg-slate-900/[0.06] dark:border-slate-100/15 dark:bg-slate-100/10',
            )}
          >
            <TabsTrigger
              value="general"
              className={cn(
                'h-full min-h-0 gap-2 rounded-none rounded-l-[11px] border-0 after:hidden transition-colors',
                activeTab === 'general'
                  ? 'bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Settings2 size={15} /> General
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className={cn(
                'h-full min-h-0 gap-2 rounded-none rounded-r-[11px] border-0 after:hidden transition-colors',
                activeTab === 'advanced'
                  ? 'bg-slate-900 text-white shadow-sm hover:text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:text-slate-950'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles size={15} /> Avanzado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="w-full min-w-0 space-y-5">
            <section className="rounded-xl border border-primary/15 bg-primary/[0.05] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Settings2 size={17} /></span>
                <div>
                  <h3 className="text-sm font-semibold">Acceso y duración</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Define cuánto tiempo vivirá el enlace y qué necesita quien lo reciba para abrirlo.</p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-primary" />
                <Label htmlFor="expiration" className="text-sm font-semibold">Expiración</Label>
              </div>
              <select
                id="expiration"
                value={expiresIn}
                onChange={(event) => setExpiresIn(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="600">10 minutos</option>
                <option value="3600">1 hora</option>
                <option value="86400">1 día</option>
                <option value="604800">1 semana</option>
                <option value="2592000">30 días</option>
              </select>
            </section>

            <section className="space-y-3 border-t pt-5">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-primary" />
                  <h3 className="text-sm font-semibold">Protección de acceso</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecciona una opción; el secreto nunca sale del navegador.
                </p>
              </div>

              <div className="grid gap-2">
                {protectionOptions.map(({ value, label, description, icon: Icon }) => {
                  const selected = protection === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setProtection(value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-foreground/20 hover:bg-muted/40',
                      )}
                    >
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{description}</span>
                      </span>
                      <span className={cn('h-4 w-4 rounded-full border-2', selected ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-muted-foreground/40')} />
                    </button>
                  );
                })}
              </div>

              {protection === PasteProtection.PIN && (
                <div className="rounded-xl border bg-muted/30 p-3">
                  <Label htmlFor="paste-pin" className="text-xs font-medium">PIN numérico</Label>
                  <Input
                    id="paste-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="4 a 8 dígitos"
                    className={cn(
                      'mt-2 h-10 text-center',
                      pin.length > 0 && 'tracking-[0.3em]',
                    )}
                    value={pin}
                    maxLength={8}
                    autoFocus
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  />
                  <p className={cn('mt-2 text-xs', pin.length > 0 && !/^\d{4,8}$/.test(pin) ? 'text-amber-600' : 'text-muted-foreground')}>
                    {pin.length}/8 dígitos · mínimo 4
                  </p>
                </div>
              )}

              {protection === PasteProtection.PASSWORD && (
                <div className="rounded-xl border bg-muted/30 p-3">
                  <Label htmlFor="paste-password" className="text-xs font-medium">Contraseña</Label>
                  <Input
                    id="paste-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="mt-2 h-10"
                    value={password}
                    autoFocus
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <p className={cn('mt-2 text-xs', password.length > 0 && password.length < 8 ? 'text-amber-600' : 'text-muted-foreground')}>
                    {password.length} caracteres · mínimo 8
                  </p>
                </div>
              )}
            </section>

            {pendingAssets.length > 0 && (
              <section className={cn('rounded-xl border p-3', r2Unavailable ? 'border-amber-500/30 bg-amber-500/10' : 'border-blue-500/20 bg-blue-500/5')}>
                <div className="flex items-start gap-3">
                  {r2Unavailable ? <AlertTriangle className="mt-0.5 text-amber-600" size={17} /> : <ImageIcon className="mt-0.5 text-blue-600" size={17} />}
                  <div>
                    <p className="text-sm font-medium">{pendingAssets.length} archivo(s) preparado(s)</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {r2Unavailable
                        ? 'La previsualización local funciona, pero debes configurar las credenciales R2 en Docker antes de subir.'
                        : 'Se cifrarán localmente y se subirán directamente al bucket privado R2 al crear el paste.'}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="w-full min-w-0 space-y-4">
            <section className="rounded-xl bg-slate-900 p-4 text-white dark:bg-slate-100 dark:text-slate-950">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-300 dark:bg-slate-900 dark:text-white"><Sparkles size={17} /></span>
                <div>
                  <h3 className="text-sm font-semibold">Comportamiento del enlace</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-300 dark:text-slate-600">Activa reglas especiales para contenido sensible o para compartir cambios en tiempo real.</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><EyeOff size={16} /> Burn After Read</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">El primer acceso válido consume el paste. No es compatible con Live Share.</p>
                </div>
                <Switch
                  aria-label="Activar Burn After Read"
                  checked={burnAfterRead}
                  onCheckedChange={(checked) => {
                    setBurnAfterRead(checked);
                    if (checked) setLiveEnabled(false);
                  }}
                />
              </div>
            </section>

            <section className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><Radio size={16} className="text-blue-600" /> Live Share</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Sincroniza snapshots cifrados por WebSocket con debounce.</p>
                </div>
                <Switch
                  aria-label="Activar Live Share"
                  checked={liveEnabled}
                  disabled={burnAfterRead}
                  onCheckedChange={setLiveEnabled}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-primary" /> Seguridad aplicada</div>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <li>• AES-256-GCM para contenido y archivos.</li>
                <li>• Argon2id para PIN y contraseña.</li>
                <li>• Nonce único por objeto cifrado.</li>
                <li>• La clave compartida viaja en el fragmento # de la URL.</li>
              </ul>
            </section>

            {burnAfterRead && liveEnabled && (
              <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700">
                <AlertTriangle size={16} /> Desactiva una de las dos opciones para continuar.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          {creationStage && <p className="mb-2 text-center text-xs text-muted-foreground">{creationStage}</p>}
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isPending || (pendingAssets.length > 0 && r2Unavailable)}
            className="h-11 w-full"
          >
            {isPending && <Loader2 className="animate-spin" />}
            {pendingAssets.length > 0
              ? r2Unavailable
                ? 'Configura R2 para subir archivos'
                : `Crear y subir ${pendingAssets.length} archivo(s)`
              : 'Crear paste seguro'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
