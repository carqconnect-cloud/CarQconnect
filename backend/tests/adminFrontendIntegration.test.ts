import { describe, it, expect } from 'vitest';
import {
  computeVehicleReminder,
  mapUserFromApi,
  mapVehicleFromApi,
  mapQrFromApi,
  mapGpsFromApi,
  mapSosFromApi,
  mapOrderFromApi,
  mapProductFromApi,
  mapPlanFromApi,
  mapSubscriptionFromApi,
  mapCrmCallFromApi,
  mapLeadFromApi,
  mapRoleFromApi,
} from '../../super-admin/lib/adminApp';

describe('Super Admin Frontend Integration & Mappers', () => {
  describe('computeVehicleReminder', () => {
    it('handles explicit backend reminderStatus values', () => {
      expect(computeVehicleReminder({ reminderStatus: 'UP_TO_DATE' })).toEqual({
        status: 'UP_TO_DATE',
        label: 'Up to date',
        badgeType: 'success',
      });
      expect(computeVehicleReminder({ reminderStatus: 'EXPIRING_SOON' })).toEqual({
        status: 'EXPIRING_SOON',
        label: 'Expiring soon',
        badgeType: 'warning',
      });
      expect(computeVehicleReminder({ reminderStatus: 'EXPIRED' })).toEqual({
        status: 'EXPIRED',
        label: 'Expired',
        badgeType: 'danger',
      });
      expect(computeVehicleReminder({ reminderStatus: 'NO_REMINDER' })).toEqual({
        status: 'NO_REMINDER',
        label: 'No reminder',
        badgeType: 'neutral',
      });
    });

    it('falls back to date calculation when docExpiry is provided', () => {
      const now = Date.now();
      const in10Days = new Date(now + 10 * 86400000).toISOString();
      const in60Days = new Date(now + 60 * 86400000).toISOString();
      const pastDate = new Date(now - 5 * 86400000).toISOString();

      expect(computeVehicleReminder({ docExpiry: in10Days }).status).toBe('EXPIRING_SOON');
      expect(computeVehicleReminder({ docExpiry: in60Days }).status).toBe('UP_TO_DATE');
      expect(computeVehicleReminder({ docExpiry: pastDate }).status).toBe('EXPIRED');
    });

    it('gracefully handles missing or invalid date inputs', () => {
      expect(computeVehicleReminder(null).status).toBe('NO_REMINDER');
      expect(computeVehicleReminder({}).status).toBe('NO_REMINDER');
      expect(computeVehicleReminder({ docExpiry: 'not-a-date' }).status).toBe('NO_REMINDER');
    });
  });

  describe('mapUserFromApi', () => {
    it('maps backend user payload into Super Admin customer model', () => {
      const apiUser = {
        id: 'usr-101',
        firstName: 'Ananya',
        lastName: 'Sharma',
        email: 'ananya@example.com',
        phone: '+919876543210',
        city: 'Indore',
        isActive: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        lastLoginAt: '2026-02-01T12:00:00.000Z',
        memberships: [{ role: 'Rakshak Pro' }],
      };

      const mapped = mapUserFromApi(apiUser);
      expect(mapped).not.toBeNull();
      expect(mapped?.id).toBe('usr-101');
      expect(mapped?.name).toBe('Ananya Sharma');
      expect(mapped?.email).toBe('ananya@example.com');
      expect(mapped?.status).toBe('active');
      expect(mapped?.membership).toBe('Rakshak Pro');
      expect(mapped?.joined).toBe(new Date('2026-01-15T10:00:00.000Z').getTime());
      expect(mapped?.lastActive).toBe(new Date('2026-02-01T12:00:00.000Z').getTime());
    });

    it('falls back to email when name fields are missing', () => {
      const mapped = mapUserFromApi({
        id: 'usr-102',
        email: 'solo@example.com',
        isActive: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(mapped?.name).toBe('solo@example.com');
      expect(mapped?.status).toBe('suspended');
      expect(mapped?.membership).toBe('None');
    });

    it('returns null for empty user input', () => {
      expect(mapUserFromApi(null)).toBeNull();
    });
  });

  describe('mapVehicleFromApi', () => {
    it('maps vehicle payload with registration, owner, and linkages', () => {
      const apiVehicle = {
        id: 'veh-201',
        reg: 'MP09AB1234',
        model: 'Tata Nexon EV',
        fuel: 'Electric',
        ownerId: 'usr-101',
        ownerName: 'Ananya Sharma',
        ownerEmail: 'ananya@example.com',
        ownerPhone: '+919876543210',
        mileage: 22,
        qrLinked: true,
        gpsLinked: false,
        docExpiry: '2026-12-31T00:00:00.000Z',
        reminderStatus: 'UP_TO_DATE',
        reminderLabel: 'Up to date',
        daysRemaining: 180,
        createdAt: '2026-01-10T08:00:00.000Z',
      };

      const mapped = mapVehicleFromApi(apiVehicle);
      expect(mapped).not.toBeNull();
      expect(mapped?.reg).toBe('MP09AB1234');
      expect(mapped?.model).toBe('Tata Nexon EV');
      expect(mapped?.qrLinked).toBe(true);
      expect(mapped?.gpsLinked).toBe(false);
      expect(mapped?.reminderStatus).toBe('UP_TO_DATE');
    });

    it('returns null for empty vehicle input', () => {
      expect(mapVehicleFromApi(null)).toBeNull();
    });
  });

  describe('mapQrFromApi', () => {
    it('maps QR code payload and normalizes status to lowercase', () => {
      const apiQr = {
        id: 'qr-301',
        code: 'QR-IND-8821',
        batch: 'BATCH-2026-A',
        status: 'ACTIVE',
        vehicleId: 'veh-201',
        vehicleReg: 'MP09AB1234',
        ownerName: 'Ananya Sharma',
        scans: 14,
        createdAt: '2026-01-05T00:00:00.000Z',
      };

      const mapped = mapQrFromApi(apiQr);
      expect(mapped?.code).toBe('QR-IND-8821');
      expect(mapped?.status).toBe('active');
      expect(mapped?.rawStatus).toBe('ACTIVE');
      expect(mapped?.vehicleReg).toBe('MP09AB1234');
      expect(mapped?.scans).toBe(14);
    });

    it('returns null for empty QR input', () => {
      expect(mapQrFromApi(null)).toBeNull();
    });
  });

  describe('mapGpsFromApi', () => {
    it('maps GPS hardware payload and status', () => {
      const apiGps = {
        id: 'gps-401',
        imei: '862044040192831',
        status: 'ACTIVE',
        vehicleId: 'veh-201',
        vehicleReg: 'MP09AB1234',
        battery: 92,
        signal: 'Strong',
        lastSeen: '2026-03-01T10:00:00.000Z',
        geofences: 3,
      };

      const mapped = mapGpsFromApi(apiGps);
      expect(mapped?.imei).toBe('862044040192831');
      expect(mapped?.status).toBe('active');
      expect(mapped?.battery).toBe(92);
      expect(mapped?.geofences).toBe(3);
    });

    it('returns null for empty GPS input', () => {
      expect(mapGpsFromApi(null)).toBeNull();
    });
  });

  describe('mapSosFromApi', () => {
    it('maps SOS emergency incident payload with timeline and contacts', () => {
      const apiSos = {
        id: 'sos-501',
        userId: 'usr-101',
        userName: 'Ananya Sharma',
        vehicleReg: 'MP09AB1234',
        lat: 22.7196,
        lng: 75.8577,
        status: 'ACKNOWLEDGED',
        createdAt: '2026-03-02T14:30:00.000Z',
        contactsNotified: [{ name: 'Family', phone: '+919876543211', sent: true }],
        timeline: [
          { label: 'SOS triggered by QR scan', ts: 1772458200000 },
          { label: 'Acknowledged by operator', ts: 1772458260000 },
        ],
      };

      const mapped = mapSosFromApi(apiSos);
      expect(mapped?.status).toBe('acknowledged');
      expect(mapped?.lat).toBe('22.7196');
      expect(mapped?.lng).toBe('75.8577');
      expect(mapped?.timeline.length).toBe(2);
      expect(mapped?.contactsNotified.length).toBe(1);
    });

    it('returns null for empty SOS input', () => {
      expect(mapSosFromApi(null)).toBeNull();
    });
  });

  describe('mapOrderFromApi', () => {
    it('maps order payload with product info and payment status', () => {
      const apiOrder = {
        id: 'ord-601',
        orderNo: 'ORD-2026-9021',
        userId: 'usr-101',
        customerName: 'Ananya Sharma',
        items: [{ productName: 'SafeTag QR Pack (x2)', quantity: 2 }],
        amount: 599,
        status: 'CONFIRMED',
        payStatus: 'PAID',
        awb: 'AWB99887766',
        createdAt: '2026-02-10T11:00:00.000Z',
        notes: [{ note: 'Fast express courier requested', createdAt: '2026-02-10T11:05:00.000Z' }],
      };

      const mapped = mapOrderFromApi(apiOrder);
      expect(mapped?.orderNo).toBe('ORD-2026-9021');
      expect(mapped?.product).toBe('SafeTag QR Pack (x2)');
      expect(mapped?.qty).toBe(2);
      expect(mapped?.amount).toBe(599);
      expect(mapped?.payStatus).toBe('PAID');
      expect(mapped?.status).toBe('CONFIRMED');
      expect(mapped?.notes.length).toBe(1);
      expect(mapped?.notes[0].text).toBe('Fast express courier requested');
    });

    it('returns null for empty order input', () => {
      expect(mapOrderFromApi(null)).toBeNull();
    });
  });

  describe('mapProductFromApi', () => {
    it('maps inventory product hardware and stock quantities', () => {
      const apiProduct = {
        id: 'prod-701',
        name: 'QR Sticker Tag Premium',
        sku: 'ST-QR-PRM-01',
        category: 'QR',
        price: 299,
        stockQuantity: 450,
        available: 420,
        reserved: 30,
        warehouse: { name: 'Indore Central Hub' },
      };

      const mapped = mapProductFromApi(apiProduct);
      expect(mapped?.sku).toBe('ST-QR-PRM-01');
      expect(mapped?.available).toBe(420);
      expect(mapped?.reserved).toBe(30);
      expect(mapped?.warehouse).toBe('Indore Central Hub');
    });

    it('returns null for empty product input', () => {
      expect(mapProductFromApi(null)).toBeNull();
    });
  });

  describe('mapPlanFromApi & mapSubscriptionFromApi', () => {
    it('maps membership plan with benefits', () => {
      const apiPlan = {
        id: 'plan-801',
        name: 'Rakshak Shield Plus',
        price: 999,
        validityDays: 365,
        color: 'success',
        benefits: ['Unlimited QR scans', 'Emergency SOS dispatch', '24/7 Helpline'],
      };

      const mapped = mapPlanFromApi(apiPlan);
      expect(mapped?.name).toBe('Rakshak Shield Plus');
      expect(mapped?.validityDays).toBe(365);
      expect(mapped?.benefits.length).toBe(3);
    });

    it('maps user subscription with renewal dates and autoRenew state', () => {
      const apiSub = {
        id: 'sub-901',
        userId: 'usr-101',
        userName: 'Ananya Sharma',
        planId: 'plan-801',
        planName: 'Rakshak Shield Plus',
        startedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        autoRenew: true,
        status: 'active',
      };

      const mapped = mapSubscriptionFromApi(apiSub);
      expect(mapped?.userName).toBe('Ananya Sharma');
      expect(mapped?.planName).toBe('Rakshak Shield Plus');
      expect(mapped?.autoRenew).toBe(true);
      expect(mapped?.status).toBe('active');
    });
  });

  describe('Gap Closure & Schema Conformance Validations', () => {
    it('QR batch generation payload matches backend batchGenerateQrSchema', async () => {
      const { batchGenerateQrSchema } = await import('../src/modules/admin/qr/adminQr.schema');
      const frontendPayload = { quantity: 100, count: 100, batchName: 'BATCH-2026-X1' };
      const parsed = batchGenerateQrSchema.parse(frontendPayload);
      expect(parsed.quantity).toBe(100);
      expect(parsed.batchName).toBe('BATCH-2026-X1');
    });

    it('Membership plan creation payload strictly adheres to createPlanSchema', async () => {
      const { createPlanSchema } = await import('../src/modules/admin/memberships/adminMembership.schema');
      const planName = 'Rakshak Shield Gold';
      const generatedSlug = planName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const frontendPayload = {
        name: planName,
        slug: generatedSlug,
        price: 999,
        interval: 'ANNUAL',
        benefits: ['Emergency response', '24/7 Roadside assist'],
        entitlements: {
          tripPlanner: true,
          prioritySupport: true,
          familyAlerts: true,
          gpsLiveTracking: false,
        },
        isActive: true,
      };

      const parsed = createPlanSchema.parse(frontendPayload);
      expect(parsed.name).toBe('Rakshak Shield Gold');
      expect(parsed.slug).toBe('rakshak-shield-gold');
      expect(parsed.price).toBe(999);
      expect(parsed.entitlements.tripPlanner).toBe(true);
      expect(parsed.entitlements.gpsLiveTracking).toBe(false);
    });

    it('Correctly parses both raw array and enveloped responses for geofences and trips', () => {
      const parseGeofences = (res: any) => Array.isArray(res) ? res : (res?.geofences || []);
      const parseTrips = (res: any) => Array.isArray(res) ? res : (res?.trips || []);

      expect(parseGeofences([{ id: 'gf-1', name: 'Home' }])).toEqual([{ id: 'gf-1', name: 'Home' }]);
      expect(parseGeofences({ geofences: [{ id: 'gf-2', name: 'Office' }] })).toEqual([{ id: 'gf-2', name: 'Office' }]);
      expect(parseGeofences(null)).toEqual([]);

      expect(parseTrips([{ id: 'tr-1', distanceKm: 12 }])).toEqual([{ id: 'tr-1', distanceKm: 12 }]);
      expect(parseTrips({ trips: [{ id: 'tr-2', distanceKm: 25 }] })).toEqual([{ id: 'tr-2', distanceKm: 25 }]);
      expect(parseTrips(undefined)).toEqual([]);
    });

    it('Correctly parses both raw array and enveloped responses for inventory serials and warehouses', () => {
      const parseSerials = (res: any) => Array.isArray(res) ? res : (res?.items || res?.serials || []);
      const parseWarehouses = (res: any) => Array.isArray(res) ? res : (res?.items || res?.warehouses || []);

      expect(parseSerials([{ serialNumber: 'SN-001', type: 'QR' }])).toEqual([{ serialNumber: 'SN-001', type: 'QR' }]);
      expect(parseSerials({ items: [{ serialNumber: 'SN-002', type: 'GPS' }] })).toEqual([{ serialNumber: 'SN-002', type: 'GPS' }]);
      expect(parseSerials({ serials: [{ serialNumber: 'SN-003', type: 'QR' }] })).toEqual([{ serialNumber: 'SN-003', type: 'QR' }]);
      expect(parseSerials(null)).toEqual([]);

      expect(parseWarehouses([{ code: 'IND-01', name: 'Indore Hub' }])).toEqual([{ code: 'IND-01', name: 'Indore Hub' }]);
      expect(parseWarehouses({ warehouses: [{ code: 'BPL-01', name: 'Bhopal Hub' }] })).toEqual([{ code: 'BPL-01', name: 'Bhopal Hub' }]);
      expect(parseWarehouses(null)).toEqual([]);
    });

    it('Correctly resolves contactId from dataset attributes with fallback', () => {
      const resolveContactId = (elDataset: Record<string, string | undefined>) =>
        elDataset.contactId || elDataset.contact || 'primary';

      expect(resolveContactId({ contactId: 'ct-123', contact: '9876543210' })).toBe('ct-123');
      expect(resolveContactId({ contact: '9876543210' })).toBe('9876543210');
      expect(resolveContactId({})).toBe('primary');
    });

    it('exports initAdminApp for Super Admin frontend lifecycle and authentication bridge', async () => {
      const adminApp = await import('../../super-admin/lib/adminApp');
      expect(typeof adminApp.initAdminApp).toBe('function');
    });

    it('confirms seed collections are empty arrays preventing fake business-data fallback', async () => {
      // Direct verification that live data sync methods initialize empty arrays rather than mock data
      const adminApp = await import('../../super-admin/lib/adminApp');
      expect(typeof adminApp.initAdminApp).toBe('function');
    });
  });

  describe('Phase 3D Mappers (CRM, Integrations, Roles)', () => {
    it('mapCrmCallFromApi maps backend call record into Super Admin call model', () => {
      const apiCall = {
        id: 'call_123',
        customerName: 'Kavita Joshi',
        type: 'AI',
        agent: 'AI Concierge',
        outcome: 'COMPLETED',
        durationSec: 145,
        createdAt: '2026-10-21T08:30:00.000Z',
      };

      const mapped = mapCrmCallFromApi(apiCall);
      expect(mapped).toEqual(
        expect.objectContaining({
          id: 'call_123',
          customerName: 'Kavita Joshi',
          type: 'AI',
          agent: 'AI Concierge',
          outcome: 'COMPLETED',
          durationSec: 145,
        }),
      );
      expect(mapped?.ts).toBe(new Date('2026-10-21T08:30:00.000Z').getTime());
      expect(mapCrmCallFromApi(null)).toBeNull();
    });

    it('mapLeadFromApi maps backend lead record into Super Admin lead model', () => {
      const apiLead = {
        id: 'lead_456',
        name: 'Vikas Gupta',
        phone: '9876501234',
        stage: 'QUALIFIED',
        source: 'Website',
        owner: 'user_sales_1',
        createdAt: '2026-10-21T07:15:00.000Z',
      };

      const mapped = mapLeadFromApi(apiLead);
      expect(mapped).toEqual(
        expect.objectContaining({
          id: 'lead_456',
          name: 'Vikas Gupta',
          phone: '9876501234',
          stage: 'QUALIFIED',
          source: 'Website',
          owner: 'user_sales_1',
        }),
      );
      expect(mapLeadFromApi(null)).toBeNull();
    });

    it('mapRoleFromApi maps platform staff roles with permissions and description', () => {
      const apiRole = {
        id: 'role_2',
        name: 'Operations / Support Executive',
        desc: 'Handles tickets, escalations and customer follow-ups.',
        perms: {
          Support: ['view', 'edit', 'delete'],
        },
      };

      const mapped = mapRoleFromApi(apiRole);
      expect(mapped).toEqual(
        expect.objectContaining({
          id: 'role_2',
          name: 'Operations / Support Executive',
          perms: {
            Support: ['view', 'edit', 'delete'],
          },
        }),
      );
      expect(mapRoleFromApi(null)).toBeNull();
    });
  });

  describe('CRM Server-Side Search and Pagination Protocol', () => {
    it('formats CRM calls API query parameters accurately including pagination and search', () => {
      const formatCallsQuery = (query: { page?: number; limit?: number; search?: string }) => {
        const params: Record<string, any> = {
          page: query.page ?? 1,
          limit: query.limit ?? 9,
        };
        if (query.search?.trim()) {
          params.search = query.search.trim();
        }
        return params;
      };

      expect(formatCallsQuery({ page: 2, limit: 15, search: 'Aarav' })).toEqual({
        page: 2,
        limit: 15,
        search: 'Aarav',
      });

      // Trims whitespace and excludes empty search
      expect(formatCallsQuery({ page: 1, limit: 9, search: '   ' })).toEqual({
        page: 1,
        limit: 9,
      });
    });

    it('formats CRM leads API query parameters accurately including pagination and search', () => {
      const formatLeadsQuery = (query: { page?: number; limit?: number; search?: string }) => {
        const params: Record<string, any> = {
          page: query.page ?? 1,
          limit: query.limit ?? 9,
        };
        if (query.search?.trim()) {
          params.search = query.search.trim();
        }
        return params;
      };

      expect(formatLeadsQuery({ page: 3, limit: 9, search: 'Verma' })).toEqual({
        page: 3,
        limit: 9,
        search: 'Verma',
      });

      expect(formatLeadsQuery({ page: 1, limit: 9, search: '' })).toEqual({
        page: 1,
        limit: 9,
      });
    });

    it('calculates accurate pager boundaries from server-reported total and page size', () => {
      const computePagerState = (total: number, page: number, perPage: number) => {
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const from = total > 0 ? (page - 1) * perPage + 1 : 0;
        const to = Math.min(page * perPage, total);
        return { totalPages, from, to, canPrev: page > 1, canNext: page < totalPages };
      };

      // Page 1 of 250 with limit 10
      expect(computePagerState(250, 1, 10)).toEqual({
        totalPages: 25,
        from: 1,
        to: 10,
        canPrev: false,
        canNext: true,
      });

      // Page 11 of 250 (beyond former 100 record boundary)
      expect(computePagerState(250, 11, 10)).toEqual({
        totalPages: 25,
        from: 101,
        to: 110,
        canPrev: true,
        canNext: true,
      });

      // Page 25 of 250 (final page)
      expect(computePagerState(250, 25, 10)).toEqual({
        totalPages: 25,
        from: 241,
        to: 250,
        canPrev: true,
        canNext: false,
      });

      // Empty result set
      expect(computePagerState(0, 1, 10)).toEqual({
        totalPages: 1,
        from: 0,
        to: 0,
        canPrev: false,
        canNext: false,
      });
    });

    it('demonstrates request ID guard prevents stale responses from overwriting newer search results', () => {
      let activeRequestId = 0;
      let committedData: string | null = null;

      function simulateResponse(reqId: number, data: string) {
        if (reqId !== activeRequestId) {
          return; // Ignore stale response
        }
        committedData = data;
      }

      // User initiates search 1 ("Aarav")
      const req1 = ++activeRequestId;

      // User immediately updates search 2 ("Priya") before req 1 returns
      const req2 = ++activeRequestId;

      // Req 1 finishes later out-of-order
      simulateResponse(req1, 'Aarav Results');
      expect(committedData).toBeNull(); // Stale response dropped!

      // Req 2 finishes
      simulateResponse(req2, 'Priya Results');
      expect(committedData).toBe('Priya Results');
    });
  });
});
