'use client';

import Link from 'next/link';
import { ExternalLink, File, Image as ImageIcon, Loader2, LockKeyhole } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { LibraryAsset } from '@/contracts';
import { useLibraryAssets } from '@/hooks/useAccountApi';
import { useGetAssetUrl } from '@/hooks/usePasteApi';
import { base64ToBuffer, decryptBinary, unwrapKeyWithKey } from '@/lib/crypto';
import { useAuthStore } from '@/stores/useAuthStore';

function LibraryAssetCard({ asset, vaultKey }: { asset: LibraryAsset; vaultKey: string | null }) {
  const getUrl = useGetAssetUrl();
  const cardRef = useRef<HTMLElement>(null);
  const attempted = useRef(false);
  const [objectUrl, setObjectUrl] = useState<string>();
  const [loading, setLoading] = useState(false);
  const image = asset.mimeType.startsWith('image/');
  const pasteId = asset.paste.customSlug || asset.paste.publicId;

  const loadPreview = useCallback(async () => {
    if (!image || !vaultKey || !asset.paste.vaultWrappedKey || !asset.nonce || objectUrl) return;
    setLoading(true);
    try {
      const dek = await unwrapKeyWithKey(asset.paste.vaultWrappedKey, base64ToBuffer(vaultKey));
      const signed = await getUrl.mutateAsync({ assetId: asset.id });
      const response = await fetch(signed.url, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo descargar la miniatura cifrada.');
      const plaintext = await decryptBinary(dek, await response.arrayBuffer(), asset.nonce);
      setObjectUrl(URL.createObjectURL(new Blob([plaintext], { type: asset.mimeType })));
    } finally {
      setLoading(false);
    }
  }, [asset, getUrl, image, objectUrl, vaultKey]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !attempted.current) {
        attempted.current = true;
        void loadPreview().catch(() => undefined);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadPreview]);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const open = () => {
    if (objectUrl) window.open(objectUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article ref={cardRef} className="overflow-hidden rounded-[1.2rem] border bg-card transition hover:border-primary/30">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
        {objectUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt="Miniatura descifrada" className="h-full w-full object-cover" />
        ) : loading ? <Loader2 className="animate-spin text-muted-foreground" /> : image ? <ImageIcon className="text-muted-foreground" /> : <File className="text-muted-foreground" />}
        {!objectUrl && <span className="absolute right-3 top-3 rounded-full bg-background/90 p-2 text-emerald-600 shadow-sm"><LockKeyhole size={14} /></span>}
      </div>
      <div className="flex items-center gap-3 p-4">
        <Link href={`/p/${pasteId}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{asset.mimeType}</p>
          <p className="mt-1 text-xs text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB · /{pasteId}</p>
        </Link>
        {objectUrl && <Button type="button" variant="ghost" size="icon" aria-label="Abrir imagen" onClick={open}><ExternalLink size={16} /></Button>}
      </div>
    </article>
  );
}

export default function AssetsPage() {
  const assets = useLibraryAssets();
  const vaultKey = useAuthStore((state) => state.vaultKey);
  return <AppShell canvasClassName="overflow-y-auto"><AuthGate><main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600"><ImageIcon size={18} /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight">Imágenes y archivos</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Miniaturas descifradas localmente. R2 y la API conservan únicamente los bytes cifrados.</p></div>
      {!vaultKey && <Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition hover:bg-accent"><LockKeyhole size={15} /> Desbloquear bóveda</Link>}
    </header>
    {assets.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" /></div> : !assets.data?.length ? <div className="mt-9 rounded-[1.3rem] border border-dashed p-12 text-center text-sm text-muted-foreground">Todavía no tienes archivos asociados a tus pastes.</div> : <section className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assets.data.map((asset) => <LibraryAssetCard key={asset.id} asset={asset} vaultKey={vaultKey} />)}</section>}
  </main></AuthGate></AppShell>;
}
