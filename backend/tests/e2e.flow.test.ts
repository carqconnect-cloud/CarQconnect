import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { FuelType, QrStatus, Role, MembershipStatus, SosEventStatus } from '@prisma/client';
import { authRepository } from '../src/modules/auth/auth.repository';
import { hashPassword } from '../src/common/utils/password';
import { vehicleRepository } from '../src/modules/vehicles/vehicle.repository';
import { qrRepository } from '../src/modules/qr/qr.repository';
import { sosRepository } from '../src/modules/sos/sos.repository';
import { adminSupportRepository } from '../src/modules/admin/support/adminSupport.repository';

describe('Cross-Platform End-to-End Lifecycle Simulation (E2E)', () => {
  const app = createApp();

  const mockUser = {
    id: 'user_e2e_1',
    email: 'e2e_driver@fioner.in',
    passwordHash: '',
    firstName: 'E2E',
    lastName: 'Tester',
    avatarUrl: null,
    isActive: true,
    isSuperAdmin: false,
    phone: '+919999988888',
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSuperAdmin = {
    id: 'user_super_admin_e2e',
    email: 'admin@fioner.in',
    isSuperAdmin: true,
    isActive: true,
  };

  const userToken = signAccessToken({
    sub: mockUser.id,
    email: mockUser.email,
    isSuperAdmin: false,
  });

  const adminToken = signAccessToken({
    sub: mockSuperAdmin.id,
    email: mockSuperAdmin.email,
    isSuperAdmin: true,
  });

  const mockVehicle = {
    id: 'veh_e2e_1',
    userId: mockUser.id,
    reg: 'KA03HA9999',
    model: 'Tata Nexon EV',
    fuel: FuelType.ELECTRIC,
    mileage: 0,
    isDefault: true,
    docExpiry: new Date(Date.now() + 180 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
  };

  const mockQr = {
    id: 'qr_e2e_1',
    code: 'QRR-E2E999',
    status: QrStatus.ACTIVE,
    vehicleId: mockVehicle.id,
    vehicle: {
      reg: mockVehicle.reg,
      model: mockVehicle.model,
    },
  };

  const mockTicket = {
    id: '#FN998877',
    subject: '[Website Contact] Urgent battery query',
    description: 'Please call me back regarding QR delivery',
    status: 'OPEN',
    priority: 'MEDIUM',
    category: 'Website Contact',
    organizationId: 'org_e2e_1',
    customerId: 'cust_e2e_1',
    userId: null,
    vehicleId: null,
    assignedToId: null,
    aiEscalated: false,
    aiSummary: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockUser.passwordHash = await hashPassword('FionerPass2026!');
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
  });

  it('Stage 1: User Login generates authentication tokens', async () => {
    vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(mockUser as never);
    vi.spyOn(authRepository, 'findDefaultMembership').mockResolvedValueOnce({
      id: 'mem_e2e_1',
      userId: mockUser.id,
      organizationId: 'org_e2e_1',
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
      organization: { id: 'org_e2e_1', name: 'Personal Fleet', slug: 'personal-fleet' },
    } as never);
    vi.spyOn(authRepository, 'createRefreshToken').mockResolvedValueOnce({} as never);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'e2e_driver@fioner.in',
        password: 'FionerPass2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('Stage 2: Customer registers new vehicle in Digital Garage', async () => {
    vi.spyOn(vehicleRepository, 'findByReg').mockResolvedValueOnce(null);
    vi.spyOn(vehicleRepository, 'clearDefault').mockResolvedValueOnce({ count: 0 });
    vi.spyOn(vehicleRepository, 'create').mockResolvedValueOnce(mockVehicle as never);

    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reg: 'KA03HA9999',
        model: 'Tata Nexon EV',
        fuel: 'ELECTRIC',
        isDefault: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reg).toBe('KA03HA9999');
  });

  it('Stage 3: Public QR Tag resolves vehicle safety profile without leaking PII', async () => {
    vi.spyOn(qrRepository, 'findByCode').mockResolvedValueOnce(mockQr as never);
    vi.spyOn(qrRepository, 'recordScan').mockResolvedValueOnce({} as never);

    const res = await request(app)
      .get('/api/v1/qr/QRR-E2E999');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.vehicle.model).toBe('Tata Nexon EV');
    // Ensure privacy - owner mobile number must NEVER be exposed
    expect(res.body.data.ownerPhone).toBeUndefined();
    expect(res.body.data.ownerId).toBeUndefined();
  });

  it('Stage 4: Website visitor submits contact ticket and Super-Admin retrieves it', async () => {
    // 1. Submit ticket via public support-tickets endpoint
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce(null);
    vi.spyOn(prisma.customer, 'create').mockResolvedValueOnce({
      id: 'cust_e2e_1',
      organizationId: 'org_e2e_1',
      metadata: {},
    } as never);
    vi.spyOn(prisma.supportTicket, 'create').mockResolvedValueOnce(mockTicket as never);
    vi.spyOn(prisma.customer, 'update').mockResolvedValueOnce({} as never);

    const ticketRes = await request(app)
      .post('/api/v1/support-tickets/raise')
      .send({
        name: 'Website Visitor',
        email: 'visitor@gmail.com',
        category: 'Website Contact',
        subject: 'Urgent battery query',
        description: 'Please call me back regarding QR delivery',
      });

    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body.success).toBe(true);

    // 2. Super-Admin retrieves the ticket from Support desk
    vi.spyOn(adminSupportRepository, 'findTickets').mockResolvedValueOnce([mockTicket] as never);
    vi.spyOn(prisma.supportTicket, 'count').mockResolvedValueOnce(1);

    const adminRes = await request(app)
      .get('/api/v1/admin/support/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.data.tickets.length).toBeGreaterThan(0);
  });

  it('Stage 5: Emergency SOS alert is dispatched', async () => {
    const mockSos = {
      id: 'sos_e2e_event_1',
      userId: mockUser.id,
      lat: 12.9716,
      lng: 77.5946,
      vehicleReg: 'KA03HA9999',
      status: SosEventStatus.PENDING,
      address: 'Bengaluru, India',
      notes: 'Highway breakdown',
      resolvedAt: null,
      resolvedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      contactsNotified: [],
      timeline: [],
    };

    vi.spyOn(sosRepository, 'findActiveEvent').mockResolvedValueOnce(null);
    vi.spyOn(sosRepository, 'createEvent').mockResolvedValueOnce(mockSos as never);

    const res = await request(app)
      .post('/api/v1/sos')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        lat: 12.9716,
        lng: 77.5946,
        vehicleReg: 'KA03HA9999',
        notes: 'Highway breakdown',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
  });
});

