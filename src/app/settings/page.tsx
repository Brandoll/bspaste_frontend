'use client';

import { CheckCircle2, CircleAlert, Cloud, Loader2, Server, ShieldCheck, Wifi } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useHealth } from '@/hooks/usePasteApi';

export default function SettingsPage() {
  const health = useHealth();
  const r2Configured = health.data?.services?.r2Configured;

  return (
    <AppShell canvasClassName="overflow-y-auto">
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sistema</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Configuración</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Estado de los servicios y garantías de privacidad aplicadas por BSPaste.</p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="flex min-h-60 flex-col rounded-[1.4rem] border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-primary"><Server size={19} /></span>
              <div className="flex items-center gap-2 text-xs font-medium">
                {health.isLoading && <><Loader2 className="animate-spin" size={15} /> Verificando</>}
                {health.data && <span className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={15} /> Operativa</span>}
                {health.error && <span className="flex items-center gap-2 text-destructive"><CircleAlert size={15} /> Sin conexión</span>}
              </div>
            </div>
            <div className="mt-auto pt-8">
              <h2 className="font-semibold">API y PostgreSQL</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">La API comprueba su conexión con la base de datos mediante el endpoint de salud.</p>
              {health.data && <p className="mt-3 font-mono text-[11px] text-muted-foreground">{health.data.timestamp}</p>}
              {health.error && <p className="mt-3 text-xs text-destructive">{health.error.message}</p>}
            </div>
          </article>

          <article className="flex min-h-60 flex-col rounded-[1.4rem] border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-primary"><Cloud size={19} /></span>
              <span className={r2Configured ? 'text-xs font-medium text-emerald-600' : 'text-xs font-medium text-amber-600'}>
                {r2Configured ? 'Configurado' : 'Pendiente'}
              </span>
            </div>
            <div className="mt-auto pt-8">
              <h2 className="font-semibold">Cloudflare R2</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {r2Configured
                  ? 'El almacenamiento privado está listo para recibir archivos cifrados mediante URLs firmadas.'
                  : 'Configura las credenciales R2 en Docker para habilitar la subida directa de imágenes y archivos.'}
              </p>
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-[1.4rem] border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><ShieldCheck size={20} /></span>
            <div>
              <h2 className="font-semibold">Privacidad local</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Las claves viven en memoria o en el fragmento de la URL. Los tokens de propietario se guardan únicamente en sessionStorage.</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => void health.refetch()}><Wifi size={15} /> Comprobar</Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
