'use client';

import { Copy, Heart, Loader2, QrCode, Radio, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateLiveSession, useDeletePaste } from '@/hooks/usePasteApi';
import { removeOwnerToken } from '@/lib/owner-credentials';
import { usePasteStore } from '@/stores/usePasteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToggleFavorite } from '@/hooks/useAccountApi';

interface PasteActionsProps {
  publicId: string;
  ownerToken?: string;
  owned?: boolean;
}

export function PasteActions({ publicId, ownerToken, owned }: PasteActionsProps) {
  const router = useRouter();
  const deletePaste = useDeletePaste();
  const createLive = useCreateLiveSession();
  const setLiveSession = usePasteStore((state) => state.setLiveSession);
  const [qrUrl, setQrUrl] = useState('');
  const [favorite, setFavorite] = useState(false);
  const accountToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const toggleFavorite = useToggleFavorite();
  const ownerCredential = ownerToken || (owned ? accountToken || undefined : undefined);

  const currentUrl = () => window.location.href;

  const startLive = async () => {
    if (!ownerCredential) return;
    try {
      const session = await createLive.mutateAsync({ publicId, ownerToken: ownerCredential });
      setLiveSession(session);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      fragment.set('live', session.viewerToken);
      router.push(`/live/${publicId}#${fragment.toString()}`);
      toast.success('Live Share iniciado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar Live Share');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => void navigator.clipboard.writeText(currentUrl()).then(() => toast.success('Enlace copiado'))}><Copy size={15} /> <span className="hidden sm:inline">Copiar enlace</span></Button>
      <Button variant="outline" size="icon" aria-label="Mostrar QR" onClick={() => setQrUrl(currentUrl())}><QrCode size={16} /></Button>
      {user && <Button variant="outline" size="icon" aria-label="Guardar favorito" disabled={toggleFavorite.isPending} onClick={() => void toggleFavorite.mutateAsync({ publicId, favorite }).then(() => { setFavorite(!favorite); toast.success(favorite ? 'Quitado de favoritos' : 'Guardado en favoritos'); }).catch((error) => toast.error(error.message))}><Heart size={16} className={favorite ? 'fill-rose-500 text-rose-500' : ''} /></Button>}
      {ownerCredential && (
        <>
          <Button variant="outline" onClick={() => void startLive()} disabled={createLive.isPending}>{createLive.isPending ? <Loader2 className="animate-spin" /> : <Radio />} <span className="hidden sm:inline">Live Share</span></Button>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Eliminar paste"
            disabled={deletePaste.isPending}
            onClick={() => {
              if (!window.confirm('¿Eliminar definitivamente este paste y sus assets?')) return;
              void deletePaste.mutateAsync({ publicId, ownerToken: ownerCredential })
                .then(() => {
                  removeOwnerToken(publicId);
                  toast.success('Paste eliminado');
                  router.replace('/');
                })
                .catch((error: Error) => toast.error(error.message));
            }}
          >{deletePaste.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button>
        </>
      )}

      <Dialog open={Boolean(qrUrl)} onOpenChange={(open) => { if (!open) setQrUrl(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear paste</DialogTitle>
            <DialogDescription>El fragmento contiene la clave o credencial necesaria y no se envía al servidor HTTP.</DialogDescription>
          </DialogHeader>
          {qrUrl && <div className="mx-auto rounded-xl bg-white p-4"><QRCodeSVG value={qrUrl} size={220} level="M" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
