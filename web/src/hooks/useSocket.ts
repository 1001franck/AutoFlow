import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/api/client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let sharedSocket: Socket | null = null;

// Retourne la socket partagée, ou en crée une nouvelle avec le token courant
function getSocket(): Socket {
  const token = getAccessToken();
  if (!sharedSocket || !sharedSocket.connected) {
    sharedSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
    });
  }
  return sharedSocket;
}

export function useSocket(event: string, handler: (data: unknown) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const cb = (data: unknown) => handlerRef.current(data);
    socket.on(event, cb);
    return () => { socket.off(event, cb); };
  }, [event]);
}
