'use client';

import { ClientToServerEvents, EncryptedUpdate, ServerToClientEvents } from '@/contracts';
import { decryptContent, encryptContent } from '@/lib/crypto';
import { usePasteStore } from '@/stores/usePasteStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001/live';
const UPDATE_DEBOUNCE_MS = 250;

type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useLiveShare() {
  const { liveSession, dek, setContent } = usePasteStore();
  const [sharedViewerToken] = useState(() => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.hash.slice(1)).get('live') ?? undefined;
  });
  const liveToken = liveSession?.editorToken ?? liveSession?.viewerToken ?? sharedViewerToken;
  const socketRef = useRef<LiveSocket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const baseVersion = useRef(0);
  const clientId = useRef<string | undefined>(undefined);
  const presentClients = useRef(new Set<string>());
  const [isConnected, setIsConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);

  useEffect(() => {
    const token = liveToken;
    if (!token) return;
    clientId.current ??= crypto.randomUUID();
    const clients = presentClients.current;

    const socket: LiveSocket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('paste.join');
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('exception', (error) => {
      toast.error(error.message ?? 'Live Share rechazó la actualización');
      socket.emit('paste.join');
    });
    socket.on('paste.join', (snapshot) => {
      baseVersion.current = snapshot.version;
      if (!dek) return;
      void decryptContent(dek, snapshot.ciphertext, snapshot.nonce)
        .then(setContent)
        .catch(() => toast.error('No se pudo descifrar el snapshot de Live Share'));
    });
    socket.on('paste.update', (update) => {
      baseVersion.current = update.baseVersion;
      if (update.clientId === clientId.current || !dek) return;
      void decryptContent(dek, update.ciphertext, update.nonce)
        .then(setContent)
        .catch(() => toast.error('No se pudo descifrar una actualización de Live Share'));
    });
    socket.on('paste.lock', ({ reason }) => {
      toast.info(reason === 'deleted' ? 'El paste fue eliminado' : 'La sesión fue bloqueada');
    });

    socket.on('presence.update', ({ clientId: presentClientId, state }) => {
      if (state === 'left') clients.delete(presentClientId);
      else clients.add(presentClientId);
      setPresenceCount(clients.size);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.emit('paste.leave');
      socket.disconnect();
      socketRef.current = null;
      clients.clear();
      setPresenceCount(0);
      setIsConnected(false);
    };
  }, [dek, liveToken, setContent]);

  const emitUpdate = useCallback(
    (content: string) => {
      if (!liveSession?.editorToken || !dek) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const socket = socketRef.current;
        const id = clientId.current;
        if (!socket?.connected || !id) return;
        void encryptContent(dek, content)
          .then(({ ciphertext, nonce }) => {
            const update: EncryptedUpdate = {
              ciphertext,
              nonce,
              baseVersion: baseVersion.current,
              clientId: id,
            };
            socket.emit('paste.update', update);
          })
          .catch(() => toast.error('No se pudo cifrar la actualización de Live Share'));
      }, UPDATE_DEBOUNCE_MS);
    },
    [dek, liveSession?.editorToken],
  );

  return { isConnected, isLive: Boolean(liveToken), presenceCount, emitUpdate };
}
