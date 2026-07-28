'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppShell>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 text-center lg:min-h-full">
        <div className="max-w-md rounded-[1.4rem] border bg-card p-8">
          <AlertTriangle className="mx-auto text-amber-500" size={40} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Algo salió mal</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">La operación no pudo completarse. Tus claves y contenido local no se enviaron por este error.</p>
          <Button className="mt-6 rounded-full" onClick={reset}><RotateCcw size={16} /> Reintentar</Button>
        </div>
      </main>
    </AppShell>
  );
}
