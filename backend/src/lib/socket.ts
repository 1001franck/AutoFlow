import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: config.cors.frontendUrl, credentials: true },
  });

  // Vérifie le JWT avant d'accepter la connexion WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('Token manquant'));

    try {
      const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    // Chaque user rejoint sa room privée — les events ne lui sont envoyés qu'à lui
    socket.join(`user:${userId}`);
    socket.on('disconnect', () => socket.leave(`user:${userId}`));
  });

  return io;
}

// Émet un event dans la room d'un user — appelé depuis le worker après chaque run
export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}
