import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  FilePlus2,
  KeyRound,
  MonitorSmartphone,
  Radio,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const capabilities = [
  { icon: ShieldCheck, title: 'Cifrado local', text: 'AES-256-GCM antes de salir del navegador.' },
  { icon: KeyRound, title: 'Acceso protegido', text: 'PIN, contraseña y claves derivadas con Argon2id.' },
  { icon: Clock3, title: 'Temporal por diseño', text: 'Expiración y Burn After Read para datos sensibles.' },
];

export default function Home() {
  return (
    <AppShell canvasClassName="overflow-y-auto">
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <header className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Zero knowledge sharing
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Comparte algo.<br />Nosotros protegemos el resto.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Mueve texto, código, capturas y archivos pequeños entre dispositivos con enlaces temporales cifrados de extremo a extremo.
          </p>
        </header>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <Link href="/create" className="group flex min-h-52 flex-col justify-between rounded-[1.4rem] border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-950/5 sm:p-7">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><FilePlus2 size={20} /></span>
              <ArrowRight className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Crear un paste seguro</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Pega contenido, adjunta una captura y define cómo y cuándo podrá abrirse.</p>
            </div>
          </Link>

          <Link href="/create?live=1" className="group flex min-h-52 flex-col justify-between rounded-[1.4rem] border bg-[#101827] p-6 text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/10 sm:p-7">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500"><Radio size={20} /></span>
              <ArrowRight className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Iniciar Live Share</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Escribe en un dispositivo y recibe snapshots cifrados en tiempo real en los demás.</p>
            </div>
          </Link>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex min-h-44 flex-col rounded-[1.25rem] border bg-card p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground"><Icon size={17} /></div>
              <div className="mt-auto pt-7">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><MonitorSmartphone size={15} /> Responsive y PWA</span>
          <span className="flex items-center gap-2"><UploadCloud size={15} /> Assets privados en R2</span>
          <span className="ml-auto font-medium text-foreground">BSPaste · BSDev</span>
        </div>
      </main>
    </AppShell>
  );
}
