import Link from 'next/link';
import { FileQuestion, Home, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function NotFound() {
  return (
    <AppShell>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 text-center lg:min-h-full">
        <div className="max-w-md rounded-[1.4rem] border bg-card p-8">
          <FileQuestion className="mx-auto text-primary" size={40} />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Página no encontrada</h1>
          <p className="mt-2 text-muted-foreground">La ruta no existe o el enlace ya no está disponible.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium"><Home size={16} /> Inicio</Link>
            <Link href="/create" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus size={16} /> Crear</Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
