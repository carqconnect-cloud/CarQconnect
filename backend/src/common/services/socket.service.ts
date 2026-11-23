import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { corsOptions } from '../../config/cors';
import { logger } from '../../config/logger';
import { verifyAccessToken } from '../utils/jwt';

let io: SocketServer | null = null;

export interface AuthenticatedSocket extends Socket {
  authData?: {
    userId: string;
    email: string;
    isSuperAdmin: boolean;
    isSubSuperAdmin?: boolean;
    userType?: string;
    organizationId?: string;
  };
}

/**
 * Initializes and binds the Socket.IO real-time server to the main HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: corsOptions.origin as any,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for incoming Socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        // Allow anonymous connections for public QR scanner live updates if needed
        socket.authData = undefined;
        return next();
      }

      const payload = verifyAccessToken(token);
      socket.authData = {
        userId: payload.sub,
        email: payload.email,
        isSuperAdmin: Boolean(payload.isSuperAdmin),
        isSubSuperAdmin: Boolean(payload.isSubSuperAdmin),
        userType: payload.userType,
        organizationId: payload.organizationId,
      };

      return next();
    } catch (err) {
      logger.warn({ err }, '[SocketIO] Authentication failed for socket connection');
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const auth = socket.authData;
    logger.info(
      { socketId: socket.id, userId: auth?.userId || 'anonymous' },
      '[SocketIO] Client connected',
    );

    // Auto-join dedicated rooms
    if (auth?.userId) {
      void socket.join(`user:${auth.userId}`);
      if (auth.isSuperAdmin || auth.isSubSuperAdmin) {
        void socket.join('admin');
        void socket.join('admin:sos');
        void socket.join('admin:orders');
      }
      if (auth.organizationId) {
        void socket.join(`org:${auth.organizationId}`);
      }
    }

    // Room subscription handler for vehicle live tracking
    socket.on('subscribe:vehicle', (vehicleId: string) => {
      if (vehicleId && typeof vehicleId === 'string') {
        void socket.join(`vehicle:${vehicleId}`);
        logger.debug({ socketId: socket.id, vehicleId }, '[SocketIO] Subscribed to vehicle channel');
      }
    });

    socket.on('unsubscribe:vehicle', (vehicleId: string) => {
      if (vehicleId && typeof vehicleId === 'string') {
        void socket.leave(`vehicle:${vehicleId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, '[SocketIO] Client disconnected');
    });
  });

  logger.info('[SocketIO] Real-Time Gateway initialized');
  return io;
}

/**
 * Accessor for the active Socket.IO server instance.
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/**
 * Real-time event dispatchers for live updates across the ecosystem.
 */
export const realTimeService = {
  /** Emit event to a specific user */
  emitToUser(userId: string, event: string, data: unknown): void {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
  },

  /** Emit event to Super Admin consoles */
  emitToAdmin(event: string, data: unknown): void {
    if (!io) return;
    io.to('admin').emit(event, data);
  },

  /** Broadcast emergency SOS alert to Admins and designated user */
  broadcastSosAlert(sosData: { id: string; userId: string; status: string; lat?: number; lng?: number; vehicleReg?: string; address?: string; userName?: string; phone?: string; liveLocationUrl?: string; timestamp?: string }): void {
    if (!io) return;
    io.to('admin:sos').emit('sos:alert', sosData);
    io.to(`user:${sosData.userId}`).emit('sos:status', sosData);
    logger.info({ sosId: sosData.id }, '[SocketIO] Dispatched real-time SOS alert');
  },

  /** Broadcast real-time GPS location coordinates and telematics */
  broadcastGpsLocation(vehicleId: string, locationData: { lat: number; lng: number; speed?: number; heading?: number; timestamp: string }): void {
    if (!io) return;
    io.to(`vehicle:${vehicleId}`).emit('gps:location', locationData);
    io.to('admin').emit('gps:fleet_update', { vehicleId, ...locationData });
  },

  /** Broadcast order status changes (Paid, Dispatched, Delivered) */
  broadcastOrderUpdate(userId: string, orderData: { id: string; orderNo?: string; status: string; carrier?: string; awbCode?: string; trackingUrl?: string }): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('order:update', orderData);
    io.to('admin:orders').emit('order:status_changed', orderData);
  },

  /** Broadcast high-priority in-app notification */
  broadcastNotification(userId: string, notification: { id: string; title: string; description: string; type: string }): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification:new', notification);
  },
};

