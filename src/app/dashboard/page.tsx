'use client';

import Link from 'next/link';
import { FilePlus2, Files, Heart, Image as ImageIcon } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';
import { PasteList } from '@/components/library/PasteList';
import { useLibraryPastes } from '@/hooks/useAccountApi';
import { useAuthStore } from '@/stores/useAuthStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const pastes = useLibraryPastes();
  return <AppShell canvasClassName="overflow-y-auto"><AuthGate><main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Biblioteca privada</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Hola, {user?.displayName || user?.username}</h1><p className="mt-2 text-sm text-muted-foreground">Administra tus enlaces cifrados desde un solo lugar.</p></div>
      <Link href="/create" className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><FilePlus2 size={16} /> Nuevo paste</Link>
    </header>
    <section className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-[1.2rem] border bg-card p-5"><Files className="text-primary" size={19} /><p className="mt-5 text-2xl font-semibold">{pastes.data?.length ?? 0}</p><p className="text-xs text-muted-foreground">Pastes creados</p></div>
      <Link href="/favorites" className="rounded-[1.2rem] border bg-card p-5 transition hover:border-primary/30"><Heart className="text-rose-500" size={19} /><p className="mt-5 font-semibold">Favoritos</p><p className="text-xs text-muted-foreground">Acceso rápido a tus enlaces</p></Link>
      <Link href="/assets" className="rounded-[1.2rem] border bg-card p-5 transition hover:border-primary/30"><ImageIcon className="text-blue-500" size={19} /><p className="mt-5 font-semibold">Imágenes y archivos</p><p className="text-xs text-muted-foreground">Assets cifrados almacenados en R2</p></Link>
    </section>
    <section className="mt-10"><h2 className="mb-4 text-lg font-semibold">Mis pastes</h2><PasteList items={pastes.data} loading={pastes.isLoading} emptyText="Todavía no has creado pastes con esta cuenta." /></section>
  </main></AuthGate></AppShell>;
}
