'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FilePlus2, Files, Heart, Home, Image as ImageIcon, LogIn, LogOut, Radio, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLogout } from '@/hooks/useAccountApi';
import { useRouter } from 'next/navigation';

const API_DOCS_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api\/v1\/?$/, '')}/docs`;

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const logout = useLogout();
  const router = useRouter();
  const navigation = [
    { href: '/', label: 'Inicio', icon: Home, active: pathname === '/' },
    { href: '/create', label: 'Crear paste', icon: FilePlus2, active: pathname === '/create' },
    { href: '/create?live=1', label: 'Live Share', icon: Radio, active: pathname.startsWith('/live') },
    ...(user ? [
      { href: '/dashboard', label: 'Mis pastes', icon: Files, active: pathname === '/dashboard' },
      { href: '/favorites', label: 'Favoritos', icon: Heart, active: pathname === '/favorites' },
      { href: '/assets', label: 'Imágenes y archivos', icon: ImageIcon, active: pathname === '/assets' },
    ] : []),
    { href: '/settings', label: 'Configuración', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <aside className="hidden h-screen w-[15.5rem] shrink-0 flex-col bg-transparent p-4 lg:flex">
      <Link href="/" className="flex h-11 items-center gap-3 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck size={17} />
        </span>
        <span>
          <span className="block text-[15px] font-bold tracking-[-0.02em]">BSPaste</span>
          <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">BSDev ecosystem</span>
        </span>
      </Link>

      <nav className="mt-5 flex-1 space-y-1 text-sm">
        {navigation.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex h-10 items-center gap-3 rounded-xl px-3 font-medium transition-colors',
              active
                ? 'bg-foreground/[0.06] text-foreground dark:bg-white/10'
                : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
            )}
          >
            <Icon size={17} strokeWidth={1.8} /> {label}
          </Link>
        ))}
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center gap-3 rounded-xl px-3 font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <BookOpen size={17} strokeWidth={1.8} /> API para developers
        </a>
      </nav>

      <div className="border-t px-2 pt-4">
        {user ? <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{user.username.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.displayName || user.username}</span><span className="block truncate text-[11px] text-muted-foreground">@{user.username}</span></span><button aria-label="Cerrar sesión" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => void logout.mutateAsync().finally(() => { clearSession(); router.push('/'); })}><LogOut size={16} /></button></div> : <Link href="/login" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-muted"><LogIn size={17} /> Iniciar sesión</Link>}
      </div>
    </aside>
  );
}
