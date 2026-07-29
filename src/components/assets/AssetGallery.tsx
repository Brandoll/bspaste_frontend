'use client';

import {
  Clipboard,
  Download,
  ExternalLink,
  File,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PasteAsset } from '@/contracts';
import { useDeleteAsset, useGetAssetUrl } from '@/hooks/usePasteApi';
import { decryptBinary } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AssetGalleryProps {
  assets: PasteAsset[];
  dek: Uint8Array;
  accessToken?: string;
  ownerToken?: string;
}

interface AssetCardProps {
  asset: PasteAsset;
  dek: Uint8Array;
  accessToken?: string;
  ownerToken?: string;
  onDeleted: () => void;
}

function AssetCard({ asset, dek, accessToken, ownerToken, onDeleted }: AssetCardProps) {
  const getUrl = useGetAssetUrl();
  const deleteAsset = useDeleteAsset();
  const cardRef = useRef<HTMLElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const image = asset.mimeType.startsWith('image/');

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const decryptAsset = useCallback(async (): Promise<{ url: string; blob: Blob }> => {
    if (objectUrl && blobRef.current) return { url: objectUrl, blob: blobRef.current };
    if (!asset.nonce) throw new Error('El archivo no contiene un nonce válido.');
    setLoading(true);
    try {
      const signed = await getUrl.mutateAsync({ assetId: asset.id, accessToken });
      const encryptedResponse = await fetch(signed.url, { cache: 'no-store' });
      if (!encryptedResponse.ok) throw new Error('No se pudo descargar el archivo cifrado desde R2.');
      const plaintext = await decryptBinary(dek, await encryptedResponse.arrayBuffer(), asset.nonce);
      const blob = new Blob([plaintext], { type: asset.mimeType });
      const url = URL.createObjectURL(blob);
      blobRef.current = blob;
      setObjectUrl(url);
      return { url, blob };
    } finally {
      setLoading(false);
    }
  }, [accessToken, asset.id, asset.mimeType, asset.nonce, dek, getUrl, objectUrl]);

  useEffect(() => {
    if (!visible || !image || objectUrl || loading) return;
    void decryptAsset().catch(() => undefined);
  }, [decryptAsset, image, loading, objectUrl, visible]);

  const download = async () => {
    try {
      const { url } = await decryptAsset();
      const link = document.createElement('a');
      link.href = url;
      link.download = `bspaste-${asset.id}`;
      link.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descifrar el archivo.');
    }
  };

  const openInTab = async () => {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      const { url } = await decryptAsset();
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir el archivo.');
    }
  };

  const copyImage = async () => {
    try {
      const { blob } = await decryptAsset();
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Este navegador no permite copiar imágenes.');
      }
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('Imagen copiada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo copiar la imagen.');
    }
  };

  return (
    <>
      <article ref={cardRef} className="group overflow-hidden rounded-xl border bg-background">
        <button
          type="button"
          disabled={!image || loading}
          onClick={() => setViewerOpen(true)}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted/40"
        >
          {objectUrl && image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={objectUrl} alt="Imagen descifrada" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
          ) : loading ? (
            <Loader2 className="animate-spin text-muted-foreground" size={26} />
          ) : image ? (
            <ImageIcon className="text-muted-foreground" size={30} />
          ) : (
            <File className="text-muted-foreground" size={30} />
          )}
          {objectUrl && image && <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"><Maximize2 size={14} /></span>}
        </button>
        <div className="flex items-center gap-1 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{asset.mimeType}</p>
            <p className="text-[11px] text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB cifrados</p>
          </div>
          {image && <Button type="button" size="icon" variant="ghost" aria-label="Copiar imagen" onClick={() => void copyImage()}><Clipboard size={15} /></Button>}
          <Button type="button" size="icon" variant="ghost" aria-label="Abrir en otra pestaña" onClick={() => void openInTab()}><ExternalLink size={15} /></Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Descargar archivo" onClick={() => void download()} disabled={loading}><Download size={15} /></Button>
          {ownerToken && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Eliminar archivo"
              className="text-destructive"
              disabled={deleteAsset.isPending}
              onClick={() => {
                if (!window.confirm('¿Eliminar definitivamente este archivo?')) return;
                void deleteAsset.mutateAsync({ assetId: asset.id, ownerToken })
                  .then(() => { onDeleted(); toast.success('Archivo eliminado'); })
                  .catch((error: Error) => toast.error(error.message));
              }}
            ><Trash2 size={15} /></Button>
          )}
        </div>
      </article>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Vista previa cifrada</DialogTitle></DialogHeader>
          {objectUrl && image && (
            <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-black/95 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={objectUrl} alt="Vista ampliada" className="max-h-[72vh] max-w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AssetGallery({ assets, dek, accessToken, ownerToken }: AssetGalleryProps) {
  const [visibleAssets, setVisibleAssets] = useState(assets);

  if (visibleAssets.length === 0) return null;

  return (
    <section className="border-t bg-muted/20 p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Imágenes y archivos</h2>
        <p className="text-xs text-muted-foreground">Las miniaturas se descifran localmente conforme aparecen en pantalla.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            dek={dek}
            accessToken={accessToken}
            ownerToken={ownerToken}
            onDeleted={() => setVisibleAssets((current) => current.filter((item) => item.id !== asset.id))}
          />
        ))}
      </div>
    </section>
  );
}
