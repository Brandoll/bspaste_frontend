'use client';

import Link from 'next/link';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><LockKeyhole size={21} /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Tu espacio privado</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Inicia sesión para administrar pastes, favoritos, archivos y enlaces personalizados.</p>
        <Link href="/login" className="mt-6 inline-flex h-9 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground">Iniciar sesión</Link>
      </div>
    );
  }
  return children;
}
