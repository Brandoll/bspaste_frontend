'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/useAccountApi';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const setSession = useAuthStore((state) => state.setSession);
  const router = useRouter();

  return <AppShell canvasClassName="overflow-y-auto"><main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-14">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><KeyRound size={19} /></span>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
    <p className="mt-2 text-sm text-muted-foreground">Ingresa con tu nombre de usuario. No necesitas escribir tu correo.</p>
    <form className="mt-8 space-y-5 rounded-[1.4rem] border bg-card p-6" onSubmit={(event) => { event.preventDefault(); void login.mutateAsync({ username, password }).then((session) => { setSession(session.user, session.accessToken); router.push('/dashboard'); toast.success('Sesión iniciada'); }).catch((error) => toast.error(error.message)); }}>
      <div><Label htmlFor="username">Nombre de usuario</Label><Input id="username" className="mt-2" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div>
      <div><Label htmlFor="password">Contraseña</Label><Input id="password" className="mt-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      <Button type="submit" className="h-11 w-full" disabled={login.isPending}>{login.isPending && <Loader2 className="animate-spin" />} Iniciar sesión</Button>
    </form>
    <p className="mt-5 text-center text-sm text-muted-foreground">¿Aún no tienes cuenta? <Link href="/register" className="font-medium text-primary">Crear cuenta</Link></p>
    <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} /> El servidor nunca recibe el contenido descifrado.</p>
  </main></AppShell>;
}
