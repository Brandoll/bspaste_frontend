'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/useAccountApi';
import { useAuthStore } from '@/stores/useAuthStore';
import { createAccountVault } from '@/lib/account-vault';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '' });
  const register = useRegister();
  const setSession = useAuthStore((state) => state.setSession);
  const setVaultKey = useAuthStore((state) => state.setVaultKey);
  const router = useRouter();
  const field = (name: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [name]: event.target.value }));

  return <AppShell canvasClassName="overflow-y-auto"><main className="mx-auto w-full max-w-lg px-5 py-12 sm:py-16">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserPlus size={19} /></span>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">Crea tu espacio</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">El correo es opcional por ahora. Iniciarás sesión rápidamente con tu username.</p>
    <form className="mt-8 grid gap-5 rounded-[1.4rem] border bg-card p-6 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      void (async () => {
        const { vaultKey, bundle } = await createAccountVault(form.password);
        const session = await register.mutateAsync({
          ...form,
          email: form.email || undefined,
          displayName: form.displayName || undefined,
          vaultSalt: bundle.salt,
          wrappedVaultKey: bundle.wrappedKey,
        });
        setSession(session.user, session.accessToken);
        setVaultKey(vaultKey);
        router.push('/dashboard');
        toast.success('Cuenta y bóveda cifrada creadas');
      })().catch((error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear la cuenta'));
    }}>
      <div><Label htmlFor="reg-username">Nombre de usuario</Label><Input id="reg-username" className="mt-2" value={form.username} onChange={field('username')} pattern="[A-Za-z0-9_]{3,30}" required /></div>
      <div><Label htmlFor="reg-name">Nombre visible</Label><Input id="reg-name" className="mt-2" value={form.displayName} onChange={field('displayName')} /></div>
      <div className="sm:col-span-2"><Label htmlFor="reg-email">Correo <span className="text-muted-foreground">(opcional)</span></Label><Input id="reg-email" className="mt-2" type="email" value={form.email} onChange={field('email')} /></div>
      <div className="sm:col-span-2"><Label htmlFor="reg-password">Contraseña</Label><Input id="reg-password" className="mt-2" type="password" minLength={10} autoComplete="new-password" value={form.password} onChange={field('password')} required /><p className="mt-2 text-xs text-muted-foreground">Mínimo 10 caracteres.</p></div>
      <Button type="submit" className="h-11 sm:col-span-2" disabled={register.isPending}>{register.isPending && <Loader2 className="animate-spin" />} Crear cuenta segura</Button>
    </form>
    <p className="mt-5 text-center text-sm text-muted-foreground">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-primary">Iniciar sesión</Link></p>
  </main></AppShell>;
}
