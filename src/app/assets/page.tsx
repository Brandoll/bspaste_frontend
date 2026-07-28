'use client';

import Link from 'next/link';
import { File, Image as ImageIcon, Loader2, LockKeyhole } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';
import { useLibraryAssets } from '@/hooks/useAccountApi';

export default function AssetsPage() {
  const assets = useLibraryAssets();
  return <AppShell canvasClassName="overflow-y-auto"><AuthGate><main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <header><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600"><ImageIcon size={18} /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight">Imágenes y archivos</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Inventario de assets cifrados. La vista previa solo se descifra al abrir el paste con su clave.</p></header>
    {assets.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" /></div> : !assets.data?.length ? <div className="mt-9 rounded-[1.3rem] border border-dashed p-12 text-center text-sm text-muted-foreground">Todavía no tienes archivos asociados a tus pastes.</div> : <section className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assets.data.map((asset) => {
      const pasteId = asset.paste.customSlug || asset.paste.publicId;
      const image = asset.mimeType.startsWith('image/');
      return <Link href={`/p/${pasteId}`} key={asset.id} className="flex min-h-44 flex-col rounded-[1.2rem] border bg-card p-5 transition hover:border-primary/30">
        <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{image ? <ImageIcon size={18} /> : <File size={18} />}</span><LockKeyhole size={15} className="text-emerald-600" /></div>
        <div className="mt-auto pt-7"><p className="truncate text-sm font-medium">{asset.mimeType}</p><p className="mt-1 text-xs text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB · /{pasteId}</p></div>
      </Link>;
    })}</section>}
  </main></AuthGate></AppShell>;
}
