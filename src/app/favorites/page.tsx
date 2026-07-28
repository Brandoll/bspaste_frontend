'use client';

import { Heart } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';
import { PasteList } from '@/components/library/PasteList';
import { useFavorites } from '@/hooks/useAccountApi';

export default function FavoritesPage() {
  const favorites = useFavorites();
  return <AppShell canvasClassName="overflow-y-auto"><AuthGate><main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <header><span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"><Heart size={18} /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight">Favoritos</h1><p className="mt-2 text-sm text-muted-foreground">Pastes propios o compartidos que quieres conservar a mano.</p></header>
    <section className="mt-9"><PasteList items={favorites.data} loading={favorites.isLoading} emptyText="Aún no guardaste ningún paste como favorito." /></section>
  </main></AuthGate></AppShell>;
}
