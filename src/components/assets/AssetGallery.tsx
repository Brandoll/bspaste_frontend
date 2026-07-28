'use client';

import { Download, File, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PasteAsset } from '@/contracts';
import { useDeleteAsset, useGetAssetUrl } from '@/hooks/usePasteApi';
import { decryptBinary } from '@/lib/crypto';
import { Button } from '@/components/ui/button';

interface AssetGalleryProps {
  assets: PasteAsset[];
  dek: Uint8Array;
  accessToken?: string;
  ownerToken?: string;
}

function AssetCard({ asset, dek, accessToken, ownerToken, onDeleted }: AssetGalleryProps & { asset: PasteAsset; onDeleted: () => void }) {
  const getUrl = useGetAssetUrl();
  const deleteAsset = useDeleteAsset();
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const decryptAsset = async (): Promise<string> => {
    if (objectUrl) return objectUrl;
    if (!asset.nonce) throw new Error('El asset no contiene un nonce válido.');
    const signed = await getUrl.mutateAsync({ assetId: asset.id, accessToken });
    const encryptedResponse = await fetch(signed.url, { cache: 'no-store' });
    if (!encryptedResponse.ok) throw new Error('No se pudo descargar el asset cifrado desde R2.');
    const plaintext = await decryptBinary(dek, await encryptedResponse.arrayBuffer(), asset.nonce);
    const nextUrl = URL.createObjectURL(new Blob([plaintext], { type: asset.mimeType }));
    setObjectUrl(nextUrl);
    return nextUrl;
  };

  const openOrDownload = async () => {
    try {
      const url = await decryptAsset();
      const link = document.createElement('a');
      link.href = url;
      link.download = `bspaste-${asset.id}`;
      link.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descifrar el archivo.');
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border bg-background">
      <div className="flex aspect-video items-center justify-center bg-muted/40">
        {objectUrl && asset.mimeType.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt="Asset descifrado" className="h-full w-full object-contain" />
        ) : asset.mimeType.startsWith('image/') ? (
          <ImageIcon className="text-muted-foreground" size={30} />
        ) : (
          <File className="text-muted-foreground" size={30} />
        )}
      </div>
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{asset.mimeType}</p>
          <p className="text-[11px] text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB cifrados</p>
        </div>
        <Button type="button" size="icon" variant="ghost" aria-label="Descargar asset" onClick={() => void openOrDownload()} disabled={getUrl.isPending}>
          {getUrl.isPending ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
        </Button>
        {ownerToken && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Eliminar asset"
            className="text-destructive"
            disabled={deleteAsset.isPending}
            onClick={() => {
              void deleteAsset.mutateAsync({ assetId: asset.id, ownerToken })
                .then(() => { onDeleted(); toast.success('Asset eliminado'); })
                .catch((error: Error) => toast.error(error.message));
            }}
          ><Trash2 size={16} /></Button>
        )}
      </div>
    </article>
  );
}

export function AssetGallery({ assets, dek, accessToken, ownerToken }: AssetGalleryProps) {
  const [visibleAssets, setVisibleAssets] = useState(assets);

  if (visibleAssets.length === 0) return null;

  return (
    <section className="border-t bg-muted/20 p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Archivos cifrados</h2>
        <p className="text-xs text-muted-foreground">Se descargan desde R2 y se descifran localmente.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            assets={visibleAssets}
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
