'use client';

import Link from 'next/link';
import { FilePlus2, Files, LogIn, Settings, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export function MobileHeader() {
  const user = useAuthStore((state) => state.user);
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck size={17} />
        </span>
        BSPaste
      </Link>
      <nav className="flex items-center gap-1">
        <Link href="/create" aria-label="Crear paste" className="rounded-full p-2.5 hover:bg-accent"><FilePlus2 size={18} /></Link>
        <Link href={user ? '/dashboard' : '/login'} aria-label={user ? 'Mis pastes' : 'Iniciar sesión'} className="rounded-full p-2.5 hover:bg-accent">{user ? <Files size={18} /> : <LogIn size={18} />}</Link>
        <Link href="/settings" aria-label="Configuración" className="rounded-full p-2.5 hover:bg-accent"><Settings size={18} /></Link>
      </nav>
    </header>
  );
}
