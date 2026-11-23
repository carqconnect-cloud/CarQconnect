import http from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initSocketServer,
  getSocketServer,
  realTimeService,
} from '../src/common/services/socket.service';

describe('Real-Time Socket.IO Service & Dispatchers', () => {
  let server: http.Server;

  beforeEach(() => {
    vi.restoreAllMocks();
    server = http.createServer();
    initSocketServer(server);
  });

  it('successfully initializes Socket.IO server', () => {
    const io = getSocketServer();
    expect(io).toBeDefined();
    expect(typeof io?.emit).toBe('function');
  });

  it('broadcastSosAlert emits events to admin:sos and user room', () => {
    const io = getSocketServer();
    if (!io) throw new Error('Socket.IO not initialized');

    const toSpy = vi.spyOn(io, 'to');

    const sosPayload = {
      id: 'sos_123',
      userId: 'user_456',
      status: 'PENDING',
      lat: 12.9716,
      lng: 77.5946,
      vehicleReg: 'KA01AB1234',
    };

    realTimeService.broadcastSosAlert(sosPayload);

    expect(toSpy).toHaveBeenCalledWith('admin:sos');
    expect(toSpy).toHaveBeenCalledWith('user:user_456');
  });

  it('broadcastOrderUpdate emits events to user room and admin:orders', () => {
    const io = getSocketServer();
    if (!io) throw new Error('Socket.IO not initialized');

    const toSpy = vi.spyOn(io, 'to');

    const orderPayload = {
      id: 'ord_123',
      orderNo: 'ORD-1001',
      status: 'DISPATCHED',
    };

    realTimeService.broadcastOrderUpdate('user_456', orderPayload);

    expect(toSpy).toHaveBeenCalledWith('user:user_456');
    expect(toSpy).toHaveBeenCalledWith('admin:orders');
  });

  it('broadcastGpsLocation emits events to vehicle room and admin', () => {
    const io = getSocketServer();
    if (!io) throw new Error('Socket.IO not initialized');

    const toSpy = vi.spyOn(io, 'to');

    const gpsPayload = {
      lat: 28.6139,
      lng: 77.2090,
      speed: 45.5,
      heading: 180,
      timestamp: new Date().toISOString(),
    };

    realTimeService.broadcastGpsLocation('veh_789', gpsPayload);

    expect(toSpy).toHaveBeenCalledWith('vehicle:veh_789');
    expect(toSpy).toHaveBeenCalledWith('admin');
  });

  it('broadcastNotification emits event to specific user room', () => {
    const io = getSocketServer();
    if (!io) throw new Error('Socket.IO not initialized');

    const toSpy = vi.spyOn(io, 'to');

    const notifPayload = {
      id: 'notif_101',
      title: 'FASTag Low Balance',
      description: 'Your balance is low',
      type: 'ALERT',
    };

    realTimeService.broadcastNotification('user_456', notifPayload);

    expect(toSpy).toHaveBeenCalledWith('user:user_456');
  });
});

