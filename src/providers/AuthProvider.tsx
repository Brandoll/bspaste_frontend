'use client';

import { AuthResponse } from '@/contracts';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    const refresh = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('No active session');
        const session = (await response.json()) as AuthResponse;
        if (!active) return;
        setSession(session.user, session.accessToken);
        refreshTimer = window.setTimeout(refresh, Math.max(60, session.expiresIn - 60) * 1000);
      } catch {
        if (active) clearSession();
      }
    };

    void refresh();
    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [clearSession, setSession]);

  return children;
}
