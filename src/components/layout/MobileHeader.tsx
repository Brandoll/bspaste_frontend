'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FilePlus2,
  Files,
  Heart,
  Image as ImageIcon,
  Loader2,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useLogout } from '@/hooks/useAccountApi';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MobileHeader() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const logout = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      clearSession();
      router.replace('/');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/90 px-3 backdrop-blur-xl sm:px-4 lg:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck size={17} />
        </span>
        <span className="truncate">BSPaste</span>
      </Link>

      <nav className="flex shrink-0 items-center gap-0.5">
        <Link href="/create" aria-label="Crear paste" className="rounded-full p-2.5 hover:bg-accent"><FilePlus2 size={18} /></Link>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Abrir menú de cuenta"
              render={<button type="button" className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring" />}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2">
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block truncate text-sm font-semibold text-foreground">{user.displayName || user.username}</span>
                <span className="block truncate font-normal">@{user.username}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="px-2 py-2" render={<Link href="/dashboard" />}><Files /> Mis pastes</DropdownMenuItem>
              <DropdownMenuItem className="px-2 py-2" render={<Link href="/favorites" />}><Heart /> Favoritos</DropdownMenuItem>
              <DropdownMenuItem className="px-2 py-2" render={<Link href="/assets" />}><ImageIcon /> Imágenes y archivos</DropdownMenuItem>
              <DropdownMenuItem className="px-2 py-2" render={<Link href="/settings" />}><Settings /> Configuración</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={logout.isPending}
                className="px-2 py-2"
                onClick={() => void handleLogout()}
              >
                {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/login" aria-label="Iniciar sesión" className="rounded-full p-2.5 hover:bg-accent"><LogIn size={18} /></Link>
            <Link href="/settings" aria-label="Configuración" className="rounded-full p-2.5 hover:bg-accent"><Settings size={18} /></Link>
          </>
        )}
      </nav>
    </header>
  );
}
