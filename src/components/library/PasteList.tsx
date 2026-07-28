'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Copy, ExternalLink, FileText, Heart, Image as ImageIcon, Link2, Loader2 } from 'lucide-react';
import { PasteSummary } from '@/contracts';
import { useToggleFavorite, useUpdateSlug } from '@/hooks/useAccountApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { loadLocalPasteKey } from '@/lib/local-key-cache';

const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function PasteList({ items, loading, emptyText }: { items?: PasteSummary[]; loading: boolean; emptyText: string }) {
  const toggle = useToggleFavorite();
  const updateSlug = useUpdateSlug();
  const [editing, setEditing] = useState<string>();
  const [slug, setSlug] = useState('');
  const isMounted = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);

  if (loading) return <div className="flex min-h-56 items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!items?.length) return <div className="rounded-[1.3rem] border border-dashed p-12 text-center text-sm text-muted-foreground">{emptyText}</div>;

  return (
    <div className="grid gap-3">
      {items.map((paste) => {
        const routeId = paste.customSlug || paste.publicId;
        const localKey = isMounted ? loadLocalPasteKey(paste.publicId) : null;
        const keyFragment = localKey ? `#key=${encodeURIComponent(localKey)}` : '';
        return (
          <article key={paste.publicId} className="rounded-[1.2rem] border bg-card p-5 transition hover:border-primary/25">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><FileText size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/p/${routeId}${keyFragment}`} className="truncate font-medium hover:text-primary">/{routeId}</Link>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium">{paste.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Creado {formatDistanceToNow(new Date(paste.createdAt), { addSuffix: true, locale: es })} · {paste.accessCount} accesos · {paste.assetCount} archivos
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label="Favorito" onClick={() => void toggle.mutateAsync({ publicId: paste.publicId, favorite: paste.favorite })}>
                  <Heart size={17} className={paste.favorite ? 'fill-rose-500 text-rose-500' : ''} />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Copiar enlace" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/p/${routeId}${keyFragment}`); toast.success('Enlace copiado'); }}><Copy size={17} /></Button>
                <Link href={`/p/${routeId}${keyFragment}`} aria-label="Abrir" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"><ExternalLink size={17} /></Link>
              </div>
            </div>

            {paste.owned && editing === paste.publicId ? (
              <form className="mt-4 flex gap-2 border-t pt-4" onSubmit={(event) => {
                event.preventDefault();
                void updateSlug.mutateAsync({ publicId: paste.publicId, slug }).then(() => { setEditing(undefined); toast.success('URL personalizada actualizada'); }).catch((error) => toast.error(error.message));
              }}>
                <Input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mi-enlace-personalizado" minLength={4} maxLength={60} />
                <Button type="submit" disabled={updateSlug.isPending}>Guardar</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Cancelar</Button>
              </form>
            ) : paste.owned ? (
              <button className="mt-4 flex items-center gap-2 border-t pt-3 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => { setEditing(paste.publicId); setSlug(paste.customSlug || ''); }}>
                <Link2 size={14} /> {paste.customSlug ? 'Editar URL personalizada' : 'Crear URL personalizada'}
                {paste.assetCount > 0 && <span className="ml-auto flex items-center gap-1"><ImageIcon size={13} /> Assets cifrados</span>}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
