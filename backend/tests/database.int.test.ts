import crypto from 'crypto';
import type { Request, Response } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { MembershipStatus, Prisma, Role, MovementType, ProductCategory, PaymentStatus, OrderStatus, RefundStatus, SubscriptionStatus } from '@prisma/client';
import { prisma, tenantClient } from '../src/config/database';
import { razorpayClient } from '../src/modules/payment/razorpay.client';
import { authRepository } from '../src/modules/auth/auth.repository';
import { authService } from '../src/modules/auth/auth.service';
import { leadRepository } from '../src/modules/crm/leads/lead.repository';
import { customerRepository } from '../src/modules/crm/customers/customer.repository';
import { teamRepository } from '../src/modules/crm/teams/team.repository';
import { dashboardController } from '../src/modules/crm/dashboard/dashboard.controller';
import { hashRefreshToken, signAccessToken } from '../src/common/utils/jwt';
import { auditService } from '../src/modules/audit';
import { leadService } from '../src/modules/crm/leads/lead.service';
import { customerService } from '../src/modules/crm/customers/customer.service';
import { teamService } from '../src/modules/crm/teams/team.service';
import { organizationService } from '../src/modules/organization/organization.service';
import { userService } from '../src/modules/users/user.service';
import { verifyPassword } from '../src/common/utils/password';
import { adminUserService } from '../src/modules/admin/users/adminUser.service';
import { adminOrganizationService } from '../src/modules/admin/organizations/adminOrganization.service';
import { adminQrService } from '../src/modules/admin/qr/adminQr.service';
import { adminQrRepository } from '../src/modules/admin/qr/adminQr.repository';
import { adminGpsService } from '../src/modules/admin/gps/adminGps.service';
import { adminGpsRepository } from '../src/modules/admin/gps/adminGps.repository';
import { adminInventoryService } from '../src/modules/admin/inventory/adminInventory.service';
import { adminInventoryRepository } from '../src/modules/admin/inventory/adminInventory.repository';
import { adminOrdersService } from '../src/modules/admin/orders/adminOrders.service';
import { vehicleService } from '../src/modules/vehicles/vehicle.service';
import { vehicleRepository } from '../src/modules/vehicles/vehicle.repository';
import { resolveTenant } from '../src/common/middleware/tenant.middleware';
import { adminDashboardRepository } from '../src/modules/admin/dashboard/adminDashboard.repository';

describe('Real PostgreSQL Integration Suite (fioner_test)', () => {
  const app = createApp();
  const testRunId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdOrgIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdAuditLogIds: string[] = [];
  const createdSosEventIds: string[] = [];
  const createdSosContactIds: string[] = [];
  const createdVehicleIds: string[] = [];
  const createdQrIds: string[] = [];
  const createdGpsIds: string[] = [];
  const createdGeofenceIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdWarehouseIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdPlanIds: string[] = [];
  const createdSubscriptionIds: string[] = [];

  const mockSession = {
    userAgent: 'vitest-integration-agent',
    ipAddress: '127.0.0.1',
  };

  beforeAll(async () => {
    // 1. Database identity preflight check
    const rows = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    const dbName = rows[0]?.current_database;
    expect(dbName).toBe('fioner_test');

    // 2. Ensure SOS domain tables exist idempotently in fioner_test
    const ddlStatements = [
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SosEventStatus') THEN
           CREATE TYPE "SosEventStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');
         END IF;
       END$$;`,
      `CREATE TABLE IF NOT EXISTS "sos_events" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "organizationId" TEXT REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "vehicleReg" TEXT,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "address" TEXT,
        "status" "SosEventStatus" NOT NULL DEFAULT 'PENDING',
        "notes" TEXT,
        "resolvedAt" TIMESTAMP(3),
        "resolvedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "sos_contacts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "relationship" TEXT,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "sos_event_contacts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL REFERENCES "sos_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "contactId" TEXT,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "isNotified" BOOLEAN NOT NULL DEFAULT false,
        "notifiedAt" TIMESTAMP(3),
        "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
        "acknowledgedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `ALTER TABLE "sos_event_contacts" ALTER COLUMN "isNotified" SET DEFAULT false;`,
      `ALTER TABLE "sos_event_contacts" ALTER COLUMN "notifiedAt" DROP DEFAULT;`,
      `ALTER TABLE "sos_event_contacts" ALTER COLUMN "notifiedAt" DROP NOT NULL;`,
      `CREATE TABLE IF NOT EXISTS "sos_timeline_items" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL REFERENCES "sos_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "label" TEXT NOT NULL,
        "actorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "sos_events_status_idx" ON "sos_events"("status");`,
      `CREATE INDEX IF NOT EXISTS "sos_events_userId_idx" ON "sos_events"("userId");`,
      `CREATE INDEX IF NOT EXISTS "sos_events_createdAt_idx" ON "sos_events"("createdAt");`,
      `CREATE INDEX IF NOT EXISTS "sos_contacts_userId_idx" ON "sos_contacts"("userId");`,
      `CREATE INDEX IF NOT EXISTS "sos_event_contacts_eventId_idx" ON "sos_event_contacts"("eventId");`,
      `CREATE INDEX IF NOT EXISTS "sos_timeline_items_eventId_idx" ON "sos_timeline_items"("eventId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "sos_events_user_active_unique" ON "sos_events"("userId") WHERE "status" IN ('PENDING', 'ACKNOWLEDGED', 'ESCALATED');`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FuelType') THEN
           CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID');
         END IF;
       END$$;`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VehicleDocumentType') THEN
           CREATE TYPE "VehicleDocumentType" AS ENUM ('RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT');
         END IF;
       END$$;`,
      `CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "reg" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "fuel" "FuelType" NOT NULL,
        "mileage" DOUBLE PRECISION,
        "docExpiry" TIMESTAMP(3),
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS "vehicle_documents" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "vehicleId" TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "type" "VehicleDocumentType" NOT NULL,
        "documentNumber" TEXT,
        "expiryDate" TIMESTAMP(3) NOT NULL,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS "vehicles_userId_idx" ON "vehicles"("userId");`,
      `CREATE INDEX IF NOT EXISTS "vehicles_reg_idx" ON "vehicles"("reg");`,
      `CREATE INDEX IF NOT EXISTS "vehicles_fuel_idx" ON "vehicles"("fuel");`,
      `CREATE INDEX IF NOT EXISTS "vehicles_docExpiry_idx" ON "vehicles"("docExpiry");`,
      `CREATE INDEX IF NOT EXISTS "vehicles_createdAt_idx" ON "vehicles"("createdAt");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_userId_reg_key" ON "vehicles"("userId", "reg");`,
      `CREATE INDEX IF NOT EXISTS "vehicle_documents_vehicleId_idx" ON "vehicle_documents"("vehicleId");`,
      `CREATE INDEX IF NOT EXISTS "vehicle_documents_expiryDate_idx" ON "vehicle_documents"("expiryDate");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_documents_vehicleId_type_key" ON "vehicle_documents"("vehicleId", "type");`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QrStatus') THEN
           CREATE TYPE "QrStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ACTIVE', 'SUSPENDED', 'REPLACED', 'DEACTIVATED');
         END IF;
       END$$;`,
      `CREATE TABLE IF NOT EXISTS "qr_codes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "batch" TEXT NOT NULL,
        "status" "QrStatus" NOT NULL DEFAULT 'AVAILABLE',
        "vehicleId" TEXT REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "scansCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "qr_assignment_history" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "qrCodeId" TEXT REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "qrCodeValue" TEXT NOT NULL,
        "vehicleId" TEXT REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "vehicleReg" TEXT,
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "userEmail" TEXT,
        "assignedBy" TEXT,
        "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "unassignedAt" TIMESTAMP(3),
        "reason" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "qr_scan_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "qrCodeId" TEXT REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "qrCodeValue" TEXT NOT NULL,
        "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "city" TEXT,
        "actionTaken" TEXT,
        "metadata" JSONB
      );`,
      `ALTER TABLE "qr_assignment_history" ADD COLUMN IF NOT EXISTS "qrCodeValue" TEXT;`,
      `ALTER TABLE "qr_assignment_history" ADD COLUMN IF NOT EXISTS "vehicleReg" TEXT;`,
      `ALTER TABLE "qr_assignment_history" ADD COLUMN IF NOT EXISTS "userEmail" TEXT;`,
      `ALTER TABLE "qr_scan_logs" ADD COLUMN IF NOT EXISTS "qrCodeValue" TEXT;`,
      `ALTER TABLE "qr_assignment_history" ALTER COLUMN "qrCodeId" DROP NOT NULL;`,
      `ALTER TABLE "qr_scan_logs" ALTER COLUMN "qrCodeId" DROP NOT NULL;`,
      `ALTER TABLE "qr_assignment_history" DROP CONSTRAINT IF EXISTS "qr_assignment_history_qrCodeId_fkey";`,
      `ALTER TABLE "qr_assignment_history" ADD CONSTRAINT "qr_assignment_history_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
      `ALTER TABLE "qr_scan_logs" DROP CONSTRAINT IF EXISTS "qr_scan_logs_qrCodeId_fkey";`,
      `ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_code_key" ON "qr_codes"("code");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_vehicleId_key" ON "qr_codes"("vehicleId");`,
      `CREATE INDEX IF NOT EXISTS "qr_codes_code_idx" ON "qr_codes"("code");`,
      `CREATE INDEX IF NOT EXISTS "qr_codes_batch_idx" ON "qr_codes"("batch");`,
      `CREATE INDEX IF NOT EXISTS "qr_codes_status_idx" ON "qr_codes"("status");`,
      `CREATE INDEX IF NOT EXISTS "qr_codes_createdAt_idx" ON "qr_codes"("createdAt");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_qrCodeId_idx" ON "qr_assignment_history"("qrCodeId");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_qrCodeValue_idx" ON "qr_assignment_history"("qrCodeValue");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_vehicleId_idx" ON "qr_assignment_history"("vehicleId");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_vehicleReg_idx" ON "qr_assignment_history"("vehicleReg");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_userId_idx" ON "qr_assignment_history"("userId");`,
      `CREATE INDEX IF NOT EXISTS "qr_assignment_history_assignedAt_idx" ON "qr_assignment_history"("assignedAt");`,
      `CREATE INDEX IF NOT EXISTS "qr_scan_logs_qrCodeId_idx" ON "qr_scan_logs"("qrCodeId");`,
      `CREATE INDEX IF NOT EXISTS "qr_scan_logs_qrCodeValue_idx" ON "qr_scan_logs"("qrCodeValue");`,
      `CREATE INDEX IF NOT EXISTS "qr_scan_logs_scannedAt_idx" ON "qr_scan_logs"("scannedAt");`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GpsDeviceStatus') THEN
           CREATE TYPE "GpsDeviceStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'MAINTENANCE', 'DEACTIVATED');
         END IF;
       END$$;`,
      `CREATE TABLE IF NOT EXISTS "gps_devices" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "imei" TEXT NOT NULL UNIQUE,
        "serialNumber" TEXT UNIQUE,
        "model" TEXT,
        "vendor" TEXT,
        "status" "GpsDeviceStatus" NOT NULL DEFAULT 'UNASSIGNED',
        "vehicleId" TEXT UNIQUE REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "batteryLevel" INTEGER,
        "signalStrength" TEXT,
        "lastSeenAt" TIMESTAMP(3),
        "lastLatitude" DOUBLE PRECISION,
        "lastLongitude" DOUBLE PRECISION,
        "speed" DOUBLE PRECISION,
        "heading" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "gps_device_history" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT REFERENCES "gps_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "deviceImei" TEXT NOT NULL,
        "vehicleId" TEXT REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "vehicleReg" TEXT,
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "userEmail" TEXT,
        "assignedBy" TEXT,
        "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "unassignedAt" TIMESTAMP(3),
        "reason" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "geofences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "vehicleId" TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "name" TEXT NOT NULL,
        "latitude" DOUBLE PRECISION NOT NULL,
        "longitude" DOUBLE PRECISION NOT NULL,
        "radiusMeters" DOUBLE PRECISION NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "gps_devices_imei_idx" ON "gps_devices"("imei");`,
      `CREATE INDEX IF NOT EXISTS "gps_devices_status_idx" ON "gps_devices"("status");`,
      `CREATE INDEX IF NOT EXISTS "gps_device_history_deviceId_idx" ON "gps_device_history"("deviceId");`,
      `CREATE INDEX IF NOT EXISTS "gps_device_history_vehicleId_idx" ON "gps_device_history"("vehicleId");`,
      `CREATE INDEX IF NOT EXISTS "geofences_vehicleId_idx" ON "geofences"("vehicleId");`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
           CREATE TYPE "ProductCategory" AS ENUM ('QR', 'GPS', 'HARDWARE', 'ACCESSORY');
         END IF;
       END$$;`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MovementType') THEN
           CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'DISPATCH', 'RETURN', 'DAMAGE');
         END IF;
       END$$;`,
      `CREATE TABLE IF NOT EXISTS "warehouses" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "code" TEXT NOT NULL UNIQUE,
        "address" TEXT,
        "city" TEXT,
        "state" TEXT,
        "postalCode" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "sku" TEXT NOT NULL UNIQUE,
        "category" "ProductCategory" NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "lowStockThreshold" INTEGER NOT NULL DEFAULT 25,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "stock_items" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "warehouseId" TEXT NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "available" INTEGER NOT NULL DEFAULT 0,
        "reserved" INTEGER NOT NULL DEFAULT 0,
        "damaged" INTEGER NOT NULL DEFAULT 0,
        "dispatched" INTEGER NOT NULL DEFAULT 0,
        "returned" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "stock_items_productId_warehouseId_key" UNIQUE ("productId", "warehouseId"),
        CONSTRAINT "stock_items_available_check" CHECK ("available" >= 0),
        CONSTRAINT "stock_items_reserved_check" CHECK ("reserved" >= 0),
        CONSTRAINT "stock_items_damaged_check" CHECK ("damaged" >= 0),
        CONSTRAINT "stock_items_dispatched_check" CHECK ("dispatched" >= 0),
        CONSTRAINT "stock_items_returned_check" CHECK ("returned" >= 0)
      );`,
      `CREATE TABLE IF NOT EXISTS "inventory_movements" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "warehouseId" TEXT NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "type" "MovementType" NOT NULL,
        "quantity" INTEGER NOT NULL,
        "previousAvailable" INTEGER NOT NULL,
        "newAvailable" INTEGER NOT NULL,
        "previousReserved" INTEGER,
        "newReserved" INTEGER,
        "reason" TEXT,
        "notes" TEXT,
        "referenceType" TEXT,
        "referenceId" TEXT,
        "actorId" TEXT,
        "actorEmail" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "inventory_serial_items" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "warehouseId" TEXT REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "serialNumber" TEXT NOT NULL UNIQUE,
        "imei" TEXT UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
        "batch" TEXT,
        "vehicleReg" TEXT,
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products"("sku");`,
      `CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");`,
      `CREATE INDEX IF NOT EXISTS "warehouses_code_idx" ON "warehouses"("code");`,
      `CREATE INDEX IF NOT EXISTS "stock_items_productId_idx" ON "stock_items"("productId");`,
      `CREATE INDEX IF NOT EXISTS "stock_items_warehouseId_idx" ON "stock_items"("warehouseId");`,
      `CREATE INDEX IF NOT EXISTS "inventory_movements_productId_idx" ON "inventory_movements"("productId");`,
      `CREATE INDEX IF NOT EXISTS "inventory_movements_warehouseId_idx" ON "inventory_movements"("warehouseId");`,
      `INSERT INTO "warehouses" ("id", "name", "code", "city", "state", "isActive", "createdAt", "updatedAt")
       VALUES
         ('wh_indore', 'Indore DC', 'IND-DC', 'Indore', 'Madhya Pradesh', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
         ('wh_mumbai', 'Mumbai DC', 'MUM-DC', 'Mumbai', 'Maharashtra', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
         ('wh_pune', 'Pune DC', 'PUN-DC', 'Pune', 'Maharashtra', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("code") DO NOTHING;`,
    ];

    for (const sql of ddlStatements) {
      await prisma.$executeRawUnsafe(sql);
    }
  });

  afterAll(async () => {
    // Targeted cleanup of test fixtures respecting referential integrity
    try {
      if (createdOrderIds.length > 0) {
        await prisma.orderRefund.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.orderNote.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.orderActivity.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: createdOrderIds } },
        });
      }
      if (createdProductIds.length > 0) {
        await prisma.inventoryMovement.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.stockItem.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
      }
      if (createdWarehouseIds.length > 0) {
        await prisma.warehouse.deleteMany({
          where: { id: { in: createdWarehouseIds } },
        });
      }
      if (createdSosEventIds.length > 0) {
        await prisma.sosEvent.deleteMany({
          where: { id: { in: createdSosEventIds } },
        });
      }
      if (createdSosContactIds.length > 0) {
        await prisma.sosContact.deleteMany({
          where: { id: { in: createdSosContactIds } },
        });
      }
      if (createdQrIds.length > 0) {
        await prisma.qrScanLog.deleteMany({
          where: { qrCodeId: { in: createdQrIds } },
        });
        await prisma.qrAssignmentHistory.deleteMany({
          where: { qrCodeId: { in: createdQrIds } },
        });
        await prisma.qrCode.deleteMany({
          where: { id: { in: createdQrIds } },
        });
      }
      if (createdGeofenceIds.length > 0) {
        await prisma.geofence.deleteMany({
          where: { id: { in: createdGeofenceIds } },
        });
      }
      if (createdGpsIds.length > 0) {
        await prisma.gPSDeviceHistory.deleteMany({
          where: { deviceId: { in: createdGpsIds } },
        });
        await prisma.gPSDevice.deleteMany({
          where: { id: { in: createdGpsIds } },
        });
      }
      if (createdVehicleIds.length > 0) {
        await prisma.vehicle.deleteMany({
          where: { id: { in: createdVehicleIds } },
        });
      }
      if (createdAuditLogIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { id: { in: createdAuditLogIds } },
        });
      }
      if (createdOrgIds.length > 0) {
        await prisma.organization.deleteMany({
          where: { id: { in: createdOrgIds } },
        });
      }
      if (createdSubscriptionIds.length > 0) {
        await prisma.subscription.deleteMany({
          where: { id: { in: createdSubscriptionIds } },
        });
      }
      if (createdPlanIds.length > 0) {
        await prisma.subscription.deleteMany({
          where: { planId: { in: createdPlanIds } },
        });
        await prisma.membershipPlan.deleteMany({
          where: { id: { in: createdPlanIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  // =========================================================================
  // 1. Database Safety & Identity Check
  // =========================================================================
  describe('Database Identity & Safety Preflight', () => {
    it('is connected to the dedicated fioner_test database on PostgreSQL', async () => {
      const result = await prisma.$queryRaw<Array<{ current_database: string }>>`
        SELECT current_database();
      `;
      expect(result).toHaveLength(1);
      expect(result[0]?.current_database).toBe('fioner_test');
    });
  });

  // =========================================================================
  // 2. Registration & Transaction Atomicity
  // =========================================================================
  describe('Registration & Transaction Atomicity', () => {
    it('persists User, Organization, and OWNER Membership records atomically in PostgreSQL', async () => {
      const email = `${testRunId}_reg1@fioner.test`;
      const orgName = `Org Reg1 ${testRunId}`;

      const res = await authService.register(
        {
          email,
          password: 'Password123!',
          firstName: 'Ananya',
          lastName: 'Verma',
          organizationName: orgName,
        },
        mockSession,
      );

      createdUserIds.push(res.user.id);
      expect(res.activeOrganizationId).toBeTruthy();
      const orgId = res.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Verify User persisted in real DB
      const userInDb = await prisma.user.findUnique({
        where: { id: res.user.id },
      });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.email).toBe(email);
      expect(userInDb?.firstName).toBe('Ananya');
      expect(userInDb?.passwordHash).not.toBe('Password123!'); // Must be hashed

      // Verify Organization persisted in real DB
      const orgInDb = await prisma.organization.findUnique({
        where: { id: orgId },
      });
      expect(orgInDb).not.toBeNull();
      expect(orgInDb?.name).toBe(orgName);

      // Verify Membership persisted with OWNER role and default flag
      const membershipInDb = await prisma.membership.findFirst({
        where: {
          userId: res.user.id,
          organizationId: orgId,
        },
      });
      expect(membershipInDb).not.toBeNull();
      expect(membershipInDb?.role).toBe(Role.OWNER);
      expect(membershipInDb?.status).toBe(MembershipStatus.ACTIVE);
      expect(membershipInDb?.isDefault).toBe(true);
    });

    it('enforces email uniqueness constraint on duplicate registration', async () => {
      const email = `${testRunId}_dup@fioner.test`;
      const regInput = {
        email,
        password: 'Password123!',
        firstName: 'Dup',
        lastName: 'User',
        organizationName: `Dup Org ${testRunId}`,
      };

      const first = await authService.register(regInput, mockSession);
      createdUserIds.push(first.user.id);
      if (first.activeOrganizationId) createdOrgIds.push(first.activeOrganizationId);

      // Duplicate registration attempt must fail
      await expect(authService.register(regInput, mockSession)).rejects.toThrow(
        /already exists/i,
      );
    });

    it('directly enforces database-level email uniqueness constraint (P2002) on duplicate User insertion', async () => {
      const email = `${testRunId}_db_unique_email@fioner.test`;

      // 1. Create first user directly in PostgreSQL with minimum required fields
      const firstUser = await prisma.user.create({
        data: {
          email,
          passwordHash: 'dummy_hash_for_unique_test',
          firstName: 'DbUnique',
          lastName: 'Tester',
        },
      });
      // Track created fixture ID immediately for safe cleanup
      createdUserIds.push(firstUser.id);

      // 2. Attempt second direct Prisma insertion with the exact same email, bypassing service layer
      let error: unknown;
      try {
        await prisma.user.create({
          data: {
            email,
            passwordHash: 'second_dummy_hash',
            firstName: 'Duplicate',
            lastName: 'Attempt',
          },
        });
      } catch (err) {
        error = err;
      }

      // 3. Assert that insertion fails with Prisma error code P2002 on the email field
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2002');
      expect(prismaError.meta?.target).toEqual(['email']);

      // 4. Verify directly in PostgreSQL that exactly one user exists with this email
      const matchingUsers = await prisma.user.findMany({
        where: { email },
      });
      expect(matchingUsers).toHaveLength(1);
      expect(matchingUsers[0]?.id).toBe(firstUser.id);
    });

    it('rolls back completely when a multi-statement transaction fails', async () => {
      const failingEmail = `${testRunId}_rollback@fioner.test`;

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email: failingEmail,
              passwordHash: 'dummy_hash',
              firstName: 'Rollback',
              lastName: 'Tester',
            },
          });

          // Deliberate error to trigger transaction abort
          throw new Error('Simulated transaction failure');
        }),
      ).rejects.toThrow('Simulated transaction failure');

      // Verify user was NOT persisted due to transaction rollback
      const userAfterRollback = await prisma.user.findUnique({
        where: { email: failingEmail },
      });
      expect(userAfterRollback).toBeNull();
    });
  });

  // =========================================================================
  // 3. Refresh-Token Persistence, Rotation & Replay Detection
  // =========================================================================
  describe('Refresh-Token Persistence & Lifecycle', () => {
    it('persists hashed refresh tokens in the database on login', async () => {
      const email = `${testRunId}_tok1@fioner.test`;
      const reg = await authService.register(
        {
          email,
          password: 'Password123!',
          firstName: 'Token',
          lastName: 'Tester',
          organizationName: `Token Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      if (reg.activeOrganizationId) createdOrgIds.push(reg.activeOrganizationId);

      const rawToken = reg.tokens.refreshToken;
      const expectedHash = hashRefreshToken(rawToken);

      const tokenRow = await prisma.refreshToken.findUnique({
        where: { tokenHash: expectedHash },
      });

      expect(tokenRow).not.toBeNull();
      expect(tokenRow?.userId).toBe(reg.user.id);
      expect(tokenRow?.organizationId).toBe(reg.activeOrganizationId);
      expect(tokenRow?.revokedAt).toBeNull();
      expect(tokenRow?.replacedById).toBeNull();
    });

    it('rotates refresh token: revokes the old record and links it to replacement', async () => {
      const email = `${testRunId}_rot@fioner.test`;
      const reg = await authService.register(
        {
          email,
          password: 'Password123!',
          firstName: 'Rotate',
          lastName: 'Tester',
          organizationName: `Rotate Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      if (reg.activeOrganizationId) createdOrgIds.push(reg.activeOrganizationId);

      const initialRawToken = reg.tokens.refreshToken;
      const initialHash = hashRefreshToken(initialRawToken);

      // Perform rotation
      const newTokens = await authService.refresh(initialRawToken, mockSession);
      const replacementHash = hashRefreshToken(newTokens.refreshToken);

      // Check replacement token record in DB
      const replacementRow = await prisma.refreshToken.findUnique({
        where: { tokenHash: replacementHash },
      });
      expect(replacementRow).not.toBeNull();
      expect(replacementRow?.revokedAt).toBeNull();

      // Check original token record in DB
      const oldRow = await prisma.refreshToken.findUnique({
        where: { tokenHash: initialHash },
      });
      expect(oldRow).not.toBeNull();
      expect(oldRow?.revokedAt).not.toBeNull(); // Old token is revoked
      expect(oldRow?.replacedById).toBe(replacementRow?.id); // Linked to replacement
    });

    it('detects replay attack: reuse of revoked token revokes all user sessions in DB', async () => {
      const email = `${testRunId}_replay@fioner.test`;
      const reg = await authService.register(
        {
          email,
          password: 'Password123!',
          firstName: 'Replay',
          lastName: 'Tester',
          organizationName: `Replay Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      if (reg.activeOrganizationId) createdOrgIds.push(reg.activeOrganizationId);

      const token1 = reg.tokens.refreshToken;

      // Legitimate rotation: token1 -> token2
      const tokens2 = await authService.refresh(token1, mockSession);

      // Legitimate login from another session: creates token3
      const loginRes = await authService.login(
        { email, password: 'Password123!' },
        mockSession,
      );
      const token3 = loginRes.tokens.refreshToken;

      // Verify token3 is active before attack
      const token3RowBefore = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(token3) },
      });
      expect(token3RowBefore?.revokedAt).toBeNull();

      // Attacker tries to replay the old token1
      await expect(authService.refresh(token1, mockSession)).rejects.toThrow(
        /revoked/i,
      );

      // After replay attack, ALL active tokens for user must be revoked
      const activeTokensCount = await prisma.refreshToken.count({
        where: {
          userId: reg.user.id,
          revokedAt: null,
        },
      });
      expect(activeTokensCount).toBe(0);

      // Confirm token2 and token3 are now marked revoked in PostgreSQL
      const token2Row = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(tokens2.refreshToken) },
      });
      const token3Row = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(token3) },
      });
      expect(token2Row?.revokedAt).not.toBeNull();
      expect(token3Row?.revokedAt).not.toBeNull();
    });

    it('logout revokes specific token and logout-all revokes all sessions in DB', async () => {
      const email = `${testRunId}_logout@fioner.test`;
      const reg = await authService.register(
        {
          email,
          password: 'Password123!',
          firstName: 'Logout',
          lastName: 'Tester',
          organizationName: `Logout Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      if (reg.activeOrganizationId) createdOrgIds.push(reg.activeOrganizationId);

      // Test single logout
      await authService.logout(reg.tokens.refreshToken);
      const singleRow = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(reg.tokens.refreshToken) },
      });
      expect(singleRow?.revokedAt).not.toBeNull();

      // Test login + logout-all
      await authService.login(
        { email, password: 'Password123!' },
        mockSession,
      );
      const activeBefore = await prisma.refreshToken.count({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeBefore).toBeGreaterThanOrEqual(1);

      await authService.logoutAll(reg.user.id);
      const activeAfter = await prisma.refreshToken.count({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeAfter).toBe(0);
    });
  });

  // =========================================================================
  // 4. Tenant Isolation & Client Extension Scoping
  // =========================================================================
  describe('Tenant Isolation & Query Scoping', () => {
    let orgA: { id: string; name: string };
    let orgB: { id: string; name: string };
    let leadA: { id: string; name: string };
    let leadB: { id: string; name: string };
    let custA: { id: string; name: string };

    beforeAll(async () => {
      // Create Organization A
      const regA = await authService.register(
        {
          email: `${testRunId}_orgA@fioner.test`,
          password: 'Password123!',
          firstName: 'OrgA',
          lastName: 'Admin',
          organizationName: `Alpha Corp ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(regA.user.id);
      expect(regA.activeOrganizationId).toBeTruthy();
      const orgAId = regA.activeOrganizationId!;
      createdOrgIds.push(orgAId);
      orgA = { id: orgAId, name: `Alpha Corp ${testRunId}` };

      // Create Organization B
      const regB = await authService.register(
        {
          email: `${testRunId}_orgB@fioner.test`,
          password: 'Password123!',
          firstName: 'OrgB',
          lastName: 'Admin',
          organizationName: `Beta Corp ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(regB.user.id);
      expect(regB.activeOrganizationId).toBeTruthy();
      const orgBId = regB.activeOrganizationId!;
      createdOrgIds.push(orgBId);
      orgB = { id: orgBId, name: `Beta Corp ${testRunId}` };

      // Create Lead in Org A
      leadA = await leadRepository(orgA.id).create({
        name: `Alpha Lead ${testRunId}`,
        email: 'alpha_lead@test.com',
        source: 'WEBSITE',
        status: 'NEW',
      });

      // Create Lead in Org B
      leadB = await leadRepository(orgB.id).create({
        name: `Beta Lead ${testRunId}`,
        email: 'beta_lead@test.com',
        source: 'REFERRAL',
        status: 'QUALIFIED',
      });

      // Create Customer in Org A
      custA = await customerRepository.create(orgA.id, {
        name: `Alpha Cust ${testRunId}`,
        email: 'alpha_cust@test.com',
        company: 'Alpha Logistics',
      });
    });

    it('scopes leadRepository.list strictly to the requesting organization', async () => {
      const listA = await leadRepository(orgA.id).list({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      expect(listA.items.some((l) => l.id === leadA.id)).toBe(true);
      expect(listA.items.some((l) => l.id === leadB.id)).toBe(false);

      const listB = await leadRepository(orgB.id).list({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      expect(listB.items.some((l) => l.id === leadB.id)).toBe(true);
      expect(listB.items.some((l) => l.id === leadA.id)).toBe(false);
    });

    it('scopes customerRepository.findMany strictly to the requesting organization', async () => {
      const custsA = await customerRepository.findMany(orgA.id, 0, 50);
      expect(custsA.items.some((c) => c.id === custA.id)).toBe(true);

      const custsB = await customerRepository.findMany(orgB.id, 0, 50);
      expect(custsB.items.some((c) => c.id === custA.id)).toBe(false);
    });

    it('prevents cross-tenant reads: findById on another organization returns null', async () => {
      // Org B attempts to read Org A's lead
      const readLead = await leadRepository(orgB.id).findById(leadA.id);
      expect(readLead).toBeNull();

      // Org B attempts to read Org A's customer
      const readCust = await customerRepository.findById(orgB.id, custA.id);
      expect(readCust).toBeNull();
    });

    it('prevents cross-tenant updates and deletes via tenantClient query extension', async () => {
      const clientB = tenantClient(orgB.id);

      // Org B attempts to update Org A's lead
      await expect(
        clientB.lead.update({
          where: { id: leadA.id },
          data: { name: 'Attempted Cross-Tenant Tamper' },
        }),
      ).rejects.toThrow();

      // Verify Org A lead was NOT mutated
      const intactLead = await leadRepository(orgA.id).findById(leadA.id);
      expect(intactLead?.name).toBe(leadA.name);

      // Org B attempts to delete Org A's lead
      await expect(
        clientB.lead.delete({
          where: { id: leadA.id },
        }),
      ).rejects.toThrow();

      // Verify Org A lead still exists
      const stillExists = await leadRepository(orgA.id).findById(leadA.id);
      expect(stillExists).not.toBeNull();
    });

    it('rejects unsafe findUnique on tenant models to prevent un-scoped lookups', async () => {
      const clientA = tenantClient(orgA.id);

      await expect(
        clientA.lead.findUnique({
          where: { id: leadA.id },
        }),
      ).rejects.toThrow(/not allowed on tenant model/i);
    });

    it('scopes teamRepository strictly to the requesting organization', async () => {
      const teamA = await teamRepository(orgA.id).create({
        name: `Alpha Sales Team ${testRunId}`,
        status: 'ACTIVE',
      });

      const listA = await teamRepository(orgA.id).list({});
      expect(listA.items.some((t) => t.id === teamA.id)).toBe(true);

      const listB = await teamRepository(orgB.id).list({});
      expect(listB.items.some((t) => t.id === teamA.id)).toBe(false);

      const crossRead = await teamRepository(orgB.id).findById(teamA.id);
      expect(crossRead).toBeNull();
    });

    it('scopes actual production dashboardController queries strictly to requesting organization in PostgreSQL', async () => {
      interface DashboardStatsPayload {
        success: boolean;
        data: {
          metrics: {
            totalLeads: number;
            totalCustomers: number;
          };
        };
      }

      interface DashboardNotificationItem {
        id: string;
        type: string;
        title: string;
      }

      interface DashboardNotificationsPayload {
        success: boolean;
        data: DashboardNotificationItem[];
      }

      // Helper to execute actual production dashboardController.stats against PostgreSQL
      const executeStats = async (organizationId: string) => {
        let status = 200;
        let responsePayload: DashboardStatsPayload | undefined;
        const req = {
          tenant: { organizationId },
          query: {},
        } as unknown as Request;
        const res = {
          status: (code: number) => {
            status = code;
            return res;
          },
          json: (body: DashboardStatsPayload) => {
            responsePayload = body;
            return res;
          },
        } as unknown as Response;

        await dashboardController.stats(req, res);
        expect(status).toBe(200);
        expect(responsePayload?.success).toBe(true);
        return responsePayload!.data;
      };

      // Helper to execute actual production dashboardController.notifications against PostgreSQL
      const executeNotifications = async (organizationId: string) => {
        let responsePayload: DashboardNotificationsPayload | undefined;
        const req = {
          tenant: { organizationId },
        } as unknown as Request;
        const res = {
          status: () => res,
          json: (body: DashboardNotificationsPayload) => {
            responsePayload = body;
            return res;
          },
        } as unknown as Response;

        await dashboardController.notifications(req, res);
        expect(responsePayload?.success).toBe(true);
        return responsePayload!.data;
      };

      // 1. Production dashboardController.stats execution against PostgreSQL
      const statsA = await executeStats(orgA.id);
      expect(statsA.metrics.totalLeads).toBe(1);
      expect(statsA.metrics.totalCustomers).toBe(1);

      const statsB = await executeStats(orgB.id);
      expect(statsB.metrics.totalLeads).toBe(1);
      expect(statsB.metrics.totalCustomers).toBe(0);

      // Verify that customer metrics strictly discriminate Org A from Org B in PostgreSQL
      expect(statsA.metrics.totalCustomers).not.toBe(statsB.metrics.totalCustomers);

      // 2. Production dashboardController.notifications execution against PostgreSQL
      const notifsA = await executeNotifications(orgA.id);
      expect(notifsA.some((n) => n.id === `lead-${leadA.id}`)).toBe(true);
      expect(notifsA.some((n) => n.id === `lead-${leadB.id}`)).toBe(false);

      const notifsB = await executeNotifications(orgB.id);
      expect(notifsB.some((n) => n.id === `lead-${leadB.id}`)).toBe(true);
      expect(notifsB.some((n) => n.id === `lead-${leadA.id}`)).toBe(false);
    });
  });

  // =========================================================================
  // 5. Database Constraints & Referential Integrity
  // =========================================================================
  describe('Database Constraints & Referential Integrity', () => {
    it('enforces foreign key constraints: rejects lead insertion with invalid organizationId', async () => {
      await expect(
        prisma.lead.create({
          data: {
            name: 'Orphan Lead',
            organizationId: '00000000-0000-0000-0000-000000000000',
            status: 'NEW',
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('enforces compound unique constraint on membership (userId, organizationId)', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_comp@fioner.test`,
          password: 'Password123!',
          firstName: 'Compound',
          lastName: 'Tester',
          organizationName: `Compound Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      expect(reg.activeOrganizationId).toBeTruthy();
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Attempting to create duplicate membership directly via Prisma
      await expect(
        prisma.membership.create({
          data: {
            userId: reg.user.id,
            organizationId: orgId,
            role: Role.EXECUTIVE,
            status: MembershipStatus.ACTIVE,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('cascades deletion: deleting an organization removes memberships and tenant records in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_cascade@fioner.test`,
          password: 'Password123!',
          firstName: 'Cascade',
          lastName: 'Tester',
          organizationName: `Cascade Org ${testRunId}`,
        },
        mockSession,
      );
      expect(reg.activeOrganizationId).toBeTruthy();
      const orgId = reg.activeOrganizationId!;
      const userId = reg.user.id;
      createdUserIds.push(userId);

      // Create a lead in this organization
      const lead = await leadRepository(orgId).create({
        name: `Cascade Lead ${testRunId}`,
        status: 'NEW',
      });

      // Delete the organization
      await prisma.organization.delete({
        where: { id: orgId },
      });

      // Confirm membership was cascaded
      const membership = await prisma.membership.findFirst({
        where: { organizationId: orgId },
      });
      expect(membership).toBeNull();

      // Confirm lead was cascaded
      const leadInDb = await prisma.lead.findFirst({
        where: { id: lead.id },
      });
      expect(leadInDb).toBeNull();
    });
  });

  // =========================================================================
  // 6. Audit Log Persistence, Tenant Isolation & Immutability (SOW §5, §8.8)
  // =========================================================================
  describe('Audit Log Persistence, Tenant Isolation & Immutability in PostgreSQL', () => {
    it('persists audit log entry with foreign keys and sanitized metadata in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_audit1@fioner.test`,
          password: 'Password123!',
          firstName: 'Audit',
          lastName: 'Actor',
          organizationName: `Audit Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      expect(reg.activeOrganizationId).toBeTruthy();
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const log = await auditService.record({
        organizationId: orgId,
        actorId: reg.user.id,
        action: 'lead.deleted',
        entity: 'Lead',
        entityId: 'lead_abc_123',
        ipAddress: '192.168.1.1',
        metadata: {
          leadName: 'Sensitive Deal',
          clientSecret: 'secret_to_strip',
          safeNote: 'Archived due to inactivity',
        },
      });

      createdAuditLogIds.push(log.id);

      // Verify row in real database
      const row = await prisma.auditLog.findUnique({
        where: { id: log.id },
      });

      expect(row).not.toBeNull();
      expect(row?.organizationId).toBe(orgId);
      expect(row?.actorId).toBe(reg.user.id);
      expect(row?.action).toBe('lead.deleted');
      expect(row?.entity).toBe('Lead');
      expect(row?.entityId).toBe('lead_abc_123');
      expect(row?.ipAddress).toBe('192.168.1.1');
      expect(row?.createdAt).toBeInstanceOf(Date);
      // Verify sensitive metadata was stripped
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta.leadName).toBe('Sensitive Deal');
      expect(meta.safeNote).toBe('Archived due to inactivity');
      expect(meta.clientSecret).toBeUndefined();
    });

    it('strictly isolates audit logs between organizations in PostgreSQL queries', async () => {
      // Create Org A
      const regA = await authService.register(
        {
          email: `${testRunId}_audit_a@fioner.test`,
          password: 'Password123!',
          firstName: 'OrgA',
          lastName: 'User',
          organizationName: `Audit Org A ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(regA.user.id);
      const orgA = regA.activeOrganizationId!;
      createdOrgIds.push(orgA);

      // Create Org B
      const regB = await authService.register(
        {
          email: `${testRunId}_audit_b@fioner.test`,
          password: 'Password123!',
          firstName: 'OrgB',
          lastName: 'User',
          organizationName: `Audit Org B ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(regB.user.id);
      const orgB = regB.activeOrganizationId!;
      createdOrgIds.push(orgB);

      // Record logs for both orgs
      const logA = await auditService.record({
        organizationId: orgA,
        actorId: regA.user.id,
        action: 'member.removed',
        entity: 'Membership',
        entityId: 'mem_a_1',
      });
      createdAuditLogIds.push(logA.id);

      const logB = await auditService.record({
        organizationId: orgB,
        actorId: regB.user.id,
        action: 'member.removed',
        entity: 'Membership',
        entityId: 'mem_b_1',
      });
      createdAuditLogIds.push(logB.id);

      // Org A queries audit logs
      const listA = await auditService.list(orgA);
      expect(listA.items.some((l) => l.id === logA.id)).toBe(true);
      expect(listA.items.some((l) => l.id === logB.id)).toBe(false);

      // Org B queries audit logs
      const listB = await auditService.list(orgB);
      expect(listB.items.some((l) => l.id === logB.id)).toBe(true);
      expect(listB.items.some((l) => l.id === logA.id)).toBe(false);

      // Org A cannot get Org B's audit log by ID
      const getBFromA = await auditService.getById(logB.id, orgA);
      expect(getBFromA).toBeNull();

      // Org A can get Org A's audit log by ID
      const getAFromA = await auditService.getById(logA.id, orgA);
      expect(getAFromA).not.toBeNull();
      expect(getAFromA?.id).toBe(logA.id);
    });

    it('preserves audit records when organization is deleted via onDelete: SetNull (SOW §8.8)', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_audit_del@fioner.test`,
          password: 'Password123!',
          firstName: 'Audit',
          lastName: 'Preserve',
          organizationName: `Audit Preserve Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;

      const log = await auditService.record({
        organizationId: orgId,
        actorId: reg.user.id,
        action: 'organization.updated',
        entity: 'Organization',
        entityId: orgId,
      });
      createdAuditLogIds.push(log.id);

      // Delete the organization
      await prisma.organization.delete({
        where: { id: orgId },
      });

      // Verify the audit log record still exists in PostgreSQL, with organizationId set to null
      const row = await prisma.auditLog.findUnique({
        where: { id: log.id },
      });
      expect(row).not.toBeNull();
      expect(row?.organizationId).toBeNull();
      expect(row?.actorId).toBe(reg.user.id);
      expect(row?.action).toBe('organization.updated');
    });
  });

  // =========================================================================
  // 6. Audit Atomicity & Failure Semantics in PostgreSQL (Phase 3D.6)
  // =========================================================================
  describe('Audit Atomicity & Failure Semantics in PostgreSQL (Phase 3D.6)', () => {
    it('leadService.remove: audit write failure rolls back lead deletion in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_lead@fioner.test`,
          password: 'Password123!',
          firstName: 'Atomic',
          lastName: 'Lead',
          organizationName: `Atomic Lead Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Create a lead in PostgreSQL
      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          name: 'Crucial Deal',
          status: 'NEW',
          source: 'WEBSITE',
          value: new Prisma.Decimal('75000'),
        },
      });

      // Inject deterministic audit write failure
      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (lead deletion)');
      });

      // Execute remove — must throw the injected error
      await expect(
        leadService.remove(orgId, lead.id, reg.user.id, '127.0.0.1'),
      ).rejects.toThrow('Injected audit write failure (lead deletion)');

      recordSpy.mockRestore();

      // Verify PostgreSQL state: Lead MUST NOT be deleted (rolled back)
      const leadInDb = await prisma.lead.findUnique({
        where: { id: lead.id },
      });
      expect(leadInDb).not.toBeNull();
      expect(leadInDb?.id).toBe(lead.id);
      expect(leadInDb?.name).toBe('Crucial Deal');

      // Verify PostgreSQL state: NO audit record exists claiming lead.deleted
      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'lead.deleted', entityId: lead.id },
      });
      expect(auditInDb).toHaveLength(0);

      // Now execute clean deletion without fault injection to confirm atomic success
      await leadService.remove(orgId, lead.id, reg.user.id, '127.0.0.1');
      const leadAfterSuccess = await prisma.lead.findUnique({
        where: { id: lead.id },
      });
      expect(leadAfterSuccess).toBeNull();

      const auditAfterSuccess = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'lead.deleted', entityId: lead.id },
      });
      expect(auditAfterSuccess).toHaveLength(1);
      createdAuditLogIds.push(auditAfterSuccess[0]!.id);
    });

    it('customerService.remove: audit write failure rolls back customer deletion in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_cust@fioner.test`,
          password: 'Password123!',
          firstName: 'Atomic',
          lastName: 'Customer',
          organizationName: `Atomic Customer Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const customer = await prisma.customer.create({
        data: {
          organizationId: orgId,
          name: 'VIP Client Inc',
          email: `${testRunId}_vip@client.test`,
        },
      });

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (customer deletion)');
      });

      await expect(
        customerService.remove(orgId, customer.id, reg.user.id, '127.0.0.1'),
      ).rejects.toThrow('Injected audit write failure (customer deletion)');

      recordSpy.mockRestore();

      // Customer must still exist in PostgreSQL
      const custInDb = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(custInDb).not.toBeNull();
      expect(custInDb?.name).toBe('VIP Client Inc');

      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'customer.deleted', entityId: customer.id },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('teamService.remove: audit write failure rolls back team deletion in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_team@fioner.test`,
          password: 'Password123!',
          firstName: 'Atomic',
          lastName: 'Team',
          organizationName: `Atomic Team Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const team = await prisma.team.create({
        data: {
          organizationId: orgId,
          name: 'Enterprise Sales',
        },
      });

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (team deletion)');
      });

      await expect(
        teamService.remove(orgId, team.id, reg.user.id, '127.0.0.1'),
      ).rejects.toThrow('Injected audit write failure (team deletion)');

      recordSpy.mockRestore();

      // Team must still exist in PostgreSQL
      const teamInDb = await prisma.team.findUnique({
        where: { id: team.id },
      });
      expect(teamInDb).not.toBeNull();
      expect(teamInDb?.name).toBe('Enterprise Sales');

      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'team.deleted', entityId: team.id },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('organizationService.update: audit write failure rolls back organization update in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_org@fioner.test`,
          password: 'Password123!',
          firstName: 'Atomic',
          lastName: 'Org',
          organizationName: `Original Org Name ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (org update)');
      });

      await expect(
        organizationService.update(
          orgId,
          { name: `Mutated Org Name ${testRunId}` },
          reg.user.id,
          '127.0.0.1',
        ),
      ).rejects.toThrow('Injected audit write failure (org update)');

      recordSpy.mockRestore();

      // Org name must remain original in PostgreSQL
      const orgInDb = await prisma.organization.findUnique({
        where: { id: orgId },
      });
      expect(orgInDb?.name).toBe(`Original Org Name ${testRunId}`);

      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'organization.updated' },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('authService.changePassword: audit write failure rolls back password change and token revocation in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_pass@fioner.test`,
          password: 'InitialPassword123!',
          firstName: 'Atomic',
          lastName: 'Password',
          organizationName: `Atomic Pass Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Verify active refresh token in PostgreSQL
      const activeTokensBefore = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeTokensBefore.length).toBeGreaterThan(0);

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (password change)');
      });

      await expect(
        authService.changePassword(
          reg.user.id,
          {
            currentPassword: 'InitialPassword123!',
            newPassword: 'BrandNewPassword456!',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow('Injected audit write failure (password change)');

      recordSpy.mockRestore();

      // In PostgreSQL: user password must still match InitialPassword123!
      const userInDb = await prisma.user.findUnique({
        where: { id: reg.user.id },
      });
      const oldMatches = await verifyPassword('InitialPassword123!', userInDb!.passwordHash);
      expect(oldMatches).toBe(true);

      const newMatches = await verifyPassword('BrandNewPassword456!', userInDb!.passwordHash);
      expect(newMatches).toBe(false);

      // In PostgreSQL: active refresh token must NOT be revoked
      const activeTokensAfter = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeTokensAfter.length).toBe(activeTokensBefore.length);

      // In PostgreSQL: no audit log exists
      const auditInDb = await prisma.auditLog.findMany({
        where: { action: 'auth.password_changed', entityId: reg.user.id },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('userService.invite: audit write failure rolls back user invitation in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_invite_owner@fioner.test`,
          password: 'Password123!',
          firstName: 'Owner',
          lastName: 'User',
          organizationName: `Invite Atomic Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const targetEmail = `${testRunId}_atomic_invited@fioner.test`;

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (user invitation)');
      });

      await expect(
        userService.invite(
          orgId,
          reg.user.id,
          {
            email: targetEmail,
            firstName: 'Invited',
            lastName: 'Person',
            role: Role.EXECUTIVE,
            temporaryPassword: 'TempPassword123!',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow('Injected audit write failure (user invitation)');

      recordSpy.mockRestore();

      // In PostgreSQL: invited user must not exist
      const invitedUser = await prisma.user.findUnique({
        where: { email: targetEmail },
      });
      expect(invitedUser).toBeNull();

      // In PostgreSQL: no audit log exists
      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'member.invited' },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('userService.updateMember: audit write failure rolls back member update in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_upd_mem@fioner.test`,
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'User',
          organizationName: `Update Member Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Invite a member cleanly
      const inviteResult = await userService.invite(orgId, reg.user.id, {
        email: `${testRunId}_member_to_upd@fioner.test`,
        firstName: 'Executive',
        lastName: 'Member',
        role: Role.EXECUTIVE,
        temporaryPassword: 'TempPassword123!',
      });
      createdUserIds.push(inviteResult.userId);
      const membershipId = inviteResult.id;

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (member update)');
      });

      await expect(
        userService.updateMember(
          orgId,
          membershipId,
          { role: Role.ADMIN },
          reg.user.id,
          '127.0.0.1',
        ),
      ).rejects.toThrow('Injected audit write failure (member update)');

      recordSpy.mockRestore();

      // In PostgreSQL: member role must still be EXECUTIVE
      const memberInDb = await prisma.membership.findUnique({
        where: { id: membershipId },
      });
      expect(memberInDb?.role).toBe(Role.EXECUTIVE);

      // In PostgreSQL: no audit log for update exists
      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'member.updated', entityId: membershipId },
      });
      expect(auditInDb).toHaveLength(0);
    });

    it('userService.removeMember: audit write failure rolls back member removal in PostgreSQL', async () => {
      const reg = await authService.register(
        {
          email: `${testRunId}_atomic_rem_mem@fioner.test`,
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'User',
          organizationName: `Remove Member Org ${testRunId}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const inviteResult = await userService.invite(orgId, reg.user.id, {
        email: `${testRunId}_member_to_rem@fioner.test`,
        firstName: 'ToRemove',
        lastName: 'Member',
        role: Role.EXECUTIVE,
        temporaryPassword: 'TempPassword123!',
      });
      createdUserIds.push(inviteResult.userId);
      const membershipId = inviteResult.id;

      const recordSpy = vi.spyOn(auditService, 'record').mockImplementation(async () => {
        throw new Error('Injected audit write failure (member removal)');
      });

      await expect(
        userService.removeMember(orgId, membershipId, reg.user.id, '127.0.0.1'),
      ).rejects.toThrow('Injected audit write failure (member removal)');

      recordSpy.mockRestore();

      // In PostgreSQL: member must still exist
      const memberInDb = await prisma.membership.findUnique({
        where: { id: membershipId },
      });
      expect(memberInDb).not.toBeNull();
      expect(memberInDb?.id).toBe(membershipId);

      // In PostgreSQL: no audit log for remove exists
      const auditInDb = await prisma.auditLog.findMany({
        where: { organizationId: orgId, action: 'member.removed', entityId: membershipId },
      });
      expect(auditInDb).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. Super Admin Platform User Management in PostgreSQL (Phase 1 Slice)
  // =========================================================================
  describe('Super Admin Platform User Management in PostgreSQL (Phase 1 Slice)', () => {
    it('lists users across multiple independent organizations globally without tenant boundaries', async () => {
      const uniqueSuffix = `adm_usr_${Date.now()}`;

      // Create User 1 in Org 1
      const reg1 = await authService.register(
        {
          email: `${uniqueSuffix}_user1@alpha.test`,
          password: 'Password123!',
          firstName: `AlphaUser_${uniqueSuffix}`,
          lastName: 'Tester',
          organizationName: `Alpha Corp ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg1.user.id);
      createdOrgIds.push(reg1.activeOrganizationId!);

      // Create User 2 in Org 2
      const reg2 = await authService.register(
        {
          email: `${uniqueSuffix}_user2@beta.test`,
          password: 'Password123!',
          firstName: `BetaUser_${uniqueSuffix}`,
          lastName: 'Tester',
          organizationName: `Beta Corp ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg2.user.id);
      createdOrgIds.push(reg2.activeOrganizationId!);

      // Super Admin lists users across the entire platform
      const result = await adminUserService.listUsers({
        search: uniqueSuffix,
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.meta.pagination.total).toBeGreaterThanOrEqual(2);

      const foundUser1 = result.items.find((u) => u.id === reg1.user.id);
      const foundUser2 = result.items.find((u) => u.id === reg2.user.id);

      expect(foundUser1).toBeDefined();
      expect(foundUser2).toBeDefined();

      // Proves cross-tenant data visibility
      expect(foundUser1?.memberships[0]?.organization.name).toBe(`Alpha Corp ${uniqueSuffix}`);
      expect(foundUser2?.memberships[0]?.organization.name).toBe(`Beta Corp ${uniqueSuffix}`);

      // Crucial security guarantee: passwordHash is NEVER exposed
      expect(foundUser1).not.toHaveProperty('passwordHash');
      expect(foundUser2).not.toHaveProperty('passwordHash');
    });

    it('filters platform users by isActive status and case-insensitive search in PostgreSQL', async () => {
      const uniqueSuffix = `adm_flt_${Date.now()}`;

      // User Active
      const regActive = await authService.register(
        {
          email: `${uniqueSuffix}_active@test.com`,
          password: 'Password123!',
          firstName: 'ActiveUser',
          lastName: uniqueSuffix,
          organizationName: `Active Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regActive.user.id);
      createdOrgIds.push(regActive.activeOrganizationId!);

      // User Suspended / Inactive
      const regInactive = await authService.register(
        {
          email: `${uniqueSuffix}_suspended@test.com`,
          password: 'Password123!',
          firstName: 'SuspendedUser',
          lastName: uniqueSuffix,
          organizationName: `Suspended Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regInactive.user.id);
      createdOrgIds.push(regInactive.activeOrganizationId!);

      // Mark user inactive directly in PostgreSQL
      await prisma.user.update({
        where: { id: regInactive.user.id },
        data: { isActive: false },
      });

      // Filter by isActive = false
      const inactiveResult = await adminUserService.listUsers({
        search: uniqueSuffix,
        isActive: false,
      });

      const inactiveIds = inactiveResult.items.map((u) => u.id);
      expect(inactiveIds).toContain(regInactive.user.id);
      expect(inactiveIds).not.toContain(regActive.user.id);

      // Filter by isActive = true
      const activeResult = await adminUserService.listUsers({
        search: uniqueSuffix,
        isActive: true,
      });

      const activeIds = activeResult.items.map((u) => u.id);
      expect(activeIds).toContain(regActive.user.id);
      expect(activeIds).not.toContain(regInactive.user.id);
    });

    it('respects pagination and ordering across global users in PostgreSQL', async () => {
      const uniqueSuffix = `adm_pg_${Date.now()}`;

      const regA = await authService.register(
        {
          email: `a_${uniqueSuffix}@page.test`,
          password: 'Password123!',
          firstName: 'UserA',
          lastName: uniqueSuffix,
          organizationName: `Page Org A ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regA.user.id);
      createdOrgIds.push(regA.activeOrganizationId!);

      const regB = await authService.register(
        {
          email: `b_${uniqueSuffix}@page.test`,
          password: 'Password123!',
          firstName: 'UserB',
          lastName: uniqueSuffix,
          organizationName: `Page Org B ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regB.user.id);
      createdOrgIds.push(regB.activeOrganizationId!);

      // Query page 1 with limit 1, ordered by email asc
      const page1 = await adminUserService.listUsers({
        search: uniqueSuffix,
        page: 1,
        limit: 1,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(page1.items).toHaveLength(1);
      expect(page1.items[0]?.email).toBe(`a_${uniqueSuffix}@page.test`);
      expect(page1.meta.pagination.page).toBe(1);
      expect(page1.meta.pagination.limit).toBe(1);
      expect(page1.meta.pagination.total).toBe(2);
      expect(page1.meta.pagination.totalPages).toBe(2);
      expect(page1.meta.pagination.hasNextPage).toBe(true);

      // Query page 2
      const page2 = await adminUserService.listUsers({
        search: uniqueSuffix,
        page: 2,
        limit: 1,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(page2.items).toHaveLength(1);
      expect(page2.items[0]?.email).toBe(`b_${uniqueSuffix}@page.test`);
      expect(page2.meta.pagination.page).toBe(2);
      expect(page2.meta.pagination.hasNextPage).toBe(false);
      expect(page2.meta.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('Super Admin User Status Management in PostgreSQL (Phase 2 Slice)', () => {
    it('deactivates active user in PostgreSQL: sets isActive = false, revokes all active refresh tokens, and records audit log', async () => {
      const uniqueSuffix = `adm_stat_${Date.now()}`;

      // 1. Create a Super Admin user in PostgreSQL
      const superAdmin = await prisma.user.create({
        data: {
          email: `super_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      // 2. Create an ordinary user with an organization
      const reg = await authService.register(
        {
          email: `target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'Target',
          lastName: 'User',
          organizationName: `Target Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      createdOrgIds.push(reg.activeOrganizationId!);

      // Verify user has an active refresh token from registration
      const tokensBefore = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(tokensBefore.length).toBeGreaterThanOrEqual(1);

      // 3. Super Admin deactivates the user
      const updated = await adminUserService.updateStatus({
        targetUserId: reg.user.id,
        actingAdminId: superAdmin.id,
        input: {
          isActive: false,
          reason: 'Suspension test in PostgreSQL',
        },
        ipAddress: '127.0.0.1',
      });

      expect(updated.isActive).toBe(false);

      // 4. Verify in PostgreSQL that User.isActive is false
      const userInDb = await prisma.user.findUnique({
        where: { id: reg.user.id },
      });
      expect(userInDb?.isActive).toBe(false);

      // 5. Verify all refresh tokens are revoked in PostgreSQL
      const activeTokensAfter = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeTokensAfter).toHaveLength(0);

      const allTokens = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id },
      });
      expect(allTokens.every((t) => t.revokedAt !== null)).toBe(true);

      // 6. Verify audit log was recorded in PostgreSQL
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.user_deactivated',
          entityId: reg.user.id,
        },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actorId).toBe(superAdmin.id);
      expect(auditEntry?.entity).toBe('User');
      expect((auditEntry?.metadata as Record<string, unknown>)?.reason).toBe(
        'Suspension test in PostgreSQL',
      );
      expect((auditEntry?.metadata as Record<string, unknown>)?.previousStatus).toBe(true);
      expect((auditEntry?.metadata as Record<string, unknown>)?.newStatus).toBe(false);

      // 7. Verify login is now blocked
      await expect(
        authService.login(
          {
            email: `target_${uniqueSuffix}@fioner.test`,
            password: 'Password123!',
          },
          mockSession,
        ),
      ).rejects.toThrow('This account has been deactivated');
    });

    it('reactivates inactive user in PostgreSQL: sets isActive = true, records audit log, and restores login capability', async () => {
      const uniqueSuffix = `adm_react_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_react_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `react_target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'React',
          lastName: 'User',
          organizationName: `React Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      createdOrgIds.push(reg.activeOrganizationId!);

      // Deactivate first
      await adminUserService.updateStatus({
        targetUserId: reg.user.id,
        actingAdminId: superAdmin.id,
        input: { isActive: false },
      });

      // Reactivate
      const reactivated = await adminUserService.updateStatus({
        targetUserId: reg.user.id,
        actingAdminId: superAdmin.id,
        input: { isActive: true },
        ipAddress: '127.0.0.1',
      });

      expect(reactivated.isActive).toBe(true);

      const userInDb = await prisma.user.findUnique({
        where: { id: reg.user.id },
      });
      expect(userInDb?.isActive).toBe(true);

      // Verify audit log for reactivation
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.user_reactivated',
          entityId: reg.user.id,
        },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actorId).toBe(superAdmin.id);
      expect((auditEntry?.metadata as Record<string, unknown>)?.previousStatus).toBe(false);
      expect((auditEntry?.metadata as Record<string, unknown>)?.newStatus).toBe(true);

      // Verify login works again
      const loginResult = await authService.login(
        {
          email: `react_target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
        },
        mockSession,
      );
      expect(loginResult.user.id).toBe(reg.user.id);
      expect(loginResult.tokens.accessToken).toBeDefined();
    });

    it('rolls back status change and token revocation in PostgreSQL if audit log creation fails', async () => {
      const uniqueSuffix = `adm_tx_fail_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_tx_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `tx_target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'TxFail',
          lastName: 'User',
          organizationName: `Tx Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      createdOrgIds.push(reg.activeOrganizationId!);

      // Spy on auditService.record to simulate failure inside transaction
      vi.spyOn(auditService, 'record').mockRejectedValueOnce(
        new Error('Simulated audit persistence failure in PostgreSQL'),
      );

      await expect(
        adminUserService.updateStatus({
          targetUserId: reg.user.id,
          actingAdminId: superAdmin.id,
          input: { isActive: false },
        }),
      ).rejects.toThrow('Simulated audit persistence failure in PostgreSQL');

      // Verify user remains active in PostgreSQL
      const userInDb = await prisma.user.findUnique({
        where: { id: reg.user.id },
      });
      expect(userInDb?.isActive).toBe(true);

      // Verify refresh token remains active in PostgreSQL
      const activeTokens = await prisma.refreshToken.findMany({
        where: { userId: reg.user.id, revokedAt: null },
      });
      expect(activeTokens.length).toBeGreaterThanOrEqual(1);
    });

    it('rolls back status change in PostgreSQL if refresh token revocation fails', async () => {
      const uniqueSuffix = `adm_tok_fail_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_tok_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `tok_target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'TokFail',
          lastName: 'User',
          organizationName: `Tok Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      createdOrgIds.push(reg.activeOrganizationId!);

      // Inject deterministic failure into authRepository.revokeAllUserTokens inside transaction
      const revokeSpy = vi.spyOn(authRepository, 'revokeAllUserTokens').mockRejectedValueOnce(
        new Error('Simulated token revocation failure in PostgreSQL'),
      );

      try {
        await expect(
          adminUserService.updateStatus({
            targetUserId: reg.user.id,
            actingAdminId: superAdmin.id,
            input: { isActive: false },
          }),
        ).rejects.toThrow('Simulated token revocation failure in PostgreSQL');

        // 1. Verify User.isActive remains unchanged (true) in PostgreSQL
        const userInDb = await prisma.user.findUnique({
          where: { id: reg.user.id },
        });
        expect(userInDb?.isActive).toBe(true);

        // 2. Verify refresh tokens remain unrevoked in PostgreSQL
        const activeTokens = await prisma.refreshToken.findMany({
          where: { userId: reg.user.id, revokedAt: null },
        });
        expect(activeTokens.length).toBeGreaterThanOrEqual(1);

        // 3. Verify no admin.user_deactivated audit event was persisted
        const auditEntries = await prisma.auditLog.findMany({
          where: {
            action: 'admin.user_deactivated',
            entityId: reg.user.id,
          },
        });
        expect(auditEntries).toHaveLength(0);
      } finally {
        revokeSpy.mockRestore();
      }
    });

    it('idempotently returns existing status in PostgreSQL without creating duplicate audit log', async () => {
      const uniqueSuffix = `adm_idem_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_idem_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `idem_target_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'Idem',
          lastName: 'User',
          organizationName: `Idem Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      createdOrgIds.push(reg.activeOrganizationId!);

      const auditCountBefore = await prisma.auditLog.count({
        where: { entityId: reg.user.id },
      });

      // Target user is already active; requesting isActive: true is a no-op
      const result = await adminUserService.updateStatus({
        targetUserId: reg.user.id,
        actingAdminId: superAdmin.id,
        input: { isActive: true },
      });

      expect(result.isActive).toBe(true);

      const auditCountAfter = await prisma.auditLog.count({
        where: { entityId: reg.user.id },
      });

      expect(auditCountAfter).toBe(auditCountBefore);
    });
  });

  describe('Super Admin Organization Management in PostgreSQL (Phase 3 Slice)', () => {
    it('lists organizations across the platform in PostgreSQL with membership counts', async () => {
      const uniqueSuffix = `adm_org_list_${Date.now()}`;

      // 1. Create two organizations via authService.register
      const regA = await authService.register(
        {
          email: `org_owner_a_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'OwnerA',
          lastName: 'User',
          organizationName: `Alpha Corp ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regA.user.id);
      const orgAId = regA.activeOrganizationId!;
      createdOrgIds.push(orgAId);

      const regB = await authService.register(
        {
          email: `org_owner_b_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'OwnerB',
          lastName: 'User',
          organizationName: `Beta LLC ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(regB.user.id);
      const orgBId = regB.activeOrganizationId!;
      createdOrgIds.push(orgBId);

      // 2. Query platform organizations
      const list = await adminOrganizationService.listOrganizations({
        search: uniqueSuffix,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(list.items).toHaveLength(2);
      expect(list.items[0]?.name).toBe(`Alpha Corp ${uniqueSuffix}`);
      expect(list.items[1]?.name).toBe(`Beta LLC ${uniqueSuffix}`);
      expect(list.items[0]?._count.memberships).toBeGreaterThanOrEqual(1);
      expect(list.meta.pagination.total).toBe(2);
    });

    it('retrieves organization details by ID in PostgreSQL and returns 404 for nonexistent ID', async () => {
      const uniqueSuffix = `adm_org_get_${Date.now()}`;

      const reg = await authService.register(
        {
          email: `org_get_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'GetOwner',
          lastName: 'User',
          organizationName: `Detail Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const detail = await adminOrganizationService.getOrganizationById(orgId);
      expect(detail.id).toBe(orgId);
      expect(detail.name).toBe(`Detail Org ${uniqueSuffix}`);
      expect(detail.isActive).toBe(true);
      expect(detail._count.memberships).toBeGreaterThanOrEqual(1);

      await expect(
        adminOrganizationService.getOrganizationById('nonexistent_org_id_123'),
      ).rejects.toThrow('Organization not found');
    });

    it('deactivates and reactivates organization in PostgreSQL: enforces resolveTenant rejection when inactive', async () => {
      const uniqueSuffix = `adm_org_stat_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_org_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `tenant_user_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'Tenant',
          lastName: 'User',
          organizationName: `Toggle Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Helper to test resolveTenant middleware execution
      const testResolveTenant = async () => {
        const req = {
          auth: { userId: reg.user.id, email: reg.user.email, isSuperAdmin: false },
          headers: { 'x-organization-id': orgId },
        } as unknown as Request;
        let caughtError: unknown = null;
        await resolveTenant(req, {} as Response, (err?: unknown) => {
          if (err) caughtError = err;
        });
        return { req, caughtError };
      };

      // 1. Initial state: organization is active, resolveTenant succeeds
      const initialResolve = await testResolveTenant();
      expect(initialResolve.caughtError).toBeNull();
      expect(initialResolve.req.tenant?.organizationId).toBe(orgId);

      // 2. Super Admin deactivates the organization
      const deactivated = await adminOrganizationService.updateStatus({
        targetOrgId: orgId,
        actingAdminId: superAdmin.id,
        input: { isActive: false, reason: 'Administrative suspension in PostgreSQL' },
        ipAddress: '127.0.0.1',
      });
      expect(deactivated.isActive).toBe(false);

      // Verify in PostgreSQL
      const orgInDb = await prisma.organization.findUnique({ where: { id: orgId } });
      expect(orgInDb?.isActive).toBe(false);

      // Verify audit log entry
      const auditDeactivated = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          action: 'admin.organization_deactivated',
        },
      });
      expect(auditDeactivated).toBeDefined();
      expect(auditDeactivated?.actorId).toBe(superAdmin.id);
      expect((auditDeactivated?.metadata as Record<string, unknown>)?.reason).toBe(
        'Administrative suspension in PostgreSQL',
      );
      createdAuditLogIds.push(auditDeactivated!.id);

      // 3. Crucial requirement: resolveTenant MUST reject requests for inactive organization with 403
      const blockedResolve = await testResolveTenant();
      expect(blockedResolve.caughtError).not.toBeNull();
      const err = blockedResolve.caughtError as { statusCode?: number; code?: string };
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('TENANT_REQUIRED');

      // 4. Super Admin reactivates the organization
      const reactivated = await adminOrganizationService.updateStatus({
        targetOrgId: orgId,
        actingAdminId: superAdmin.id,
        input: { isActive: true },
        ipAddress: '127.0.0.1',
      });
      expect(reactivated.isActive).toBe(true);

      const orgActiveInDb = await prisma.organization.findUnique({ where: { id: orgId } });
      expect(orgActiveInDb?.isActive).toBe(true);

      const auditReactivated = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          action: 'admin.organization_reactivated',
        },
      });
      expect(auditReactivated).toBeDefined();
      expect(auditReactivated?.actorId).toBe(superAdmin.id);
      createdAuditLogIds.push(auditReactivated!.id);

      // 5. Verify resolveTenant succeeds again after reactivation
      const unblockedResolve = await testResolveTenant();
      expect(unblockedResolve.caughtError).toBeNull();
      expect(unblockedResolve.req.tenant?.organizationId).toBe(orgId);
    });

    it('rolls back organization status update in PostgreSQL if audit log creation fails', async () => {
      const uniqueSuffix = `adm_org_fail_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_fail_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `tx_org_fail_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'TxFail',
          lastName: 'Org',
          organizationName: `TxFail Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      // Spy on auditService.record to simulate failure inside transaction
      const auditSpy = vi
        .spyOn(auditService, 'record')
        .mockRejectedValueOnce(new Error('Simulated audit persistence failure for organization'));

      try {
        await expect(
          adminOrganizationService.updateStatus({
            targetOrgId: orgId,
            actingAdminId: superAdmin.id,
            input: { isActive: false },
          }),
        ).rejects.toThrow('Simulated audit persistence failure for organization');

        // Verify organization remains active in PostgreSQL
        const orgInDb = await prisma.organization.findUnique({ where: { id: orgId } });
        expect(orgInDb?.isActive).toBe(true);
      } finally {
        auditSpy.mockRestore();
      }
    });

    it('idempotently returns existing organization status in PostgreSQL without creating duplicate audit log', async () => {
      const uniqueSuffix = `adm_org_idem_${Date.now()}`;

      const superAdmin = await prisma.user.create({
        data: {
          email: `super_idem_org_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_pw',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const reg = await authService.register(
        {
          email: `idem_org_${uniqueSuffix}@fioner.test`,
          password: 'Password123!',
          firstName: 'Idem',
          lastName: 'Org',
          organizationName: `Idem Org ${uniqueSuffix}`,
        },
        mockSession,
      );
      createdUserIds.push(reg.user.id);
      const orgId = reg.activeOrganizationId!;
      createdOrgIds.push(orgId);

      const auditCountBefore = await prisma.auditLog.count({
        where: { organizationId: orgId },
      });

      // Target organization is already active; requesting isActive: true is a no-op
      const result = await adminOrganizationService.updateStatus({
        targetOrgId: orgId,
        actingAdminId: superAdmin.id,
        input: { isActive: true },
      });

      expect(result.isActive).toBe(true);

      const auditCountAfter = await prisma.auditLog.count({
        where: { organizationId: orgId },
      });

      expect(auditCountAfter).toBe(auditCountBefore);
    });
  });

  // =========================================================================
  // Live Express HTTP Authentication Endpoints in PostgreSQL (Phase B)
  // =========================================================================
  describe('Live Express HTTP Authentication Endpoints in PostgreSQL (Phase B)', () => {
    describe('POST /api/v1/auth/register', () => {
      it('successfully registers user and organization via HTTP, returning 201 with auth envelope and verifying hashed password in PostgreSQL', async () => {
        const uniqueSuffix = `http_reg_${Date.now()}`;
        const email = `reg_${uniqueSuffix}@fioner.test`;
        const rawPassword = 'Password123!';

        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Aarav',
            lastName: 'Patel',
            email,
            password: rawPassword,
            organizationName: `Fleet Org ${uniqueSuffix}`,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(email);
        expect(res.body.data.user.firstName).toBe('Aarav');
        expect(res.body.data.user.lastName).toBe('Patel');
        expect(res.body.data.user.isSuperAdmin).toBe(false);
        expect(res.body.data.user).not.toHaveProperty('passwordHash');
        expect(res.body.data.organizations).toHaveLength(1);
        expect(res.body.data.organizations[0].role).toBe('OWNER');
        expect(res.body.data.tokens.accessToken).toBeDefined();
        expect(res.body.data.tokens.refreshToken).toBeDefined();

        const userId = res.body.data.user.id;
        const orgId = res.body.data.activeOrganizationId;
        createdUserIds.push(userId);
        createdOrgIds.push(orgId);

        // Verify in PostgreSQL: User exists and passwordHash is a valid bcrypt hash, never plaintext
        const userInDb = await prisma.user.findUnique({ where: { id: userId } });
        expect(userInDb).not.toBeNull();
        expect(userInDb?.email).toBe(email);
        expect(userInDb?.passwordHash).not.toBe(rawPassword);
        const passwordMatches = await verifyPassword(rawPassword, userInDb!.passwordHash);
        expect(passwordMatches).toBe(true);

        // Verify in PostgreSQL: Organization exists and is active
        const orgInDb = await prisma.organization.findUnique({ where: { id: orgId } });
        expect(orgInDb).not.toBeNull();
        expect(orgInDb?.isActive).toBe(true);

        // Verify in PostgreSQL: Active RefreshToken record exists
        const tokenHash = hashRefreshToken(res.body.data.tokens.refreshToken);
        const tokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash } });
        expect(tokenInDb).not.toBeNull();
        expect(tokenInDb?.userId).toBe(userId);
        expect(tokenInDb?.revokedAt).toBeNull();
      });

      it('rejects duplicate email via HTTP with 409 CONFLICT without leaving orphan records', async () => {
        const uniqueSuffix = `http_dup_${Date.now()}`;
        const email = `dup_${uniqueSuffix}@fioner.test`;

        const regPayload = {
          firstName: 'First',
          lastName: 'User',
          email,
          password: 'Password123!',
          organizationName: `Dup Org ${uniqueSuffix}`,
        };

        const firstRes = await request(app).post('/api/v1/auth/register').send(regPayload);
        expect(firstRes.status).toBe(201);
        createdUserIds.push(firstRes.body.data.user.id);
        createdOrgIds.push(firstRes.body.data.activeOrganizationId);

        const dupRes = await request(app).post('/api/v1/auth/register').send(regPayload);
        expect(dupRes.status).toBe(409);
        expect(dupRes.body.success).toBe(false);
        expect(dupRes.body.error.code).toBe('CONFLICT');
        expect(dupRes.body.error.message).toContain('already exists');

        const userCount = await prisma.user.count({ where: { email } });
        expect(userCount).toBe(1);
      });

      it('rejects invalid inputs and weak passwords via HTTP with 400 VALIDATION_ERROR', async () => {
        // Missing uppercase letter
        const resWeak = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Weak',
            lastName: 'Pass',
            email: 'weak@fioner.test',
            password: 'password123',
            organizationName: 'Weak Org',
          });
        expect(resWeak.status).toBe(400);
        expect(resWeak.body.success).toBe(false);
        expect(resWeak.body.error.code).toBe('VALIDATION_ERROR');

        // Missing required organizationName
        const resMissing = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Missing',
            lastName: 'Fields',
            email: 'missing@fioner.test',
            password: 'Password123!',
          });
        expect(resMissing.status).toBe(400);
        expect(resMissing.body.success).toBe(false);
        expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');

        // Confirm in PostgreSQL no user created
        const userInDb = await prisma.user.findUnique({ where: { email: 'weak@fioner.test' } });
        expect(userInDb).toBeNull();
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('successfully logs in via HTTP, returning 200 with tokens and updating lastLoginAt in PostgreSQL', async () => {
        const uniqueSuffix = `http_login_${Date.now()}`;
        const email = `login_${uniqueSuffix}@fioner.test`;
        const rawPassword = 'Password123!';

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Login',
            lastName: 'Tester',
            email,
            password: rawPassword,
            organizationName: `Login Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: rawPassword });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body.data.user.email).toBe(email);
        expect(loginRes.body.data.user).not.toHaveProperty('passwordHash');
        expect(loginRes.body.data.tokens.accessToken).toBeDefined();
        expect(loginRes.body.data.tokens.refreshToken).toBeDefined();

        // Verify in PostgreSQL: lastLoginAt was updated
        const userInDb = await prisma.user.findUnique({ where: { id: userId } });
        expect(userInDb?.lastLoginAt).not.toBeNull();

        // Verify in PostgreSQL: active refresh token persisted for this login session
        const loginTokenHash = hashRefreshToken(loginRes.body.data.tokens.refreshToken);
        const tokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash: loginTokenHash } });
        expect(tokenInDb).not.toBeNull();
        expect(tokenInDb?.revokedAt).toBeNull();
      });

      it('rejects incorrect password via HTTP with 401 INVALID_CREDENTIALS', async () => {
        const uniqueSuffix = `http_wrongpw_${Date.now()}`;
        const email = `wrongpw_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Wrong',
            lastName: 'Password',
            email,
            password: 'Password123!',
            organizationName: `WrongPw Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        createdUserIds.push(regRes.body.data.user.id);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'IncorrectPassword999!' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        expect(res.body.error.message).toBe('Invalid email or password');
      });

      it('rejects nonexistent email via HTTP with identical 401 INVALID_CREDENTIALS response', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent_account_xyz@fioner.test', password: 'Password123!' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        expect(res.body.error.message).toBe('Invalid email or password');
      });

      it('rejects login for deactivated account in PostgreSQL with 403 FORBIDDEN', async () => {
        const uniqueSuffix = `http_deact_${Date.now()}`;
        const email = `deact_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Deact',
            lastName: 'User',
            email,
            password: 'Password123!',
            organizationName: `Deact Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        // Deactivate in PostgreSQL
        await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'Password123!' });

        expect(loginRes.status).toBe(403);
        expect(loginRes.body.success).toBe(false);
        expect(loginRes.body.error.message).toContain('deactivated');
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('rotates refresh token via HTTP: revokes old token in PostgreSQL, links replacement, and issues new accessToken', async () => {
        const uniqueSuffix = `http_refresh_${Date.now()}`;
        const email = `refresh_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Ref',
            lastName: 'User',
            email,
            password: 'Password123!',
            organizationName: `Ref Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const initialRefreshToken = regRes.body.data.tokens.refreshToken;
        const initialTokenHash = hashRefreshToken(initialRefreshToken);

        // Perform rotation via HTTP
        const refreshRes = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: initialRefreshToken });

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.success).toBe(true);
        expect(refreshRes.body.data.tokens.accessToken).toBeDefined();
        expect(refreshRes.body.data.tokens.refreshToken).toBeDefined();

        const replacementRefreshToken = refreshRes.body.data.tokens.refreshToken;
        const replacementTokenHash = hashRefreshToken(replacementRefreshToken);

        // Verify in PostgreSQL: old token is revoked and linked to replacement
        const oldTokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash: initialTokenHash } });
        const newTokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash: replacementTokenHash } });

        expect(oldTokenInDb).not.toBeNull();
        expect(oldTokenInDb?.revokedAt).not.toBeNull();
        expect(oldTokenInDb?.replacedById).toBe(newTokenInDb?.id);

        expect(newTokenInDb).not.toBeNull();
        expect(newTokenInDb?.revokedAt).toBeNull();
      });

      it('detects replay attack via HTTP: reusing revoked token rejects with 401 and revokes all active sessions for user in PostgreSQL', async () => {
        const uniqueSuffix = `http_replay_${Date.now()}`;
        const email = `replay_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Replay',
            lastName: 'User',
            email,
            password: 'Password123!',
            organizationName: `Replay Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const token1 = regRes.body.data.tokens.refreshToken;

        // Legitimate rotation token1 -> token2
        const refreshRes1 = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: token1 });
        expect(refreshRes1.status).toBe(200);

        // Second session login creates token3
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'Password123!' });
        expect(loginRes.status).toBe(200);

        // Confirm in PostgreSQL: 2 active tokens exist before replay attack
        const activeBeforeCount = await prisma.refreshToken.count({
          where: { userId, revokedAt: null },
        });
        expect(activeBeforeCount).toBe(2);

        // Attacker replays old token1 via HTTP
        const replayRes = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: token1 });

        expect(replayRes.status).toBe(401);
        expect(replayRes.body.success).toBe(false);
        expect(replayRes.body.error.message).toContain('revoked');

        // Verify in PostgreSQL: ALL active tokens for this user are now revoked
        const activeAfterCount = await prisma.refreshToken.count({
          where: { userId, revokedAt: null },
        });
        expect(activeAfterCount).toBe(0);
      });

      it('rejects expired, malformed, or missing refresh tokens via HTTP', async () => {
        // Missing token
        const resMissing = await request(app).post('/api/v1/auth/refresh').send({});
        expect(resMissing.status).toBe(400);
        expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');

        // Malformed token
        const resMalformed = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid_malformed_token_xyz' });
        expect(resMalformed.status).toBe(401);
        expect(resMalformed.body.error.message).toContain('Invalid refresh token');
      });
    });

    describe('POST /api/v1/auth/logout and POST /api/v1/auth/logout-all', () => {
      it('successfully logs out via HTTP: revokes token in PostgreSQL and returns 204 No Content', async () => {
        const uniqueSuffix = `http_logout_${Date.now()}`;
        const email = `logout_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Logout',
            lastName: 'Single',
            email,
            password: 'Password123!',
            organizationName: `Logout Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        createdUserIds.push(regRes.body.data.user.id);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const rawToken = regRes.body.data.tokens.refreshToken;
        const tokenHash = hashRefreshToken(rawToken);

        const logoutRes = await request(app)
          .post('/api/v1/auth/logout')
          .send({ refreshToken: rawToken });

        expect(logoutRes.status).toBe(204);

        // Verify in PostgreSQL: token is marked revoked
        const tokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash } });
        expect(tokenInDb?.revokedAt).not.toBeNull();

        // Repeated logout with the same token is idempotent (204)
        const repeatRes = await request(app)
          .post('/api/v1/auth/logout')
          .send({ refreshToken: rawToken });
        expect(repeatRes.status).toBe(204);
      });

      it('does not revoke unrelated users sessions on logout', async () => {
        const uniqueSuffix = `http_isolate_${Date.now()}`;

        const regA = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'UserA',
            lastName: 'Test',
            email: `usera_${uniqueSuffix}@fioner.test`,
            password: 'Password123!',
            organizationName: `OrgA ${uniqueSuffix}`,
          });
        expect(regA.status).toBe(201);
        createdUserIds.push(regA.body.data.user.id);
        createdOrgIds.push(regA.body.data.activeOrganizationId);

        const regB = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'UserB',
            lastName: 'Test',
            email: `userb_${uniqueSuffix}@fioner.test`,
            password: 'Password123!',
            organizationName: `OrgB ${uniqueSuffix}`,
          });
        expect(regB.status).toBe(201);
        createdUserIds.push(regB.body.data.user.id);
        createdOrgIds.push(regB.body.data.activeOrganizationId);

        // User A logs out
        await request(app)
          .post('/api/v1/auth/logout')
          .send({ refreshToken: regA.body.data.tokens.refreshToken });

        // User B token in PostgreSQL must remain unrevoked
        const tokenBHash = hashRefreshToken(regB.body.data.tokens.refreshToken);
        const tokenBInDb = await prisma.refreshToken.findUnique({ where: { tokenHash: tokenBHash } });
        expect(tokenBInDb?.revokedAt).toBeNull();
      });

      it('POST /api/v1/auth/logout-all revokes all sessions for authenticated user in PostgreSQL', async () => {
        const uniqueSuffix = `http_logoutall_${Date.now()}`;
        const email = `logoutall_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Logout',
            lastName: 'All',
            email,
            password: 'Password123!',
            organizationName: `LogoutAll Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        const accessToken = regRes.body.data.tokens.accessToken;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        // Second login session
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'Password123!' });

        const countBefore = await prisma.refreshToken.count({ where: { userId, revokedAt: null } });
        expect(countBefore).toBe(2);

        // Authenticated logout-all via HTTP
        const res = await request(app)
          .post('/api/v1/auth/logout-all')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);

        // Verify in PostgreSQL: all tokens revoked
        const countAfter = await prisma.refreshToken.count({ where: { userId, revokedAt: null } });
        expect(countAfter).toBe(0);
      });
    });

    describe('Authenticated Routes (GET /api/v1/auth/me, POST /change-password)', () => {
      it('GET /api/v1/auth/me returns 200 with user profile and rejects unauthenticated requests with 401', async () => {
        const uniqueSuffix = `http_me_${Date.now()}`;
        const email = `me_${uniqueSuffix}@fioner.test`;

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Me',
            lastName: 'Profile',
            email,
            password: 'Password123!',
            organizationName: `Me Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        createdUserIds.push(regRes.body.data.user.id);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        const accessToken = regRes.body.data.tokens.accessToken;

        // Valid access token
        const meRes = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(meRes.status).toBe(200);
        expect(meRes.body.success).toBe(true);
        expect(meRes.body.data.user.email).toBe(email);
        expect(meRes.body.data.user).not.toHaveProperty('passwordHash');
        expect(meRes.body.data.organizations).toHaveLength(1);

        // Missing bearer token
        const unauthRes = await request(app).get('/api/v1/auth/me');
        expect(unauthRes.status).toBe(401);
        expect(unauthRes.body.error.code).toBe('UNAUTHENTICATED');
      });

      it('POST /api/v1/auth/change-password updates password, revokes all sessions, and records audit in PostgreSQL', async () => {
        const uniqueSuffix = `http_chgpass_${Date.now()}`;
        const email = `chgpass_${uniqueSuffix}@fioner.test`;
        const oldPassword = 'OldPassword123!';
        const newPassword = 'BrandNewPassword456!';

        const regRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Chg',
            lastName: 'Pass',
            email,
            password: oldPassword,
            organizationName: `Chg Org ${uniqueSuffix}`,
          });
        expect(regRes.status).toBe(201);
        const userId = regRes.body.data.user.id;
        const accessToken = regRes.body.data.tokens.accessToken;
        createdUserIds.push(userId);
        createdOrgIds.push(regRes.body.data.activeOrganizationId);

        // Change password via HTTP
        const chgRes = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ currentPassword: oldPassword, newPassword });

        expect(chgRes.status).toBe(204);

        // Verify in PostgreSQL: user passwordHash updated
        const userInDb = await prisma.user.findUnique({ where: { id: userId } });
        const oldMatches = await verifyPassword(oldPassword, userInDb!.passwordHash);
        const newMatches = await verifyPassword(newPassword, userInDb!.passwordHash);
        expect(oldMatches).toBe(false);
        expect(newMatches).toBe(true);

        // Verify in PostgreSQL: all sessions revoked
        const activeTokens = await prisma.refreshToken.count({ where: { userId, revokedAt: null } });
        expect(activeTokens).toBe(0);

        // Verify in PostgreSQL: audit log recorded
        const auditLog = await prisma.auditLog.findFirst({
          where: { action: 'auth.password_changed', entityId: userId },
        });
        expect(auditLog).not.toBeNull();
        createdAuditLogIds.push(auditLog!.id);

        // Verify old password fails login, new password succeeds login
        const loginOld = await request(app).post('/api/v1/auth/login').send({ email, password: oldPassword });
        expect(loginOld.status).toBe(401);

        const loginNew = await request(app).post('/api/v1/auth/login').send({ email, password: newPassword });
        expect(loginNew.status).toBe(200);
      });
    });
  });

  // =========================================================================
  // 10. Super Admin Audit Logs API in PostgreSQL (GET /api/v1/admin/audit-logs)
  // =========================================================================
  describe('Super Admin Audit Logs API in PostgreSQL (GET /api/v1/admin/audit-logs)', () => {
    let superAdminToken: string;
    let superAdminId: string;
    let regularUserToken: string;
    let deactivatedSuperAdminToken: string;
    let logDeactivateId: string;
    let logOrgUpdateId: string;
    let testOrgId: string;

    beforeAll(async () => {
      const uniqueSuffix = `audit_api_${Date.now()}`;

      // 1. Create active Super Admin
      const superAdmin = await prisma.user.create({
        data: {
          email: `super_audit_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Super',
          lastName: 'Auditor',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      superAdminId = superAdmin.id;
      createdUserIds.push(superAdmin.id);

      const { signAccessToken } = await import('../src/common/utils/jwt');
      superAdminToken = signAccessToken({
        sub: superAdmin.id,
        email: superAdmin.email,
        isSuperAdmin: true,
      });

      // 2. Create regular user
      const regularUser = await prisma.user.create({
        data: {
          email: `regular_audit_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Regular',
          lastName: 'User',
          isActive: true,
          isSuperAdmin: false,
        },
      });
      createdUserIds.push(regularUser.id);
      regularUserToken = signAccessToken({
        sub: regularUser.id,
        email: regularUser.email,
        isSuperAdmin: false,
      });

      // 3. Create deactivated Super Admin
      const deactAdmin = await prisma.user.create({
        data: {
          email: `deact_admin_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Deact',
          lastName: 'Admin',
          isActive: false,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(deactAdmin.id);
      deactivatedSuperAdminToken = signAccessToken({
        sub: deactAdmin.id,
        email: deactAdmin.email,
        isSuperAdmin: true,
      });

      // 4. Create an organization
      const org = await prisma.organization.create({
        data: {
          name: `Audit Test Org ${uniqueSuffix}`,
          slug: `audit-org-${uniqueSuffix}`,
          isActive: true,
        },
      });
      testOrgId = org.id;
      createdOrgIds.push(org.id);

      // 5. Seed audit logs with foreign keys and metadata
      const entry1 = await auditService.record({
        action: 'admin.user_deactivated',
        entity: 'User',
        entityId: regularUser.id,
        actorId: superAdmin.id,
        metadata: { reason: 'Policy violation', tempSecret: 'should_be_stripped' },
        ipAddress: '127.0.0.1',
      });
      logDeactivateId = entry1.id;
      createdAuditLogIds.push(entry1.id);

      const entry2 = await auditService.record({
        organizationId: org.id,
        action: 'org.updated',
        entity: 'Organization',
        entityId: org.id,
        actorId: superAdmin.id,
        metadata: { field: 'name' },
        ipAddress: '10.0.0.1',
      });
      logOrgUpdateId = entry2.id;
      createdAuditLogIds.push(entry2.id);

      const entry3 = await auditService.record({
        organizationId: org.id,
        action: 'lead.created',
        entity: 'Lead',
        entityId: `lead_${uniqueSuffix}`,
        actorId: regularUser.id,
        metadata: { score: 95 },
        ipAddress: '192.168.1.50',
      });
      createdAuditLogIds.push(entry3.id);
    });

    it('GET /api/v1/admin/audit-logs returns 200 with platform-wide audit logs and safe projections', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta?.pagination).toBeDefined();
      expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(3);

      interface AuditLogResponseItem {
        id: string;
        action: string;
        entity: string;
        actor?: { id: string; email: string; passwordHash?: string };
        organization?: { id: string; name: string };
        metadata?: Record<string, unknown>;
      }

      const foundDeact = res.body.data.find((item: AuditLogResponseItem) => item.id === logDeactivateId);
      expect(foundDeact).toBeDefined();
      expect(foundDeact.action).toBe('admin.user_deactivated');
      expect(foundDeact.entity).toBe('User');
      expect(foundDeact.actor.id).toBe(superAdminId);
      expect(foundDeact.actor.email).toContain('@fioner.test');
      expect(foundDeact.actor).not.toHaveProperty('passwordHash');
      expect(foundDeact.metadata).not.toHaveProperty('tempSecret');

      const foundOrgUpdate = res.body.data.find((item: AuditLogResponseItem) => item.id === logOrgUpdateId);
      expect(foundOrgUpdate).toBeDefined();
      expect(foundOrgUpdate.organization.id).toBe(testOrgId);
      expect(foundOrgUpdate.organization.name).toContain('Audit Test Org');
    });

    it('filters audit logs by action accurately', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?action=admin.user_deactivated')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data;
      expect(items.length).toBeGreaterThanOrEqual(1);
      for (const item of items) {
        expect(item.action).toBe('admin.user_deactivated');
      }
    });

    it('filters audit logs by entity and organizationId accurately', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/audit-logs?entity=Organization&organizationId=${testOrgId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data;
      expect(items.length).toBeGreaterThanOrEqual(1);
      for (const item of items) {
        expect(item.entity).toBe('Organization');
        expect(item.organizationId).toBe(testOrgId);
      }
    });

    it('filters audit logs by date range accurately', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .get(`/api/v1/admin/audit-logs?startDate=${futureDate}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.pagination.total).toBe(0);
    });

    it('paginates deterministically with proper pagination metadata', async () => {
      interface AuditItem { id: string }
      const resPage1 = await request(app)
        .get('/api/v1/admin/audit-logs?page=1&limit=2')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data).toHaveLength(2);
      expect(resPage1.body.meta.pagination.page).toBe(1);
      expect(resPage1.body.meta.pagination.limit).toBe(2);
      expect(resPage1.body.meta.pagination.hasNextPage).toBe(true);

      const resPage2 = await request(app)
        .get('/api/v1/admin/audit-logs?page=2&limit=2')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data).toHaveLength(2);
      expect(resPage2.body.meta.pagination.page).toBe(2);
      expect(resPage2.body.meta.pagination.hasPreviousPage).toBe(true);

      // Verify no overlap between page 1 and page 2
      const idsPage1 = resPage1.body.data.map((d: AuditItem) => d.id);
      const idsPage2 = resPage2.body.data.map((d: AuditItem) => d.id);
      for (const id of idsPage1) {
        expect(idsPage2).not.toContain(id);
      }
    });

    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/audit-logs');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects ordinary authenticated non-Super-Admin users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects deactivated Super Admin users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${deactivatedSuperAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('is strictly read-only and does not mutate audit log table in PostgreSQL', async () => {
      const countBefore = await prisma.auditLog.count();

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);

      const countAfter = await prisma.auditLog.count();
      expect(countAfter).toBe(countBefore);
    });
  });

  // =========================================================================
  // 11. Super Admin Dashboard Endpoints in PostgreSQL (/api/v1/admin/dashboard/*)
  // =========================================================================
  describe('Super Admin Dashboard Endpoints in PostgreSQL (/api/v1/admin/dashboard/*)', () => {
    let superAdminToken: string;
    let regularUserToken: string;
    let regularUserId: string;
    let regularUserEmail: string;
    let deactivatedSuperAdminToken: string;

    beforeAll(async () => {
      const uniqueSuffix = `dash_int_${Date.now()}`;

      // 1. Create active Super Admin
      const superAdmin = await prisma.user.create({
        data: {
          email: `super_dash_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Super',
          lastName: 'Dash',
          isActive: true,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(superAdmin.id);

      const { signAccessToken } = await import('../src/common/utils/jwt');
      superAdminToken = signAccessToken({
        sub: superAdmin.id,
        email: superAdmin.email,
        isSuperAdmin: true,
      });

      // 2. Create regular user
      const regularUser = await prisma.user.create({
        data: {
          email: `regular_dash_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Regular',
          lastName: 'Dash',
          isActive: true,
          isSuperAdmin: false,
        },
      });
      createdUserIds.push(regularUser.id);
      regularUserId = regularUser.id;
      regularUserEmail = regularUser.email;
      regularUserToken = signAccessToken({
        sub: regularUser.id,
        email: regularUser.email,
        isSuperAdmin: false,
      });

      // 3. Create deactivated Super Admin
      const deactAdmin = await prisma.user.create({
        data: {
          email: `deact_dash_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Deact',
          lastName: 'Dash',
          isActive: false,
          isSuperAdmin: true,
        },
      });
      createdUserIds.push(deactAdmin.id);
      deactivatedSuperAdminToken = signAccessToken({
        sub: deactAdmin.id,
        email: deactAdmin.email,
        isSuperAdmin: true,
      });

      // 4. Create an inactive organization to trigger an alert
      const inactOrg = await prisma.organization.create({
        data: {
          name: `Inactive Alert Org ${uniqueSuffix}`,
          slug: `inactive-org-${uniqueSuffix}`,
          isActive: false,
        },
      });
      createdOrgIds.push(inactOrg.id);
    });

    it('GET /api/v1/admin/dashboard returns 200 with aggregated platform metrics in PostgreSQL', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { metrics, dateRange, unimplementedDomains } = res.body.data;
      expect(dateRange.start).toBeDefined();
      expect(dateRange.end).toBeDefined();

      // Assert live database aggregation
      expect(metrics.users.total).toBeGreaterThanOrEqual(1);
      expect(metrics.users.active).toBeGreaterThanOrEqual(1);
      expect(metrics.users.superAdmins).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.users.growthRate).toBe('number');

      expect(metrics.organizations.total).toBeGreaterThanOrEqual(1);
      expect(metrics.memberships.total).toBeGreaterThanOrEqual(0);
      expect(metrics.crm.wonDealValue).toBeGreaterThanOrEqual(0);
      expect(metrics.crm).not.toHaveProperty('wonRevenue');
      expect(metrics.audit.totalLogs).toBeGreaterThanOrEqual(1);

      expect(metrics.sos).toBeDefined();

      // Verify live vehicle, QR, order metrics and built domains notice
      expect(metrics.vehicles).toBeDefined();
      expect(metrics.vehicles.total).toBeGreaterThanOrEqual(0);
      expect(metrics.qrCodes).toBeDefined();
      expect(metrics.qrCodes.total).toBeGreaterThanOrEqual(0);
      expect(metrics.activeQrCodes).toBeGreaterThanOrEqual(0);
      expect(metrics.orders).toBeDefined();
      expect(metrics.orders.total).toBeGreaterThanOrEqual(0);
      expect(metrics.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(unimplementedDomains.vehicles).toBeUndefined();
      expect(unimplementedDomains.qrCodes.status).toBe('BUILT');
      expect(unimplementedDomains.orders.status).toBe('BUILT');
      expect(unimplementedDomains.sosIncidents).toBeUndefined();
    });

    it('GET /api/v1/admin/dashboard/executive returns identical executive overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/executive?period=last7days')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe('last7days');
      expect(res.body.data.metrics.users.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/dashboard/alerts returns live alerts including inactive orgs and users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { alerts, counts } = res.body.data;
      expect(Array.isArray(alerts)).toBe(true);
      expect(counts.total).toBeGreaterThanOrEqual(1);
      expect(counts.filtered).toBe(counts.total);
      expect(counts.bySeverity).toBeDefined();

      interface AlertIntItem {
        id: string;
        type: string;
        severity: string;
        title: string;
      }

      const foundOrgAlert = alerts.find((a: AlertIntItem) => a.type === 'ORGANIZATION_DEACTIVATED');
      expect(foundOrgAlert).toBeDefined();
      expect(foundOrgAlert.severity).toBe('warning');
    });

    it('GET /api/v1/admin/dashboard/system-health executes database ping and reports healthy', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.services.database.status).toBe('connected');
      expect(res.body.data.services.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.data.services.server.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.integrations)).toBe(true);

      interface IntegrationIntItem {
        id: string;
        status: string;
        configured: boolean;
        verifiedLive: boolean;
      }

      const dbInt = res.body.data.integrations.find((i: IntegrationIntItem) => i.id === 'database');
      expect(dbInt).toBeDefined();
      expect(dbInt.configured).toBe(true);
      expect(dbInt.verifiedLive).toBe(true);
      expect(dbInt.status).toBe('connected');

      const redisInt = res.body.data.integrations.find((i: IntegrationIntItem) => i.id === 'redis');
      expect(redisInt).toBeDefined();
      expect(redisInt.configured).toBe(false);
      expect(redisInt.verifiedLive).toBe(false);
      expect(redisInt.status).toBe('pending_configuration');
    });

    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects regular non-Super-Admin authenticated users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects deactivated Super Admin users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${deactivatedSuperAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('is strictly read-only and causes zero mutations to database counts', async () => {
      const [usersBefore, orgsBefore, auditBefore] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.auditLog.count(),
      ]);

      await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      await request(app)
        .get('/api/v1/admin/dashboard/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      await request(app)
        .get('/api/v1/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const [usersAfter, orgsAfter, auditAfter] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.auditLog.count(),
      ]);

      expect(usersAfter).toBe(usersBefore);
      expect(orgsAfter).toBe(orgsBefore);
      expect(auditAfter).toBe(auditBefore);
    });

    it('GET /api/v1/admin/users/:id returns Customer 360 data in PostgreSQL without leaking sensitive fields', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(regularUserId);
      expect(res.body.data.email).toBe(regularUserEmail);
      expect(res.body.data.vehicles).toBeInstanceOf(Array);
      expect(res.body.data.orders).toBeInstanceOf(Array);
      expect(res.body.data.subscriptions).toBeInstanceOf(Array);
      expect(res.body.data.activity).toBeInstanceOf(Array);
      expect(res.body.data.supportDesk.status).toBe('UNAVAILABLE');
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).not.toHaveProperty('tokens');
    });

    it('GET /api/v1/admin/users/:id returns 404 for non-existent user in PostgreSQL', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users/nonexistent_cuid_test')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 12. SOS & Incident Response in PostgreSQL (/api/v1/sos/* & /api/v1/admin/sos/*)
  // =========================================================================
  describe('SOS & Incident Response in PostgreSQL (/api/v1/sos/* & /api/v1/admin/sos/*)', () => {
    let superAdminToken: string;
    let customerUserToken: string;
    let customerUser: { id: string; email: string };

    beforeAll(async () => {
      const uniqueSuffix = `sos_int_${Date.now()}`;

      // 1. Create Super Admin fixture
      const superAdmin = await prisma.user.create({
        data: {
          email: `${uniqueSuffix}_admin@fioner.test`,
          passwordHash: 'hashed_pw_sos_admin',
          firstName: 'Super',
          lastName: 'Admin',
          isSuperAdmin: true,
          isActive: true,
        },
      });
      createdUserIds.push(superAdmin.id);
      superAdminToken = signAccessToken({
        sub: superAdmin.id,
        email: superAdmin.email,
        isSuperAdmin: true,
      });

      // 2. Create customer User fixture
      const customer = await prisma.user.create({
        data: {
          email: `${uniqueSuffix}_customer@fioner.test`,
          passwordHash: 'hashed_pw_sos_cust',
          firstName: 'Driver',
          lastName: 'Customer',
          isSuperAdmin: false,
          isActive: true,
        },
      });
      createdUserIds.push(customer.id);
      customerUser = { id: customer.id, email: customer.email };
      customerUserToken = signAccessToken({
        sub: customer.id,
        email: customer.email,
        isSuperAdmin: false,
      });
    });

    it('creates emergency contacts in PostgreSQL and enforces max 5 contacts limit', async () => {
      // Create contact 1
      const res1 = await request(app)
        .post('/api/v1/sos/contacts')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({
          name: 'Contact One',
          phone: '+919876500001',
          relationship: 'SPOUSE',
          isPrimary: true,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      createdSosContactIds.push(res1.body.data.id);

      // Verify contact persisted in PostgreSQL
      const persistedContact = await prisma.sosContact.findUnique({
        where: { id: res1.body.data.id },
      });
      expect(persistedContact).not.toBeNull();
      expect(persistedContact?.name).toBe('Contact One');
      expect(persistedContact?.isPrimary).toBe(true);

      // Create contacts 2, 3, 4, 5
      for (let i = 2; i <= 5; i++) {
        const res = await request(app)
          .post('/api/v1/sos/contacts')
          .set('Authorization', `Bearer ${customerUserToken}`)
          .send({
            name: `Contact ${i}`,
            phone: `+91987650000${i}`,
            relationship: 'FAMILY',
          });
        expect(res.status).toBe(201);
        createdSosContactIds.push(res.body.data.id);
      }

      // 6th contact must be rejected with 400
      const res6 = await request(app)
        .post('/api/v1/sos/contacts')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({
          name: 'Contact Six',
          phone: '+919876500006',
          relationship: 'FRIEND',
        });

      expect(res6.status).toBe(400);
      expect(res6.body.success).toBe(false);
    });

    it('triggers SOS emergency, copies contacts, persists timeline and atomic audit log in PostgreSQL', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
          vehicleReg: 'KA01XY9999',
          address: 'MG Road, Bangalore',
          notes: 'Emergency vehicle assistance needed',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const eventId = res.body.data.id;
      createdSosEventIds.push(eventId);

      // Verify PostgreSQL persistence
      const dbEvent = await prisma.sosEvent.findUnique({
        where: { id: eventId },
        include: {
          contactsNotified: true,
          timeline: true,
        },
      });

      expect(dbEvent).not.toBeNull();
      expect(dbEvent?.userId).toBe(customerUser.id);
      expect(dbEvent?.lat).toBe(12.9716);
      expect(dbEvent?.lng).toBe(77.5946);
      expect(dbEvent?.status).toBe('PENDING');
      expect(dbEvent?.contactsNotified.length).toBe(5);
      expect(dbEvent?.contactsNotified[0]?.isNotified).toBe(false);
      expect(dbEvent?.contactsNotified[0]?.notifiedAt).toBeNull();
      expect(dbEvent?.timeline.length).toBeGreaterThanOrEqual(2);

      // Verify audit log persisted in PostgreSQL
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'sos.triggered',
          entity: 'SosEvent',
          entityId: eventId,
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(customerUser.id);
      createdAuditLogIds.push(auditLog!.id);
    });

    it('concurrent competing triggers from same user create exactly one active incident and return predictably', async () => {
      const uniqueSuffix = `race_${Date.now()}`;
      const raceUser = await prisma.user.create({
        data: {
          email: `race_${uniqueSuffix}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Race',
          lastName: 'Tester',
          isActive: true,
          isSuperAdmin: false,
        },
      });
      createdUserIds.push(raceUser.id);
      const raceToken = signAccessToken({
        sub: raceUser.id,
        email: raceUser.email,
        isSuperAdmin: false,
      });

      // Fire 2 competing requests concurrently
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/v1/sos/trigger')
          .set('Authorization', `Bearer ${raceToken}`)
          .send({
            lat: 12.9716,
            lng: 77.5946,
            vehicleReg: 'KA02RACE1',
          }),
        request(app)
          .post('/api/v1/sos/trigger')
          .set('Authorization', `Bearer ${raceToken}`)
          .send({
            lat: 12.9716,
            lng: 77.5946,
            vehicleReg: 'KA02RACE2',
          }),
      ]);

      expect([200, 201]).toContain(resA.status);
      expect([200, 201]).toContain(resB.status);
      expect(resA.body.success).toBe(true);
      expect(resB.body.success).toBe(true);

      // Both must resolve to the identical incident ID
      expect(resA.body.data.id).toBe(resB.body.data.id);
      createdSosEventIds.push(resA.body.data.id);

      // Verify PostgreSQL partial unique index guarantee: exactly 1 active incident exists
      const activeIncidents = await prisma.sosEvent.findMany({
        where: {
          userId: raceUser.id,
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'ESCALATED'] },
        },
      });
      expect(activeIncidents.length).toBe(1);
    });

    it('returns existing active incident idempotently on repeat trigger without creating duplicate records', async () => {
      const countBefore = await prisma.sosEvent.count({ where: { userId: customerUser.id } });

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alreadyActive).toBe(true);

      const countAfter = await prisma.sosEvent.count({ where: { userId: customerUser.id } });
      expect(countAfter).toBe(countBefore);
    });

    it('re-notification request does not falsify provider dispatch when provider is unconfigured', async () => {
      const activeEventId = createdSosEventIds[0];
      const dbEvent = await prisma.sosEvent.findUnique({
        where: { id: activeEventId },
        include: { contactsNotified: true },
      });
      const firstContact = dbEvent?.contactsNotified[0];
      expect(firstContact).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/admin/sos/${activeEventId}/contacts/${firstContact!.id}/notify-again`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contactsNotified[0].deliveryStatus).toBe('UNCONFIGURED_PROVIDER');

      // Verify audit log recorded with truthful requested action
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.sos_renotification_requested',
          entityId: firstContact!.id,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);

      // Verify contact record was not falsely modified to isNotified: true
      const contactInDb = await prisma.sosEventContact.findUnique({
        where: { id: firstContact!.id },
      });
      expect(contactInDb?.isNotified).toBe(false);
    });

    it('Super Admin acknowledges incident: persists ACKNOWLEDGED status, timeline and audit log', async () => {
      const activeEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/admin/sos/${activeEventId}/acknowledge`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACKNOWLEDGED');

      // Verify in DB
      const dbEvent = await prisma.sosEvent.findUnique({ where: { id: activeEventId } });
      expect(dbEvent?.status).toBe('ACKNOWLEDGED');

      // Verify audit
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.sos_acknowledged',
          entityId: activeEventId,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);
    });

    it('Super Admin escalates incident: persists ESCALATED status, timeline and audit log', async () => {
      const activeEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/admin/sos/${activeEventId}/escalate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'Dispatched emergency services' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ESCALATED');

      const dbEvent = await prisma.sosEvent.findUnique({ where: { id: activeEventId } });
      expect(dbEvent?.status).toBe('ESCALATED');

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.sos_escalated',
          entityId: activeEventId,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);
    });

    it('rejects transitioning ESCALATED incident back to ACKNOWLEDGED with 400', async () => {
      const activeEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/admin/sos/${activeEventId}/acknowledge`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot transition an escalated incident to acknowledged');
    });

    it('customer cannot cancel an ESCALATED incident with 400', async () => {
      const activeEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/sos/${activeEventId}/cancel`)
        .set('Authorization', `Bearer ${customerUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot cancel an escalated SOS emergency');
    });

    it('another customer cannot access or cancel someone elses incident (returns 404)', async () => {
      const activeEventId = createdSosEventIds[0];
      const otherUser = await prisma.user.create({
        data: {
          email: `other_${Date.now()}@fioner.test`,
          passwordHash: 'hashed_password',
          firstName: 'Other',
          lastName: 'Customer',
          isActive: true,
          isSuperAdmin: false,
        },
      });
      createdUserIds.push(otherUser.id);
      const otherToken = signAccessToken({
        sub: otherUser.id,
        email: otherUser.email,
        isSuperAdmin: false,
      });

      const res = await request(app)
        .post(`/api/v1/sos/${activeEventId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Super Admin resolves incident: persists RESOLVED status, resolvedAt, and audit log', async () => {
      const activeEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/admin/sos/${activeEventId}/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'All clear, user is safe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');

      const dbEvent = await prisma.sosEvent.findUnique({ where: { id: activeEventId } });
      expect(dbEvent?.status).toBe('RESOLVED');
      expect(dbEvent?.resolvedAt).not.toBeNull();

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'admin.sos_resolved',
          entityId: activeEventId,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);
    });

    it('enforces terminal state: rejects transitioning resolved incident back to acknowledged', async () => {
      const resolvedEventId = createdSosEventIds[0];

      const res = await request(app)
        .post(`/api/v1/admin/sos/${resolvedEventId}/acknowledge`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('reflects live SOS counts in Super Admin Dashboard executive overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.sos).toBeDefined();
      expect(res.body.data.metrics.sos.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.metrics.sos.resolved).toBeGreaterThanOrEqual(1);
      expect(res.body.data.unimplementedDomains.sosIncidents).toBeUndefined();
    });
  });

  // =========================================================================
  // 13. Vehicle Administration in PostgreSQL (/api/v1/vehicles & /api/v1/admin/vehicles)
  // =========================================================================
  describe('Vehicle Administration in PostgreSQL (/api/v1/vehicles & /api/v1/admin/vehicles)', () => {
    let superAdminToken: string;
    let customerAUser: { id: string; email: string };
    let customerAToken: string;
    let customerBToken: string;
    let vehicleAId: string;
    let vehicleBId: string;

    beforeAll(async () => {
      const uniqueSuffix = `veh_int_${Date.now()}`;

      // 1. Create Super Admin fixture
      const superAdmin = await prisma.user.create({
        data: {
          email: `${uniqueSuffix}_admin@fioner.test`,
          passwordHash: 'hashed_pw_veh_admin',
          firstName: 'Super',
          lastName: 'Admin',
          isSuperAdmin: true,
          isActive: true,
        },
      });
      createdUserIds.push(superAdmin.id);
      superAdminToken = signAccessToken({
        sub: superAdmin.id,
        email: superAdmin.email,
        isSuperAdmin: true,
      });

      // 2. Create customer A fixture
      const userA = await prisma.user.create({
        data: {
          email: `${uniqueSuffix}_cust_a@fioner.test`,
          passwordHash: 'hashed_pw_veh_a',
          firstName: 'Alice',
          lastName: 'Driver',
          isSuperAdmin: false,
          isActive: true,
        },
      });
      createdUserIds.push(userA.id);
      customerAUser = { id: userA.id, email: userA.email };
      customerAToken = signAccessToken({
        sub: userA.id,
        email: userA.email,
        isSuperAdmin: false,
      });

      // 3. Create customer B fixture
      const userB = await prisma.user.create({
        data: {
          email: `${uniqueSuffix}_cust_b@fioner.test`,
          passwordHash: 'hashed_pw_veh_b',
          firstName: 'Bob',
          lastName: 'Rider',
          isSuperAdmin: false,
          isActive: true,
        },
      });
      createdUserIds.push(userB.id);
      customerBToken = signAccessToken({
        sub: userB.id,
        email: userB.email,
        isSuperAdmin: false,
      });
    });

    it('Customer creates a vehicle: normalizes registration, persists documents and atomic audit log', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 86400000).toISOString();
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          reg: '  ka01ab1234  ',
          model: 'Honda City ZX',
          fuel: 'PETROL',
          mileage: 18.5,
          isDefault: true,
          documents: [
            {
              type: 'RC',
              documentNumber: 'RC-12345',
              expiryDate: futureExpiry,
            },
            {
              type: 'INSURANCE',
              documentNumber: 'POL-67890',
              expiryDate: futureExpiry,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reg).toBe('KA01AB1234');
      expect(res.body.data.model).toBe('Honda City ZX');
      expect(res.body.data.fuel).toBe('PETROL');
      expect(res.body.data.mileage).toBe(18.5);
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.reminderStatus).toBe('UP_TO_DATE');
      expect(res.body.data.documents).toHaveLength(2);

      vehicleAId = res.body.data.id;
      createdVehicleIds.push(vehicleAId);

      // Verify PostgreSQL persistence
      const dbVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleAId },
        include: { documents: true },
      });
      expect(dbVehicle).not.toBeNull();
      expect(dbVehicle?.userId).toBe(customerAUser.id);
      expect(dbVehicle?.reg).toBe('KA01AB1234');
      expect(dbVehicle?.documents).toHaveLength(2);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'vehicle.created',
          entity: 'Vehicle',
          entityId: vehicleAId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(customerAUser.id);
      createdAuditLogIds.push(audit!.id);
    });

    it('Customer creates a second vehicle with isDefault=true: clears isDefault from previous vehicle', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          reg: 'KA02CD5678',
          model: 'Tata Nexon EV',
          fuel: 'ELECTRIC',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDefault).toBe(true);
      vehicleBId = res.body.data.id;
      createdVehicleIds.push(vehicleBId);

      // Check first vehicle is now isDefault: false
      const prevVeh = await prisma.vehicle.findUnique({ where: { id: vehicleAId } });
      expect(prevVeh?.isDefault).toBe(false);
    });

    it('Customer lists owned vehicles: strictly scoped to userId and includes reminders', async () => {
      const res = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      for (const veh of res.body.data) {
        expect([vehicleAId, vehicleBId]).toContain(veh.id);
        expect(veh.reminderStatus).toBeDefined();
      }
    });

    it('Customer retrieves a single owned vehicle by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(vehicleAId);
      expect(res.body.data.reg).toBe('KA01AB1234');
      expect(res.body.data.documents).toHaveLength(2);
    });

    it('Customer updates vehicle: normalizes reg, patches fields, enforces uniqueness, and records audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          reg: '  ka01ab1234  ',
          model: 'Honda City ZX 2024',
          mileage: 19.2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reg).toBe('KA01AB1234');
      expect(res.body.data.model).toBe('Honda City ZX 2024');
      expect(res.body.data.mileage).toBe(19.2);

      // Verify updating reg to another vehicle owned by same user triggers 409 CONFLICT
      const conflictRes = await request(app)
        .patch(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          reg: 'KA02CD5678', // already owned by customerA (vehicleBId)
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe('CONFLICT');

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'vehicle.updated',
          entity: 'Vehicle',
          entityId: vehicleAId,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);
    });

    it('Ownership isolation: Customer B cannot retrieve or modify Customer A vehicle (returns 404)', async () => {
      const getRes = await request(app)
        .get(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.success).toBe(false);

      const patchRes = await request(app)
        .patch(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ model: 'Hacked Model' });

      expect(patchRes.status).toBe(404);
      expect(patchRes.body.success).toBe(false);

      const deleteRes = await request(app)
        .delete(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body.success).toBe(false);
    });

    it('Per-owner registration uniqueness: Customer A cannot add duplicate reg, but Customer B can register same reg', async () => {
      // Customer A duplicate reg
      const dupRes = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          reg: 'KA01AB1234',
          model: 'Another Honda',
          fuel: 'PETROL',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.error.code).toBe('CONFLICT');

      // Customer B with same reg is permitted (per-owner uniqueness)
      const bRes = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          reg: 'KA01AB1234',
          model: 'Shared Fleet Honda',
          fuel: 'PETROL',
        });

      expect(bRes.status).toBe(201);
      expect(bRes.body.success).toBe(true);
      expect(bRes.body.data.reg).toBe('KA01AB1234');
      createdVehicleIds.push(bRes.body.data.id);
    });

    it('Super Admin directory: lists all vehicles across users with pagination, search, and fuel filter without tenant context', async () => {
      // 1. List all
      const listRes = await request(app)
        .get('/api/v1/admin/vehicles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(3);
      expect(listRes.body.meta.pagination.total).toBeGreaterThanOrEqual(3);

      // 2. Fuel filter
      const fuelRes = await request(app)
        .get('/api/v1/admin/vehicles?fuel=ELECTRIC')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(fuelRes.status).toBe(200);
      for (const veh of fuelRes.body.data) {
        expect(veh.fuelType).toBe('ELECTRIC');
      }

      // 3. Search by registration
      const searchRes = await request(app)
        .get('/api/v1/admin/vehicles?search=KA02CD5678')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(searchRes.body.data[0].reg).toBe('KA02CD5678');
    });

    it('Super Admin detail: returns vehicle detail, owner identity, truthful QR/GPS state, and audit timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(vehicleAId);
      expect(res.body.data.reg).toBe('KA01AB1234');
      expect(res.body.data.owner.id).toBe(customerAUser.id);
      expect(res.body.data.owner.email).toBe(customerAUser.email);
      expect(res.body.data.owner).not.toHaveProperty('passwordHash');
      expect(res.body.data.ownerName).toBe('Alice Driver');

      // Truthful QR / GPS projection
      expect(res.body.data.links.qr).toEqual({
        linked: false,
        code: null,
        status: null,
        domainStatus: 'NOT_YET_BUILT',
      });
      expect(res.body.data.links.gps).toEqual({
        linked: false,
        imei: null,
        status: null,
        domainStatus: 'NOT_YET_BUILT',
      });

      // Documents
      expect(res.body.data.documents).toBeDefined();
      expect(res.body.data.documents.length).toBeGreaterThanOrEqual(1);

      // Audit activity
      expect(res.body.data.activity).toBeDefined();
      expect(Array.isArray(res.body.data.activity)).toBe(true);
    });

    it('Reflects live vehicle metric in Super Admin Dashboard executive overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.vehicles).toBeDefined();
      expect(res.body.data.metrics.vehicles.total).toBeGreaterThanOrEqual(3);
      expect(res.body.data.unimplementedDomains.vehicles).toBeUndefined();
    });

    it('Customer deletes vehicle: cascades documents and records vehicle.deleted audit log', async () => {
      const res = await request(app)
        .delete(`/api/v1/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(204);

      // Verify deletion from DB
      const dbVehicle = await prisma.vehicle.findUnique({ where: { id: vehicleAId } });
      expect(dbVehicle).toBeNull();

      // Verify documents cascaded
      const docs = await prisma.vehicleDocument.findMany({ where: { vehicleId: vehicleAId } });
      expect(docs).toHaveLength(0);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'vehicle.deleted',
          entity: 'Vehicle',
          entityId: vehicleAId,
        },
      });
      expect(audit).not.toBeNull();
      createdAuditLogIds.push(audit!.id);
    });
  });

  // =========================================================================
  // 17. QR Code Management Integration Suite (fioner_test)
  // =========================================================================
  describe('QR Code Management Domain (Real PostgreSQL Suite)', () => {
    let superAdminUser: { id: string; email: string };
    let superAdminToken: string;
    let testCustomer: { id: string; email: string };
    let testVehicle: { id: string; reg: string };
    const qrTestBatch = `BATCH_INT_${Date.now()}`;
    let generatedQrId: string;
    let generatedQrCode: string;

    beforeAll(async () => {
      // Create a superadmin user in fioner_test
      const adminEmail = `${testRunId}_qr_admin@fioner.test`;
      superAdminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: 'hashed_pw_test',
          firstName: 'Super',
          lastName: 'Admin',
          isSuperAdmin: true,
          isActive: true,
        },
      });
      createdUserIds.push(superAdminUser.id);

      superAdminToken = signAccessToken({
        sub: superAdminUser.id,
        email: superAdminUser.email,
        isSuperAdmin: true,
      });

      // Create a customer user & vehicle
      const customerEmail = `${testRunId}_qr_cust@fioner.test`;
      testCustomer = await prisma.user.create({
        data: {
          email: customerEmail,
          passwordHash: 'hashed_pw_test',
          firstName: 'Karan',
          lastName: 'Mehta',
          isSuperAdmin: false,
          isActive: true,
        },
      });
      createdUserIds.push(testCustomer.id);

      testVehicle = await prisma.vehicle.create({
        data: {
          userId: testCustomer.id,
          reg: `MP09QR${Math.floor(1000 + Math.random() * 9000)}`,
          model: 'Tata Harrier',
          fuel: 'DIESEL',
        },
      });
      createdVehicleIds.push(testVehicle.id);
    });

    it('POST /api/v1/admin/qr/batch: generates batch of available QR codes atomically in PostgreSQL', async () => {
      const res = await request(app)
        .post('/api/v1/admin/qr/batch')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          batchName: qrTestBatch,
          quantity: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch).toBe(qrTestBatch);
      expect(res.body.data.count).toBe(3);
      expect(res.body.data.status).toBe('AVAILABLE');

      // Verify records exist in real DB
      const dbQrs = await prisma.qrCode.findMany({
        where: { batch: qrTestBatch },
      });
      expect(dbQrs).toHaveLength(3);
      for (const q of dbQrs) {
        expect(q.status).toBe('AVAILABLE');
        expect(q.vehicleId).toBeNull();
        createdQrIds.push(q.id);
      }

      generatedQrId = dbQrs[0]!.id;
      generatedQrCode = dbQrs[0]!.code;
    });

    it('GET /api/v1/admin/qr: lists inventory with batch and status filtering against PostgreSQL', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/qr?batch=${qrTestBatch}&status=available`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/v1/admin/qr/:id/assign: assigns QR to vehicle and creates assignment history atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/qr/${generatedQrId}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: testVehicle.id,
          notes: 'Assigned in integration test',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(generatedQrCode);
      expect(res.body.data.vehicleId).toBe(testVehicle.id);
      expect(res.body.data.status).toBe('assigned');

      // Verify in DB
      const dbQr = await prisma.qrCode.findUnique({
        where: { id: generatedQrId },
      });
      expect(dbQr?.vehicleId).toBe(testVehicle.id);
      expect(dbQr?.status).toBe('ASSIGNED');

      // Verify assignment history row in DB
      const hist = await prisma.qrAssignmentHistory.findFirst({
        where: { qrCodeId: generatedQrId, vehicleId: testVehicle.id },
      });
      expect(hist).not.toBeNull();
      expect(hist?.reason).toBe('INITIAL_ASSIGNMENT');
      expect(hist?.userId).toBe(testCustomer.id);
      expect(hist?.qrCodeValue).toBe(generatedQrCode);
      expect(hist?.vehicleReg).toBe(testVehicle.reg);
      expect(hist?.userEmail).toBe(testCustomer.email);
    });

    it('Enforces single active QR per vehicle: rejects second assignment to same vehicle with 409 CONFLICT', async () => {
      // Try to assign the second generated QR to the same vehicle
      const secondQrId = createdQrIds[1]!;
      const res = await request(app)
        .post(`/api/v1/admin/qr/${secondQrId}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: testVehicle.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already has an active QR code');
    });

    it('GET /api/v1/admin/vehicles/:id: reflects live QR association in vehicle drawer links', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/vehicles/${testVehicle.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.links.qr.linked).toBe(true);
      expect(res.body.data.links.qr.code).toBe(generatedQrCode);
      expect(res.body.data.links.qr.status).toBe('assigned');
      expect(res.body.data.links.qr.domainStatus).toBe('ACTIVE');
    });

    it('POST /api/v1/admin/qr/:id/replace: supersedes active QR with new QR, retaining history', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/qr/${generatedQrId}/replace`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Integration test replacement',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.replacedQr.id).toBe(generatedQrId);
      expect(res.body.data.replacedQr.status).toBe('replaced');

      const replacementQrId = res.body.data.activeQr.id;
      createdQrIds.push(replacementQrId);

      // Verify old QR is unlinked and marked REPLACED in PostgreSQL
      const oldDb = await prisma.qrCode.findUnique({ where: { id: generatedQrId } });
      expect(oldDb?.status).toBe('REPLACED');
      expect(oldDb?.vehicleId).toBeNull();

      // Verify new QR is bound to vehicle
      const newDb = await prisma.qrCode.findUnique({ where: { id: replacementQrId } });
      expect(newDb?.status).toBe('ASSIGNED');
      expect(newDb?.vehicleId).toBe(testVehicle.id);

      // Verify historical records retained
      const oldHist = await prisma.qrAssignmentHistory.findFirst({
        where: { qrCodeId: generatedQrId },
      });
      expect(oldHist).not.toBeNull();
      expect(oldHist?.unassignedAt).not.toBeNull();
    });

    it('POST /api/v1/admin/qr/:id/suspend & /reactivate: controls QR operational state', async () => {
      const activeQrId = createdQrIds[createdQrIds.length - 1]!;

      // Suspend
      const suspendRes = await request(app)
        .post(`/api/v1/admin/qr/${activeQrId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Maintenance' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('suspended');

      const dbSusp = await prisma.qrCode.findUnique({ where: { id: activeQrId } });
      expect(dbSusp?.status).toBe('SUSPENDED');

      // Reactivate
      const reactivateRes = await request(app)
        .post(`/api/v1/admin/qr/${activeQrId}/reactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'Maintenance completed' });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.status).toBe('active');

      const dbActive = await prisma.qrCode.findUnique({ where: { id: activeQrId } });
      expect(dbActive?.status).toBe('ACTIVE');
    });

    it('POST /api/v1/admin/qr/:id/deactivate: permanently deactivates QR and unbinds vehicle', async () => {
      const activeQrId = createdQrIds[createdQrIds.length - 1]!;

      const deactRes = await request(app)
        .post(`/api/v1/admin/qr/${activeQrId}/deactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Permanent retirement' });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.status).toBe('deactivated');

      const dbDeact = await prisma.qrCode.findUnique({ where: { id: activeQrId } });
      expect(dbDeact?.status).toBe('DEACTIVATED');
      expect(dbDeact?.vehicleId).toBeNull();
    });

    it('History retention: preserves assignment history and scan log records when QR code is deleted', async () => {
      // Create a test QR code with assignment history and scan log
      const tempQr = await prisma.qrCode.create({
        data: {
          code: `QR-HIST-${Date.now()}`,
          batch: 'BATCH-HIST-RETENTION',
          status: 'ASSIGNED',
        },
      });

      const tempHist = await prisma.qrAssignmentHistory.create({
        data: {
          qrCodeId: tempQr.id,
          qrCodeValue: tempQr.code,
          vehicleId: testVehicle.id,
          vehicleReg: testVehicle.reg,
          userId: testCustomer.id,
          userEmail: testCustomer.email,
          reason: 'RETENTION_TEST',
        },
      });

      const tempScan = await prisma.qrScanLog.create({
        data: {
          qrCodeId: tempQr.id,
          qrCodeValue: tempQr.code,
          city: 'Bhopal',
          actionTaken: 'VIEW',
        },
      });

      // Directly delete the QR code record from PostgreSQL
      await prisma.qrCode.delete({ where: { id: tempQr.id } });

      // Verify assignment history row was retained (ON DELETE SET NULL, not CASCADE)
      const preservedHist = await prisma.qrAssignmentHistory.findUnique({
        where: { id: tempHist.id },
      });
      expect(preservedHist).not.toBeNull();
      expect(preservedHist?.qrCodeId).toBeNull();
      expect(preservedHist?.qrCodeValue).toBe(tempQr.code);
      expect(preservedHist?.vehicleReg).toBe(testVehicle.reg);
      expect(preservedHist?.userEmail).toBe(testCustomer.email);

      // Verify scan log was retained
      const preservedScan = await prisma.qrScanLog.findUnique({
        where: { id: tempScan.id },
      });
      expect(preservedScan).not.toBeNull();
      expect(preservedScan?.qrCodeId).toBeNull();
      expect(preservedScan?.qrCodeValue).toBe(tempQr.code);

      // Clean up test records
      await prisma.qrScanLog.delete({ where: { id: tempScan.id } });
      await prisma.qrAssignmentHistory.delete({ where: { id: tempHist.id } });
    });

    describe('QR Domain Lifecycle Concurrency & Integrity Suite', () => {
      let testCustomerToken: string;

      beforeAll(() => {
        testCustomerToken = signAccessToken({
          sub: testCustomer.id,
          email: testCustomer.email,
          isSuperAdmin: false,
        });
      });

      it('Scenario 1: Two concurrent admin assignments of the SAME QR to DIFFERENT vehicles serializes safely without duplicate active links', async () => {
        const veh1 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC1_${Date.now()}`,
            model: 'Tata Nexon',
            fuel: 'ELECTRIC',
          },
        });
        const veh2 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC2_${Date.now()}`,
            model: 'Tata Punch',
            fuel: 'PETROL',
          },
        });
        createdVehicleIds.push(veh1.id, veh2.id);

        const sharedQr = await prisma.qrCode.create({
          data: {
            code: `QR-CONC1-${Date.now()}`,
            batch: 'BATCH-CONC-1',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(sharedQr.id);

        const [res1, res2] = await Promise.all([
          request(app)
            .post(`/api/v1/admin/qr/${sharedQr.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: veh1.id, notes: 'Assign to V1' }),
          request(app)
            .post(`/api/v1/admin/qr/${sharedQr.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: veh2.id, notes: 'Assign to V2' }),
        ]);

        expect([200, 409]).toContain(res1.status);
        expect([200, 409]).toContain(res2.status);

        const dbQr = await prisma.qrCode.findUnique({ where: { id: sharedQr.id } });
        expect(dbQr).not.toBeNull();
        expect(dbQr?.status).toBe('ASSIGNED');
        expect([veh1.id, veh2.id]).toContain(dbQr?.vehicleId);

        const openHist = await prisma.qrAssignmentHistory.findMany({
          where: { qrCodeId: sharedQr.id, unassignedAt: null },
        });
        expect(openHist).toHaveLength(1);
        expect(openHist[0]!.vehicleId).toBe(dbQr?.vehicleId);
      });

      it('Scenario 2: Two concurrent admin assignments of DIFFERENT QRs to the SAME vehicle enforces at most one active QR', async () => {
        const targetVeh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC3_${Date.now()}`,
            model: 'Mahindra Thar',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(targetVeh.id);

        const qrA = await prisma.qrCode.create({
          data: {
            code: `QR-CONC2A-${Date.now()}`,
            batch: 'BATCH-CONC-2',
            status: 'AVAILABLE',
          },
        });
        const qrB = await prisma.qrCode.create({
          data: {
            code: `QR-CONC2B-${Date.now()}`,
            batch: 'BATCH-CONC-2',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(qrA.id, qrB.id);

        const [resA, resB] = await Promise.all([
          request(app)
            .post(`/api/v1/admin/qr/${qrA.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: targetVeh.id }),
          request(app)
            .post(`/api/v1/admin/qr/${qrB.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: targetVeh.id }),
        ]);

        const statuses = [resA.status, resB.status].sort();
        expect(statuses).toEqual([200, 409]);

        const linkedQrs = await prisma.qrCode.findMany({
          where: { vehicleId: targetVeh.id },
        });
        expect(linkedQrs).toHaveLength(1);
        expect([qrA.id, qrB.id]).toContain(linkedQrs[0]!.id);

        const losingQrId = linkedQrs[0]!.id === qrA.id ? qrB.id : qrA.id;
        const losingDb = await prisma.qrCode.findUnique({ where: { id: losingQrId } });
        expect(losingDb?.status).toBe('AVAILABLE');
        expect(losingDb?.vehicleId).toBeNull();
      });

      it('Scenario 3: Concurrent customer link and unlink on the same vehicle maintains consistent state', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC4_${Date.now()}`,
            model: 'Hyundai Creta',
            fuel: 'PETROL',
          },
        });
        createdVehicleIds.push(veh.id);

        const initialQr = await prisma.qrCode.create({
          data: {
            code: `QR-CONC3A-${Date.now()}`,
            batch: 'BATCH-CONC-3',
            status: 'ACTIVE',
            vehicleId: veh.id,
          },
        });
        await prisma.qrAssignmentHistory.create({
          data: {
            qrCodeId: initialQr.id,
            qrCodeValue: initialQr.code,
            vehicleId: veh.id,
            vehicleReg: veh.reg,
            userId: testCustomer.id,
            userEmail: testCustomer.email,
            reason: 'INITIAL_LINK',
          },
        });

        const newQr = await prisma.qrCode.create({
          data: {
            code: `QR-CONC3B-${Date.now()}`,
            batch: 'BATCH-CONC-3',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(initialQr.id, newQr.id);

        const [unlinkRes, linkRes] = await Promise.all([
          request(app)
            .delete(`/api/v1/vehicles/${veh.id}/qr`)
            .set('Authorization', `Bearer ${testCustomerToken}`),
          request(app)
            .post(`/api/v1/vehicles/${veh.id}/qr`)
            .set('Authorization', `Bearer ${testCustomerToken}`)
            .send({ code: newQr.code }),
        ]);

        expect(unlinkRes.status).toBe(200);
        expect([200, 409]).toContain(linkRes.status);

        const activeQrs = await prisma.qrCode.findMany({
          where: { vehicleId: veh.id, status: { in: ['ASSIGNED', 'ACTIVE', 'SUSPENDED'] } },
        });
        expect(activeQrs.length).toBeLessThanOrEqual(1);

        if (activeQrs.length === 0) {
          const hist = await prisma.qrAssignmentHistory.findMany({
            where: { vehicleId: veh.id, unassignedAt: null },
          });
          expect(hist).toHaveLength(0);
        }
      });

      it('Scenario 4: Admin deactivation racing with customer activation prevents resurrecting retired QR', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC5_${Date.now()}`,
            model: 'Kia Seltos',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const qr = await prisma.qrCode.create({
          data: {
            code: `QR-CONC4-${Date.now()}`,
            batch: 'BATCH-CONC-4',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(qr.id);

        await Promise.all([
          request(app)
            .post(`/api/v1/admin/qr/${qr.id}/deactivate`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ reason: 'Decommissioned by admin' }),
          request(app)
            .post(`/api/v1/vehicles/${veh.id}/qr`)
            .set('Authorization', `Bearer ${testCustomerToken}`)
            .send({ code: qr.code }),
        ]);

        const finalQr = await prisma.qrCode.findUnique({ where: { id: qr.id } });
        expect(finalQr?.status).toBe('DEACTIVATED');
        expect(finalQr?.vehicleId).toBeNull();

        const openHist = await prisma.qrAssignmentHistory.findMany({
          where: { qrCodeId: qr.id, unassignedAt: null },
        });
        expect(openHist).toHaveLength(0);
      });

      it('Scenario 5: Two concurrent replacement requests on same vehicle serializes safely with at most one active replacement', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC6_${Date.now()}`,
            model: 'Maruti Brezza',
            fuel: 'CNG',
          },
        });
        createdVehicleIds.push(veh.id);

        const initialQr = await prisma.qrCode.create({
          data: {
            code: `QR-CONC5-OLD-${Date.now()}`,
            batch: 'BATCH-CONC-5',
            status: 'ASSIGNED',
            vehicleId: veh.id,
          },
        });
        await prisma.qrAssignmentHistory.create({
          data: {
            qrCodeId: initialQr.id,
            qrCodeValue: initialQr.code,
            vehicleId: veh.id,
            vehicleReg: veh.reg,
            userId: testCustomer.id,
            userEmail: testCustomer.email,
            reason: 'INITIAL_ASSIGNMENT',
          },
        });
        createdQrIds.push(initialQr.id);

        const [res1, res2] = await Promise.all([
          request(app)
            .post(`/api/v1/admin/qr/${initialQr.id}/replace`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ reason: 'Parallel replace attempt 1' }),
          request(app)
            .post(`/api/v1/admin/qr/${initialQr.id}/replace`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ reason: 'Parallel replace attempt 2' }),
        ]);

        const statuses = [res1.status, res2.status].sort();
        expect(statuses[0]).toBe(200);
        expect([400, 409]).toContain(statuses[1]);

        const dbOld = await prisma.qrCode.findUnique({ where: { id: initialQr.id } });
        expect(dbOld?.status).toBe('REPLACED');
        expect(dbOld?.vehicleId).toBeNull();

        const activeQrs = await prisma.qrCode.findMany({
          where: { vehicleId: veh.id, status: { in: ['ASSIGNED', 'ACTIVE'] } },
        });
        expect(activeQrs).toHaveLength(1);
        createdQrIds.push(activeQrs[0]!.id);

        const oldHist = await prisma.qrAssignmentHistory.findFirst({
          where: { qrCodeId: initialQr.id },
          orderBy: { assignedAt: 'desc' },
        });
        expect(oldHist?.unassignedAt).not.toBeNull();
      });

      it('Scenario 6: Audit log consistency under concurrent lifecycle operations', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC7_${Date.now()}`,
            model: 'MG ZS EV',
            fuel: 'ELECTRIC',
          },
        });
        createdVehicleIds.push(veh.id);

        const qr1 = await prisma.qrCode.create({
          data: {
            code: `QR-CONC6A-${Date.now()}`,
            batch: 'BATCH-CONC-6',
            status: 'AVAILABLE',
          },
        });
        const qr2 = await prisma.qrCode.create({
          data: {
            code: `QR-CONC6B-${Date.now()}`,
            batch: 'BATCH-CONC-6',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(qr1.id, qr2.id);

        const auditCountBefore = await prisma.auditLog.count({
          where: { entity: 'QrCode', entityId: { in: [qr1.id, qr2.id] } },
        });

        await Promise.all([
          request(app)
            .post(`/api/v1/admin/qr/${qr1.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: veh.id }),
          request(app)
            .post(`/api/v1/admin/qr/${qr2.id}/assign`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ vehicleId: veh.id }),
        ]);

        const auditCountAfter = await prisma.auditLog.count({
          where: { entity: 'QrCode', entityId: { in: [qr1.id, qr2.id] } },
        });
        expect(auditCountAfter - auditCountBefore).toBe(1);
      });

      it('Scenario 7: Deterministic overlap — concurrent replaceQr and assignQr targeting the same candidate QR serializes without ABBA deadlock', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC8_${Date.now()}`,
            model: 'Tata Safari',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const oldQr = await prisma.qrCode.create({
          data: {
            code: `QR-DET7-OLD-${Date.now()}`,
            batch: 'BATCH-DET-7',
            status: 'ASSIGNED',
            vehicleId: veh.id,
          },
        });
        await prisma.qrAssignmentHistory.create({
          data: {
            qrCodeId: oldQr.id,
            qrCodeValue: oldQr.code,
            vehicleId: veh.id,
            vehicleReg: veh.reg,
            userId: testCustomer.id,
            userEmail: testCustomer.email,
            reason: 'INITIAL_ASSIGNMENT',
          },
        });

        const candidateQr = await prisma.qrCode.create({
          data: {
            code: `QR-DET7-CAND-${Date.now()}`,
            batch: 'BATCH-DET-7',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(oldQr.id, candidateQr.id);

        // Control flags for deterministic lock overlap
        let t1AcquiredLocks!: () => void;
        const t1AcquiredPromise = new Promise<void>((resolve) => {
          t1AcquiredLocks = resolve;
        });

        let releaseT1!: () => void;
        const releaseT1Promise = new Promise<void>((resolve) => {
          releaseT1 = resolve;
        });

        let t1Finished = false;
        let t2AttemptError: unknown = null;

        // T1: replaces oldQr with candidateQr, pausing while holding PostgreSQL locks
        const t1 = prisma.$transaction(async (tx) => {
          // Lock QR codes deterministically
          const [firstId, secondId] = ([oldQr.id, candidateQr.id] as [string, string]).sort() as [string, string];
          await adminQrRepository.lockById(firstId, tx);
          await adminQrRepository.lockById(secondId, tx);
          await adminQrRepository.lockVehicleById(veh.id, tx);

          // Signal T1 has acquired the locks in PostgreSQL
          t1AcquiredLocks();

          // Wait until T2 has initiated and blocked on candidateQr
          await releaseT1Promise;

          // Apply replacement
          await tx.qrCode.update({
            where: { id: oldQr.id },
            data: { status: 'REPLACED', vehicleId: null },
          });
          await adminQrRepository.closeActiveAssignmentHistory(oldQr.id, `REPLACED_BY_${candidateQr.code}`, tx);

          await tx.qrCode.update({
            where: { id: candidateQr.id },
            data: { status: 'ASSIGNED', vehicleId: veh.id },
          });
          await adminQrRepository.createAssignmentHistory(
            {
              qrCodeId: candidateQr.id,
              qrCodeValue: candidateQr.code,
              vehicleId: veh.id,
              vehicleReg: veh.reg,
              userId: testCustomer.id,
              userEmail: testCustomer.email,
              assignedBy: superAdminUser.id,
              reason: 'REPLACEMENT',
            },
            tx,
          );

          t1Finished = true;
        });

        // T2: attempts assignQr on candidateQr while T1 holds the lock
        const t2 = (async () => {
          // Wait until T1 holds the PostgreSQL row locks
          await t1AcquiredPromise;

          // Release T1 after a brief delay so T2 is actively queued in PostgreSQL
          setTimeout(() => {
            expect(t1Finished).toBe(false);
            releaseT1();
          }, 150);

          try {
            await adminQrService.assignQr(candidateQr.id, { vehicleId: veh.id }, superAdminUser.id);
          } catch (err) {
            t2AttemptError = err;
          }
        })();

        await Promise.all([t1, t2]);

        expect(t1Finished).toBe(true);
        expect(t2AttemptError).toBeDefined();
        // Crucial deadlock assertion: PostgreSQL must NOT have encountered a 40P01 deadlock
        expect(String(t2AttemptError)).not.toContain('deadlock detected');
        expect((t2AttemptError as { code?: string })?.code).not.toBe('40P01');

        // Verify final state consistency in PostgreSQL
        const dbOld = await prisma.qrCode.findUnique({ where: { id: oldQr.id } });
        expect(dbOld?.status).toBe('REPLACED');
        expect(dbOld?.vehicleId).toBeNull();

        const dbCandidate = await prisma.qrCode.findUnique({ where: { id: candidateQr.id } });
        expect(dbCandidate?.status).toBe('ASSIGNED');
        expect(dbCandidate?.vehicleId).toBe(veh.id);

        const vehicleQrs = await prisma.qrCode.findMany({ where: { vehicleId: veh.id } });
        expect(vehicleQrs).toHaveLength(1);
        expect(vehicleQrs[0]!.id).toBe(candidateQr.id);

        const activeHistory = await prisma.qrAssignmentHistory.findMany({
          where: { vehicleId: veh.id, unassignedAt: null },
        });
        expect(activeHistory).toHaveLength(1);
        expect(activeHistory[0]!.qrCodeId).toBe(candidateQr.id);

        const closedHistory = await prisma.qrAssignmentHistory.findFirst({
          where: { qrCodeId: oldQr.id },
        });
        expect(closedHistory?.unassignedAt).not.toBeNull();
      });

      it('Scenario 8: Deterministic lexicographical multi-QR ordering prevents deadlocks between reciprocal concurrent replacements', async () => {
        const vehA = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC9A_${Date.now()}`,
            model: 'Toyota Innova',
            fuel: 'HYBRID',
          },
        });
        const vehB = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `KA05CONC9B_${Date.now()}`,
            model: 'Toyota Fortuner',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(vehA.id, vehB.id);

        const qrA = await prisma.qrCode.create({
          data: {
            code: `QR-RECIP-A-${Date.now()}`,
            batch: 'BATCH-RECIP',
            status: 'ASSIGNED',
            vehicleId: vehA.id,
          },
        });
        const qrB = await prisma.qrCode.create({
          data: {
            code: `QR-RECIP-B-${Date.now()}`,
            batch: 'BATCH-RECIP',
            status: 'AVAILABLE',
          },
        });
        createdQrIds.push(qrA.id, qrB.id);

        // Run replaceQr and another operation locking the same two QRs concurrently
        const [res1, res2] = await Promise.allSettled([
          adminQrService.replaceQr(
            qrA.id,
            { replacementQrId: qrB.id, reason: 'Reciprocal replacement test 1' },
            superAdminUser.id,
          ),
          adminQrService.replaceQr(
            qrA.id,
            { replacementQrId: qrB.id, reason: 'Reciprocal replacement test 2' },
            superAdminUser.id,
          ),
        ]);

        // Neither operation should fail with PostgreSQL 40P01 deadlock
        for (const res of [res1, res2]) {
          if (res.status === 'rejected') {
            expect(String(res.reason)).not.toContain('deadlock detected');
            expect((res.reason as { code?: string })?.code).not.toBe('40P01');
          }
        }

        const activeQrsOnVehA = await prisma.qrCode.findMany({
          where: { vehicleId: vehA.id, status: { in: ['ASSIGNED', 'ACTIVE'] } },
        });
        expect(activeQrsOnVehA).toHaveLength(1);
        expect(activeQrsOnVehA[0]!.id).toBe(qrB.id);
      });
    });

    describe('Super Admin GPS Device Management Real PostgreSQL Scenarios', () => {
      it('Scenario 1: Registers GPS device with unique IMEI and optional serial, rejecting duplicates with 409', async () => {
        const uniqueImei = `86${Date.now()}`.slice(0, 15);
        const uniqueSerial = `SN-${Date.now()}`;

        const created = await adminGpsService.registerGpsDevice(
          {
            imei: uniqueImei,
            serialNumber: uniqueSerial,
            model: 'Rakshak T1',
            vendor: 'Teltonika',
          },
          superAdminUser.id,
          '127.0.0.1',
        );

        createdGpsIds.push(created.id);
        expect(created.imei).toBe(uniqueImei);
        expect(created.serialNumber).toBe(uniqueSerial);
        expect(created.status).toBe('unassigned');

        // Duplicate IMEI rejection
        await expect(
          adminGpsService.registerGpsDevice(
            { imei: uniqueImei, model: 'Duplicate Test' },
            superAdminUser.id,
          ),
        ).rejects.toThrow();

        // Duplicate serial rejection
        const anotherImei = `87${Date.now()}`.slice(0, 15);
        await expect(
          adminGpsService.registerGpsDevice(
            { imei: anotherImei, serialNumber: uniqueSerial },
            superAdminUser.id,
          ),
        ).rejects.toThrow();
      });

      it('Scenario 2: Enforces strict 1:1 binding cardinality and rejects assignment from MAINTENANCE or DEACTIVATED', async () => {
        const veh1 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12GPS1_${Date.now()}`,
            model: 'Hyundai Creta',
            fuel: 'PETROL',
          },
        });
        const veh2 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12GPS2_${Date.now()}`,
            model: 'Kia Seltos',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh1.id, veh2.id);

        const gps1 = await adminGpsService.registerGpsDevice(
          { imei: `861${Date.now()}`.slice(0, 15), model: 'T1' },
          superAdminUser.id,
        );
        const gps2 = await adminGpsService.registerGpsDevice(
          { imei: `862${Date.now()}`.slice(0, 15), model: 'T2' },
          superAdminUser.id,
        );
        createdGpsIds.push(gps1.id, gps2.id);

        // Successful assignment of gps1 to veh1
        const assigned = await adminGpsService.assignGps(
          gps1.id,
          { vehicleId: veh1.id, notes: 'Fleet 1' },
          superAdminUser.id,
        );
        expect(assigned.status).toBe('active');
        expect(assigned.vehicleId).toBe(veh1.id);

        // Rejects assigning a second device (gps2) to veh1
        await expect(
          adminGpsService.assignGps(
            gps2.id,
            { vehicleId: veh1.id },
            superAdminUser.id,
          ),
        ).rejects.toThrow(/already has an active GPS device/);

        // Maintenance state rejection
        await prisma.gPSDevice.update({
          where: { id: gps2.id },
          data: { status: 'MAINTENANCE' },
        });

        await expect(
          adminGpsService.assignGps(
            gps2.id,
            { vehicleId: veh2.id },
            superAdminUser.id,
          ),
        ).rejects.toThrow(/maintenance/);

        // Deactivated state rejection
        await prisma.gPSDevice.update({
          where: { id: gps2.id },
          data: { status: 'DEACTIVATED' },
        });

        await expect(
          adminGpsService.assignGps(
            gps2.id,
            { vehicleId: veh2.id },
            superAdminUser.id,
          ),
        ).rejects.toThrow(/deactivated/);
      });

      it('Scenario 3: Atomic reassignment closes prior history and opens new active history record', async () => {
        const vehA = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH14REASGN_A_${Date.now()}`,
            model: 'Tata Punch',
            fuel: 'PETROL',
          },
        });
        const vehB = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH14REASGN_B_${Date.now()}`,
            model: 'Tata Tiago EV',
            fuel: 'ELECTRIC',
          },
        });
        createdVehicleIds.push(vehA.id, vehB.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `863${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        // Initial assignment to vehA
        await adminGpsService.assignGps(
          gps.id,
          { vehicleId: vehA.id, notes: 'First assign' },
          superAdminUser.id,
        );

        // Reassign to vehB
        await adminGpsService.assignGps(
          gps.id,
          { vehicleId: vehB.id, notes: 'Transferred to vehB' },
          superAdminUser.id,
        );

        const historyRecords = await prisma.gPSDeviceHistory.findMany({
          where: { deviceId: gps.id },
          orderBy: { assignedAt: 'asc' },
        });

        expect(historyRecords).toHaveLength(2);

        // First record closed
        expect(historyRecords[0]!.vehicleId).toBe(vehA.id);
        expect(historyRecords[0]!.unassignedAt).not.toBeNull();
        expect(historyRecords[0]!.reason).toBe('REASSIGNMENT');

        // Second record open
        expect(historyRecords[1]!.vehicleId).toBe(vehB.id);
        expect(historyRecords[1]!.unassignedAt).toBeNull();
        expect(historyRecords[1]!.reason).toBe('REASSIGNMENT');
      });

      it('Scenario 4: Unbinding device releases vehicle, closes history, and sets status to UNASSIGNED', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH15UNBIND_${Date.now()}`,
            model: 'Maruti Brezza',
            fuel: 'CNG',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `864${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        await adminGpsService.assignGps(gps.id, { vehicleId: veh.id }, superAdminUser.id);

        // Unbind
        const unbindResult = await adminGpsService.unbindGps(
          gps.id,
          { notes: 'Customer sold vehicle' },
          superAdminUser.id,
        );

        expect(unbindResult.status).toBe('unassigned');
        expect(unbindResult.vehicleId).toBeNull();

        const deviceInDb = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(deviceInDb?.status).toBe('UNASSIGNED');
        expect(deviceInDb?.vehicleId).toBeNull();

        const history = await prisma.gPSDeviceHistory.findFirst({
          where: { deviceId: gps.id },
        });
        expect(history?.unassignedAt).not.toBeNull();
        expect(history?.reason).toBe('UNBOUND');
      });

      it('Scenario 5: Concurrent conflicting assignments for same vehicle do not create duplicate bindings or deadlocks', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12CONC_${Date.now()}`,
            model: 'Mahindra Thar',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gpsA = await adminGpsService.registerGpsDevice(
          { imei: `865${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        const gpsB = await adminGpsService.registerGpsDevice(
          { imei: `866${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gpsA.id, gpsB.id);

        // Run concurrent assignments of two different devices to the same vehicle
        const [resA, resB] = await Promise.allSettled([
          adminGpsService.assignGps(gpsA.id, { vehicleId: veh.id }, superAdminUser.id),
          adminGpsService.assignGps(gpsB.id, { vehicleId: veh.id }, superAdminUser.id),
        ]);

        // Exactly one should succeed, exactly one should fail with conflict
        const succeeded = [resA, resB].filter((r) => r.status === 'fulfilled');
        const rejected = [resA, resB].filter((r) => r.status === 'rejected');

        expect(succeeded).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        // Ensure database has exactly 1 device bound to veh
        const boundDevices = await prisma.gPSDevice.findMany({
          where: { vehicleId: veh.id, status: 'ACTIVE' },
        });
        expect(boundDevices).toHaveLength(1);
      });

      it('Scenario 6: Geofences belong to Vehicle and survive GPS unbinding & replacement', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12GEO_${Date.now()}`,
            model: 'MG ZS EV',
            fuel: 'ELECTRIC',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps1 = await adminGpsService.registerGpsDevice(
          { imei: `867${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        const gps2 = await adminGpsService.registerGpsDevice(
          { imei: `868${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps1.id, gps2.id);

        // Assign gps1
        await adminGpsService.assignGps(gps1.id, { vehicleId: veh.id }, superAdminUser.id);

        // Create geofence via gps1 drawer
        const gf = await adminGpsService.createGeofence(
          gps1.id,
          {
            name: 'Airport Zone',
            latitude: 18.5822,
            longitude: 73.9197,
            radiusMeters: 1000,
          },
          superAdminUser.id,
        );
        createdGeofenceIds.push(gf.id);

        expect(gf.name).toBe('Airport Zone');
        expect(gf.vehicleId).toBe(veh.id);

        // Unbind gps1
        await adminGpsService.unbindGps(gps1.id, {}, superAdminUser.id);

        // Geofence still exists on the vehicle!
        const geofencesOnVeh = await prisma.geofence.findMany({
          where: { vehicleId: veh.id },
        });
        expect(geofencesOnVeh).toHaveLength(1);

        // Assign replacement device (gps2) to veh
        await adminGpsService.assignGps(gps2.id, { vehicleId: veh.id }, superAdminUser.id);

        // Querying geofences through gps2 returns the vehicle's preserved geofence
        const geofencesFromGps2 = await adminGpsService.listGeofences(gps2.id);
        expect(geofencesFromGps2).toHaveLength(1);
        expect(geofencesFromGps2[0]!.name).toBe('Airport Zone');
      });

      it('Scenario 7: History retention survives vehicle deletion (onDelete: SetNull)', async () => {
        const tempVeh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12TEMP_${Date.now()}`,
            model: 'Temp Car',
            fuel: 'PETROL',
          },
        });

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `869${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        await adminGpsService.assignGps(gps.id, { vehicleId: tempVeh.id }, superAdminUser.id);
        await adminGpsService.unbindGps(gps.id, {}, superAdminUser.id);

        // Delete the vehicle
        await prisma.vehicle.delete({ where: { id: tempVeh.id } });

        // Historical snapshot still exists!
        const historyRecord = await prisma.gPSDeviceHistory.findFirst({
          where: { deviceId: gps.id },
        });
        expect(historyRecord).not.toBeNull();
        expect(historyRecord?.vehicleId).toBeNull(); // Foreign key set to null
        expect(historyRecord?.vehicleReg).toBe(tempVeh.reg); // Immutable snapshot preserved!
        expect(historyRecord?.deviceImei).toBe(gps.imei);
      });

      it('Scenario 8: Deleting a vehicle without GPS device preserves existing deletion behavior', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12NOGPS_${Date.now()}`,
            model: 'Hyundai Creta',
            fuel: 'PETROL',
          },
        });

        const res = await vehicleService.deleteVehicle(veh.id, testCustomer.id);
        expect(res.success).toBe(true);

        const checkVeh = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        expect(checkVeh).toBeNull();

        const auditLog = await prisma.auditLog.findFirst({
          where: {
            entityId: veh.id,
            action: 'vehicle.deleted',
          },
        });
        expect(auditLog).not.toBeNull();
        if (auditLog) createdAuditLogIds.push(auditLog.id);
      });

      it('Scenario 9: Deleting a vehicle with bound GPS device releases device, sets UNASSIGNED, and closes history with VEHICLE_DELETED', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH14BOUND_${Date.now()}`,
            model: 'Tata Harrier',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `871${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        // Bind GPS device to vehicle
        await adminGpsService.assignGps(
          gps.id,
          { vehicleId: veh.id, notes: 'Pre-deletion binding' },
          superAdminUser.id,
        );

        // Verify pre-condition: device is ACTIVE and assigned to veh
        const preDevice = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(preDevice?.status).toBe('ACTIVE');
        expect(preDevice?.vehicleId).toBe(veh.id);

        const preHistory = await prisma.gPSDeviceHistory.findFirst({
          where: { deviceId: gps.id, unassignedAt: null },
        });
        expect(preHistory).not.toBeNull();
        expect(preHistory?.vehicleId).toBe(veh.id);

        // Execute vehicle deletion
        const delRes = await vehicleService.deleteVehicle(veh.id, testCustomer.id);
        expect(delRes.success).toBe(true);

        // Vehicle must be deleted
        const postVeh = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        expect(postVeh).toBeNull();

        // GPS Device must be UNASSIGNED and released from vehicle
        const postDevice = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(postDevice).not.toBeNull();
        expect(postDevice?.status).toBe('UNASSIGNED');
        expect(postDevice?.vehicleId).toBeNull();

        // Active history record must be closed with VEHICLE_DELETED
        const postHistory = await prisma.gPSDeviceHistory.findFirst({
          where: { deviceId: gps.id },
        });
        expect(postHistory).not.toBeNull();
        expect(postHistory?.unassignedAt).not.toBeNull();
        expect(postHistory?.reason).toBe('VEHICLE_DELETED');
        expect(postHistory?.vehicleReg).toBe(veh.reg);
        expect(postHistory?.deviceImei).toBe(gps.imei);

        // Verify both audit logs (GPS unbind and Vehicle deleted)
        const unbindAudit = await prisma.auditLog.findFirst({
          where: {
            entityId: gps.id,
            action: 'admin.gps_unbound',
          },
        });
        expect(unbindAudit).not.toBeNull();
        if (unbindAudit) createdAuditLogIds.push(unbindAudit.id);
      });

      it('Scenario 10: Deleting a vehicle preserves earlier completed history records and snapshots', async () => {
        const veh1 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12EARLY_1_${Date.now()}`,
            model: 'Kwid',
            fuel: 'PETROL',
          },
        });
        const veh2 = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12EARLY_2_${Date.now()}`,
            model: 'Punch',
            fuel: 'PETROL',
          },
        });
        createdVehicleIds.push(veh1.id, veh2.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `872${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        // Initial assignment to veh1
        await adminGpsService.assignGps(gps.id, { vehicleId: veh1.id }, superAdminUser.id);
        // Reassignment to veh2
        await adminGpsService.assignGps(gps.id, { vehicleId: veh2.id }, superAdminUser.id);

        // Delete veh2
        await vehicleService.deleteVehicle(veh2.id, testCustomer.id);

        const history = await prisma.gPSDeviceHistory.findMany({
          where: { deviceId: gps.id },
          orderBy: { assignedAt: 'asc' },
        });

        expect(history).toHaveLength(2);
        // Record 1 for veh1 closed on reassignment
        expect(history[0]!.vehicleReg).toBe(veh1.reg);
        expect(history[0]!.reason).toBe('REASSIGNMENT');
        expect(history[0]!.unassignedAt).not.toBeNull();

        // Record 2 for veh2 closed on vehicle deletion
        expect(history[1]!.vehicleReg).toBe(veh2.reg);
        expect(history[1]!.reason).toBe('VEHICLE_DELETED');
        expect(history[1]!.unassignedAt).not.toBeNull();

        const device = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(device?.status).toBe('UNASSIGNED');
        expect(device?.vehicleId).toBeNull();
      });

      it('Scenario 11: Rollback atomicity on vehicle deletion failure keeps GPS and vehicle intact', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12ROLLBACK_${Date.now()}`,
            model: 'BMW 330i',
            fuel: 'PETROL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `873${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        await adminGpsService.assignGps(gps.id, { vehicleId: veh.id }, superAdminUser.id);

        // Spy on vehicleRepository.delete to simulate unexpected failure during transaction
        const deleteSpy = vi.spyOn(vehicleRepository, 'delete').mockRejectedValueOnce(
          new Error('Simulated database write failure during vehicle delete'),
        );

        await expect(
          vehicleService.deleteVehicle(veh.id, testCustomer.id),
        ).rejects.toThrow('Simulated database write failure');

        deleteSpy.mockRestore();

        // Transaction must have rolled back completely!
        const vehAfter = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        expect(vehAfter).not.toBeNull();

        const deviceAfter = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(deviceAfter?.status).toBe('ACTIVE');
        expect(deviceAfter?.vehicleId).toBe(veh.id);

        const historyAfter = await prisma.gPSDeviceHistory.findFirst({
          where: { deviceId: gps.id },
        });
        expect(historyAfter?.unassignedAt).toBeNull();
      });

      it('Scenario 12: Concurrent vehicle deletion and GPS assignment/reassignment execute safely without deadlocks or dangling states', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12RACE_${Date.now()}`,
            model: 'Scorpio N',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gpsA = await adminGpsService.registerGpsDevice(
          { imei: `874${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        const gpsB = await adminGpsService.registerGpsDevice(
          { imei: `875${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gpsA.id, gpsB.id);

        await adminGpsService.assignGps(gpsA.id, { vehicleId: veh.id }, superAdminUser.id);

        // Run concurrent vehicle deletion and a conflicting GPS assignment
        const [delResult, assignResult] = await Promise.allSettled([
          vehicleService.deleteVehicle(veh.id, testCustomer.id),
          adminGpsService.assignGps(gpsB.id, { vehicleId: veh.id }, superAdminUser.id),
        ]);

        // Either deletion ran first and assign was rejected with not found, or assign ran first and was cleaned up or rejected
        const statuses = [delResult.status, assignResult.status];
        expect(statuses).toContain('fulfilled');

        // Check database consistency: vehicle must not have any ACTIVE device referencing it if deleted
        const vehInDb = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        if (!vehInDb) {
          const boundToDeleted = await prisma.gPSDevice.findMany({
            where: { vehicleId: veh.id },
          });
          expect(boundToDeleted).toHaveLength(0);

          const openHistories = await prisma.gPSDeviceHistory.findMany({
            where: { deviceId: { in: [gpsA.id, gpsB.id] }, unassignedAt: null, vehicleId: veh.id },
          });
          expect(openHistories).toHaveLength(0);
        }
      });

      it('Scenario 13: Unbound-device assignment-versus-deletion concurrency race preserves all database invariants', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12UNB_RACE_${Date.now()}`,
            model: 'XUV700',
            fuel: 'DIESEL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `876${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        // Both begin concurrently from starting state: vehicle has NO GPS device bound
        const [delResult, assignResult] = await Promise.allSettled([
          vehicleService.deleteVehicle(veh.id, testCustomer.id),
          adminGpsService.assignGps(gps.id, { vehicleId: veh.id }, superAdminUser.id),
        ]);

        const statuses = [delResult.status, assignResult.status];
        expect(statuses).toContain('fulfilled');

        // Check database consistency
        const vehInDb = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        const deviceInDb = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });

        if (!vehInDb) {
          // If vehicle was deleted, device MUST NOT reference deleted vehicle
          expect(deviceInDb?.vehicleId).toBeNull();
          expect(deviceInDb?.status).toBe('UNASSIGNED');

          // No open history row can reference deleted vehicle
          const openHistories = await prisma.gPSDeviceHistory.findMany({
            where: { deviceId: gps.id, unassignedAt: null },
          });
          expect(openHistories).toHaveLength(0);

          // If assignment succeeded before deletion, the history was properly closed with VEHICLE_DELETED
          const closedHistories = await prisma.gPSDeviceHistory.findMany({
            where: { deviceId: gps.id, reason: 'VEHICLE_DELETED' },
          });
          if (assignResult.status === 'fulfilled') {
            expect(closedHistories).toHaveLength(1);
            expect(closedHistories[0]!.unassignedAt).not.toBeNull();
          }
        } else {
          // If deletion failed or vehicle still exists, device state must be consistent
          if (deviceInDb?.status === 'ACTIVE') {
            expect(deviceInDb.vehicleId).toBe(veh.id);
          }
        }
      });

      it('Scenario 14: Deterministic barrier synchronization: Assignment locks GPS device first and waits on Vehicle lock while Deletion deletes vehicle', async () => {
        const veh = await prisma.vehicle.create({
          data: {
            userId: testCustomer.id,
            reg: `MH12DET_RACE_${Date.now()}`,
            model: 'Thar Roxx',
            fuel: 'PETROL',
          },
        });
        createdVehicleIds.push(veh.id);

        const gps = await adminGpsService.registerGpsDevice(
          { imei: `877${Date.now()}`.slice(0, 15) },
          superAdminUser.id,
        );
        createdGpsIds.push(gps.id);

        let deviceLockedResolve!: () => void;
        const deviceLockedPromise = new Promise<void>((r) => {
          deviceLockedResolve = r;
        });

        let proceedVehicleLockResolve!: () => void;
        const proceedVehicleLockPromise = new Promise<void>((r) => {
          proceedVehicleLockResolve = r;
        });

        // Intercept lockById specifically for this device to establish the exact ordering
        const originalLockById = adminGpsRepository.lockById;
        const lockSpy = vi.spyOn(adminGpsRepository, 'lockById').mockImplementation(async (id, tx) => {
          const res = await originalLockById.call(adminGpsRepository, id, tx);
          if (id === gps.id) {
            deviceLockedResolve();
            await proceedVehicleLockPromise;
          }
          return res;
        });

        // 1. Start assignment: it locks GPS device first, then halts before locking vehicle
        const assignTask = adminGpsService.assignGps(
          gps.id,
          { vehicleId: veh.id },
          superAdminUser.id,
        );

        // 2. Wait until assignment holds the lock on the GPS device
        await deviceLockedPromise;

        // 3. Now start vehicle deletion in parallel
        // Deletion sees no device currently bound to veh (since assign has not updated vehicleId)
        // Deletion acquires vehicle lock and deletes vehicle
        const delTask = vehicleService.deleteVehicle(veh.id, testCustomer.id);

        // Give deletion a moment to acquire vehicle lock, then release assignment to attempt vehicle lock
        setTimeout(() => {
          proceedVehicleLockResolve();
        }, 50);

        const [delResult, assignResult] = await Promise.allSettled([delTask, assignTask]);

        lockSpy.mockRestore();

        // Deletion must succeed
        expect(delResult.status).toBe('fulfilled');

        // Assignment must fail because target vehicle was deleted
        expect(assignResult.status).toBe('rejected');
        if (assignResult.status === 'rejected') {
          expect((assignResult.reason as Error).message).toContain('Target vehicle not found');
        }

        // Database verification:
        // Vehicle is gone
        const vehInDb = await prisma.vehicle.findUnique({ where: { id: veh.id } });
        expect(vehInDb).toBeNull();

        // Device remains UNASSIGNED with vehicleId: null
        const deviceInDb = await prisma.gPSDevice.findUnique({ where: { id: gps.id } });
        expect(deviceInDb?.status).toBe('UNASSIGNED');
        expect(deviceInDb?.vehicleId).toBeNull();

        // No history rows exist for this device
        const histories = await prisma.gPSDeviceHistory.findMany({ where: { deviceId: gps.id } });
        expect(histories).toHaveLength(0);
      });
    });

    describe('Phase 3E.1 Product Catalog & Warehouse Inventory Engine Integration Suite', () => {
      let invAdminUser: { id: string; email: string };
      let invAdminToken: string;
      let invCustomerUser: { id: string; email: string };
      let invCustomerToken: string;
      const invSuffix = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      beforeAll(async () => {
        invAdminUser = await prisma.user.create({
          data: {
            email: `inv_admin_${invSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Inv',
            lastName: 'Admin',
            isActive: true,
            isSuperAdmin: true,
          },
        });
        createdUserIds.push(invAdminUser.id);
        invAdminToken = signAccessToken({
          sub: invAdminUser.id,
          email: invAdminUser.email,
          isSuperAdmin: true,
        });

        invCustomerUser = await prisma.user.create({
          data: {
            email: `inv_cust_${invSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Cust',
            lastName: 'User',
            isActive: true,
            isSuperAdmin: false,
          },
        });
        createdUserIds.push(invCustomerUser.id);
        invCustomerToken = signAccessToken({
          sub: invCustomerUser.id,
          email: invCustomerUser.email,
          isSuperAdmin: false,
        });
      });

      it('Scenario 0: Non-Super-Admin customer receives 403 Forbidden on inventory endpoints', async () => {
        const res = await request(app)
          .get('/api/v1/admin/inventory/products')
          .set('Authorization', `Bearer ${invCustomerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('Scenario 1: Product creation, database persistence, initial stock and audit recording in PostgreSQL', async () => {
        const sku = `SKU-INT-1-${invSuffix}`.toUpperCase();
        const res = await request(app)
          .post('/api/v1/admin/inventory/products')
          .set('Authorization', `Bearer ${invAdminToken}`)
          .send({
            name: 'SafeTag QR Sticker — Integration Test',
            sku,
            category: 'QR',
            price: 349,
            available: 50,
            warehouse: 'Indore DC',
            description: 'Test QR product',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const prodId = res.body.data.id;
        createdProductIds.push(prodId);

        // Verify in PostgreSQL database
        const dbProduct = await prisma.product.findUnique({
          where: { id: prodId },
          include: {
            stockItems: {
              include: { warehouse: true },
            },
          },
        });
        expect(dbProduct).not.toBeNull();
        expect(dbProduct?.sku).toBe(sku);
        expect(dbProduct?.category).toBe('QR');
        expect(dbProduct?.stockItems).toHaveLength(1);
        expect(dbProduct?.stockItems[0]?.available).toBe(50);
        expect(dbProduct?.stockItems[0]?.warehouse.name).toBe('Indore DC');

        // Verify initial movement recorded in PostgreSQL
        const movement = await prisma.inventoryMovement.findFirst({
          where: { productId: prodId },
        });
        expect(movement).not.toBeNull();
        expect(movement?.type).toBe('PURCHASE');
        expect(movement?.quantity).toBe(50);
        expect(movement?.newAvailable).toBe(50);

        // Verify audit log recorded in PostgreSQL
        const audit = await prisma.auditLog.findFirst({
          where: { entity: 'Product', entityId: prodId, action: 'admin.product_created' },
        });
        expect(audit).not.toBeNull();
        expect(audit?.actorId).toBe(invAdminUser.id);
      });

      it('Scenario 2: Unique SKU constraint enforcement in PostgreSQL', async () => {
        const sku = `SKU-INT-DUP-${invSuffix}`.toUpperCase();
        const prod = await prisma.product.create({
          data: {
            name: 'Original SKU Item',
            sku,
            category: 'GPS',
            price: 1999,
          },
        });
        createdProductIds.push(prod.id);

        // HTTP attempt with duplicate SKU returns 409 Conflict
        const res = await request(app)
          .post('/api/v1/admin/inventory/products')
          .set('Authorization', `Bearer ${invAdminToken}`)
          .send({
            name: 'Duplicate Attempt',
            sku,
            category: 'GPS',
            price: 2499,
          });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain(`Product with SKU '${sku}' already exists`);

        // Database level uniqueness assertion
        await expect(
          prisma.product.create({
            data: {
              name: 'Direct DB Duplicate',
              sku,
              category: 'GPS',
              price: 1000,
            },
          }),
        ).rejects.toThrow();
      });

      it('Scenario 3: Real PostgreSQL concurrency — Simultaneous stock purchases serialize safely via FOR UPDATE row locking', async () => {
        const sku = `SKU-CONC-PURCH-${invSuffix}`;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Concurrency Test Item',
            sku,
            category: ProductCategory.QR,
            price: 499,
            available: 100,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Concurrently run 5 stock intake purchases of 20 units each
        const concurrencyCount = 5;
        const addAmount = 20;

        const tasks = Array.from({ length: concurrencyCount }, () =>
          adminInventoryService.adjustStock(
            prod.id,
            { type: MovementType.PURCHASE, quantity: addAmount },
            invAdminUser.id,
          ),
        );

        const results = await Promise.all(tasks);
        expect(results).toHaveLength(concurrencyCount);

        // Persisted state in PostgreSQL must equal 100 + (5 * 20) = 200
        const stockInDb = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockInDb?.available).toBe(100 + concurrencyCount * addAmount);

        // Exactly 6 movement records in PostgreSQL (1 initial + 5 concurrent purchases)
        const movementCount = await prisma.inventoryMovement.count({
          where: { productId: prod.id },
        });
        expect(movementCount).toBe(6);
      });

      it('Scenario 4: Real PostgreSQL concurrency — Competing stock reservations prevent negative stock and overselling', async () => {
        const sku = `SKU-CONC-RES-${invSuffix}`;
        const initialStock = 50;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Limited Stock Hardware',
            sku,
            category: ProductCategory.HARDWARE,
            price: 2999,
            available: initialStock,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Competing reservations: both try to reserve 35 units from 50 available
        // Together they require 70 units; only ONE can succeed, the other MUST fail
        const [res1, res2] = await Promise.allSettled([
          adminInventoryService.adjustStock(
            prod.id,
            { type: MovementType.RESERVATION, quantity: 35 },
            invAdminUser.id,
          ),
          adminInventoryService.adjustStock(
            prod.id,
            { type: MovementType.RESERVATION, quantity: 35 },
            invAdminUser.id,
          ),
        ]);

        const statuses = [res1.status, res2.status];
        expect(statuses).toContain('fulfilled');
        expect(statuses).toContain('rejected');

        // Check rejection error message
        const rejected = res1.status === 'rejected' ? res1 : (res2 as PromiseRejectedResult);
        expect((rejected.reason as Error).message).toContain('Insufficient available stock');

        // Persisted stock in PostgreSQL: available is exactly 15, reserved is 35 (Never negative)
        const stockInDb = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockInDb?.available).toBe(15);
        expect(stockInDb?.reserved).toBe(35);
      });

      it('Scenario 5: PostgreSQL CHECK constraint enforces non-negative stock at database engine level', async () => {
        const sku = `SKU-CHK-${invSuffix}`;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Check Constraint Product',
            sku,
            category: ProductCategory.ACCESSORY,
            price: 199,
            available: 10,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const stock = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stock).not.toBeNull();

        // Attempt raw SQL update to negative value; PostgreSQL engine MUST reject via CHECK constraint
        await expect(
          prisma.$executeRawUnsafe(
            `UPDATE "stock_items" SET "available" = -5 WHERE "id" = '${stock?.id}'`,
          ),
        ).rejects.toThrow(/stock_items_available_check/);
      });

      it('Scenario 6: Atomicity & Rollback — Failed mutation leaves no phantom movements or audit records', async () => {
        const sku = `SKU-ROLLBACK-${invSuffix}`;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Rollback Test Product',
            sku,
            category: ProductCategory.QR,
            price: 149,
            available: 20,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const movementsBefore = await prisma.inventoryMovement.count({
          where: { productId: prod.id },
        });
        const auditsBefore = await prisma.auditLog.count({
          where: { entityId: prod.id },
        });

        // Trigger failed reservation attempt (requesting 999 units)
        await expect(
          adminInventoryService.adjustStock(
            prod.id,
            { type: MovementType.RESERVATION, quantity: 999 },
            invAdminUser.id,
          ),
        ).rejects.toThrow();

        // Verify database state: quantities, movements, and audit records rolled back
        const stockAfter = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockAfter?.available).toBe(20);
        expect(stockAfter?.reserved).toBe(0);

        const movementsAfter = await prisma.inventoryMovement.count({
          where: { productId: prod.id },
        });
        expect(movementsAfter).toBe(movementsBefore);

        const auditsAfter = await prisma.auditLog.count({
          where: { entityId: prod.id },
        });
        expect(auditsAfter).toBe(auditsBefore);
      });

      it('Scenario 7: Referential integrity — Prevents deletion of warehouse with associated stock items', async () => {
        const whCode = `WH-RI-${invSuffix}`.toUpperCase().substring(0, 20);
        const wh = await prisma.warehouse.create({
          data: {
            name: `Warehouse Referential Integrity ${invSuffix}`,
            code: whCode,
            city: 'Nagpur',
            state: 'Maharashtra',
          },
        });
        createdWarehouseIds.push(wh.id);

        const prod = await adminInventoryService.createProduct(
          {
            name: 'Product in RI Warehouse',
            sku: `SKU-RI-${invSuffix}`,
            category: ProductCategory.HARDWARE,
            price: 999,
            available: 25,
            warehouseId: wh.id,
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Attempting to delete warehouse via HTTP returns 409 Conflict
        const res = await request(app)
          .delete(`/api/v1/admin/inventory/warehouses/${wh.id}`)
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('warehouse has dependent stock item records');

        // Database level foreign key integrity check
        await expect(
          prisma.warehouse.delete({ where: { id: wh.id } }),
        ).rejects.toThrow();
      });

      it('Scenario 8: Stock dashboard & low-stock alerts correctly calculated against lowStockThreshold (< 25)', async () => {
        const lowSku = `SKU-LOW-${invSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Critical Low Stock Sticker',
            sku: lowSku,
            category: ProductCategory.ACCESSORY,
            price: 99,
            available: 7, // below default threshold 25
            lowStockThreshold: 25,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const res = await request(app)
          .get('/api/v1/admin/inventory/stock-dashboard')
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.lowStockCount).toBeGreaterThanOrEqual(1);

        interface LowStockItem {
          id: string;
          name: string;
          sku: string;
          available: number;
          lowStockThreshold: number;
        }

        const lowAlert = (res.body.data.lowStockAlerts as LowStockItem[]).find(
          (a) => a.sku === lowSku,
        );
        expect(lowAlert).toBeDefined();
        expect(lowAlert?.available).toBe(7);
        expect(lowAlert?.lowStockThreshold).toBe(25);
      });

      it('Scenario 9: Serial & IMEI inventory endpoint queries GPS devices and vehicle linkage from PostgreSQL', async () => {
        const testImei = `86${Date.now().toString().slice(-13)}`;
        const gpsDevice = await prisma.gPSDevice.create({
          data: {
            imei: testImei,
            serialNumber: `SN-TEST-${invSuffix}`,
            model: 'Rakshak Solar',
            status: 'ACTIVE',
          },
        });
        createdGpsIds.push(gpsDevice.id);

        const res = await request(app)
          .get(`/api/v1/admin/inventory/serial-imei?search=${testImei}`)
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        interface SerialRowItem {
          id: string;
          sn: string;
          type: string;
          status: string;
        }
        const item = (res.body.data as SerialRowItem[]).find((d) => d.sn === testImei);
        expect(item).toBeDefined();
        expect(item?.type).toBe('GPS device');
        expect(item?.status).toBe('ACTIVE');
      });

      it('Scenario 10: Movement history query reflects accurate transitions (PURCHASE, RESERVATION, DAMAGE)', async () => {
        const sku = `SKU-HIST-${invSuffix}`;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Movement Audit Product',
            sku,
            category: ProductCategory.GPS,
            price: 4999,
            available: 40,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Perform reservations and damages
        await adminInventoryService.adjustStock(
          prod.id,
          { type: MovementType.RESERVATION, quantity: 10, reason: 'Order reserve' },
          invAdminUser.id,
        );
        await adminInventoryService.adjustStock(
          prod.id,
          { type: MovementType.DAMAGE, quantity: 2, reason: 'Broken casing' },
          invAdminUser.id,
        );

        const res = await request(app)
          .get(`/api/v1/admin/inventory/movements?productId=${prod.id}`)
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(3); // Initial PURCHASE, RESERVATION, DAMAGE
        interface MovementRowItem {
          type: string;
        }
        const types = (res.body.data as MovementRowItem[]).map((m) => m.type);
        expect(types).toContain('PURCHASE');
        expect(types).toContain('RESERVATION');
        expect(types).toContain('DAMAGE');
      });

      it('Scenario 11: Real PostgreSQL negative ADJUSTMENT write-down and deterministic DISPATCH from RESERVED source', async () => {
        const sku = `SKU-ADJ-DISP-${invSuffix}`;
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Reconciliation & Dispatch Product',
            sku,
            category: ProductCategory.HARDWARE,
            price: 1299,
            available: 50,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // 1. Reserve 20 units (available becomes 30, reserved becomes 20)
        await adminInventoryService.adjustStock(
          prod.id,
          { type: MovementType.RESERVATION, quantity: 20 },
          invAdminUser.id,
        );

        // 2. Perform downward reconciliation: -10 units shrinkage on available stock
        const adjRes = await adminInventoryService.adjustStock(
          prod.id,
          {
            type: MovementType.ADJUSTMENT,
            quantity: -10,
            reason: 'Physical count audit: write down 10 missing units',
          },
          invAdminUser.id,
        );
        expect(adjRes.stockItem.available).toBe(20);
        expect(adjRes.stockItem.reserved).toBe(20);

        // 3. Dispatch explicitly from RESERVED source (15 units)
        const dispRes = await adminInventoryService.adjustStock(
          prod.id,
          {
            type: MovementType.DISPATCH,
            quantity: 15,
            source: 'RESERVED',
            reason: 'Courier pickup for reserved order',
          },
          invAdminUser.id,
        );
        expect(dispRes.stockItem.available).toBe(20);
        expect(dispRes.stockItem.reserved).toBe(5);
        expect(dispRes.stockItem.dispatched).toBe(15);

        // 4. Attempt to dispatch more from RESERVED than available in reserved (reserved is 5, request 10)
        await expect(
          adminInventoryService.adjustStock(
            prod.id,
            {
              type: MovementType.DISPATCH,
              quantity: 10,
              source: 'RESERVED',
            },
            invAdminUser.id,
          ),
        ).rejects.toThrow(/Insufficient reserved stock \(5\) to dispatch 10 units/);

        // 5. Verify PostgreSQL database state matches exactly
        let stockInDb = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockInDb?.available).toBe(20);
        expect(stockInDb?.reserved).toBe(5);
        expect(stockInDb?.dispatched).toBe(15);

        // 6. Omitted source dispatch: qty (4) <= reserved (5) -> draws from reserved
        const omitRes1 = await adminInventoryService.adjustStock(
          prod.id,
          {
            type: MovementType.DISPATCH,
            quantity: 4,
            // source omitted
            reason: 'Omitted source draws from reserved first',
          },
          invAdminUser.id,
        );
        expect(omitRes1.stockItem.reserved).toBe(1);
        expect(omitRes1.stockItem.dispatched).toBe(19);
        expect(omitRes1.stockItem.available).toBe(20);

        // 7. Omitted source dispatch: qty (8) > reserved (1) but <= available (20) -> falls back to available
        const omitRes2 = await adminInventoryService.adjustStock(
          prod.id,
          {
            type: MovementType.DISPATCH,
            quantity: 8,
            // source omitted
            reason: 'Omitted source falls back to available',
          },
          invAdminUser.id,
        );
        expect(omitRes2.stockItem.available).toBe(12);
        expect(omitRes2.stockItem.reserved).toBe(1);
        expect(omitRes2.stockItem.dispatched).toBe(27);

        // 8. Inbound return transition: 3 units returned by customer post-dispatch
        const returnRes = await adminInventoryService.adjustStock(
          prod.id,
          {
            type: MovementType.RETURN,
            quantity: 3,
            reason: 'Customer return post-dispatch, restocked into available',
          },
          invAdminUser.id,
        );
        expect(returnRes.stockItem.available).toBe(15); // 12 + 3 restored to sellable
        expect(returnRes.stockItem.returned).toBe(3);   // cumulative returns incremented
        expect(returnRes.stockItem.dispatched).toBe(27); // cumulative dispatched remains intact

        // 9. Full PostgreSQL database verification across all 5 inventory counters
        stockInDb = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockInDb?.available).toBe(15);
        expect(stockInDb?.reserved).toBe(1);
        expect(stockInDb?.dispatched).toBe(27);
        expect(stockInDb?.returned).toBe(3);
        expect(stockInDb?.damaged).toBe(0);
      });

      it('Scenario 12: Real PostgreSQL database-level lowStockOnly filtering and available sorting aggregate', async () => {
        const skuA = `SKU-LOW-A-${invSuffix}`.toUpperCase();
        const skuB = `SKU-LOW-B-${invSuffix}`.toUpperCase();

        // Product A: 5 available, threshold 25 -> LOW STOCK
        const prodA = await adminInventoryService.createProduct(
          {
            name: 'Alpha Low Stock Product',
            sku: skuA,
            category: ProductCategory.QR,
            price: 199,
            available: 5,
            lowStockThreshold: 25,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        // Product B: 100 available, threshold 25 -> NORMAL STOCK
        const prodB = await adminInventoryService.createProduct(
          {
            name: 'Beta High Stock Product',
            sku: skuB,
            category: ProductCategory.QR,
            price: 299,
            available: 100,
            lowStockThreshold: 25,
            warehouse: 'Indore DC',
          },
          invAdminUser.id,
        );
        createdProductIds.push(prodA.id, prodB.id);

        // Query with lowStockOnly=true scoped to current test run: Product A must be included, Product B excluded
        const lowRes = await request(app)
          .get(`/api/v1/admin/inventory/products?search=${invSuffix}&lowStockOnly=true`)
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(lowRes.status).toBe(200);
        expect(lowRes.body.success).toBe(true);
        interface ProductRowItem {
          id: string;
          sku: string;
          isLowStock: boolean;
        }
        const skus = (lowRes.body.data as ProductRowItem[]).map((p) => p.sku);
        expect(skus).toContain(skuA);
        expect(skus).not.toContain(skuB);

        // Query with sortBy=available&sortOrder=asc: Alpha (5 available) should appear before Beta (100 available)
        const sortRes = await request(app)
          .get(`/api/v1/admin/inventory/products?search=${invSuffix}&sortBy=available&sortOrder=asc`)
          .set('Authorization', `Bearer ${invAdminToken}`);

        expect(sortRes.status).toBe(200);
        expect(sortRes.body.success).toBe(true);
        const searchSkus = (sortRes.body.data as ProductRowItem[]).map((p) => p.sku);
        const indexA = searchSkus.indexOf(skuA);
        const indexB = searchSkus.indexOf(skuB);
        expect(indexA).toBeGreaterThanOrEqual(0);
        expect(indexB).toBeGreaterThanOrEqual(0);
        expect(indexA).toBeLessThan(indexB);
      });
    });

    describe('Phase 3E.2 Hardware Orders & Fulfilment Engine Integration Suite', () => {
      let ordAdminUser: { id: string; email: string };
      let ordAdminToken: string;
      let ordCustomer1: { id: string; email: string };
      let ordCustomer1Token: string;
      let ordCustomer2: { id: string; email: string };
      let ordCustomer2Token: string;
      const ordSuffix = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      beforeAll(async () => {
        ordAdminUser = await prisma.user.create({
          data: {
            email: `ord_admin_${ordSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Order',
            lastName: 'Admin',
            isActive: true,
            isSuperAdmin: true,
          },
        });
        createdUserIds.push(ordAdminUser.id);
        ordAdminToken = signAccessToken({
          sub: ordAdminUser.id,
          email: ordAdminUser.email,
          isSuperAdmin: true,
        });

        ordCustomer1 = await prisma.user.create({
          data: {
            email: `ord_cust1_${ordSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Aarav',
            lastName: 'Customer',
            phone: '+919876543201',
            isActive: true,
            isSuperAdmin: false,
          },
        });
        createdUserIds.push(ordCustomer1.id);
        ordCustomer1Token = signAccessToken({
          sub: ordCustomer1.id,
          email: ordCustomer1.email,
          isSuperAdmin: false,
        });

        ordCustomer2 = await prisma.user.create({
          data: {
            email: `ord_cust2_${ordSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Rohan',
            lastName: 'Customer',
            phone: '+919876543202',
            isActive: true,
            isSuperAdmin: false,
          },
        });
        createdUserIds.push(ordCustomer2.id);
        ordCustomer2Token = signAccessToken({
          sub: ordCustomer2.id,
          email: ordCustomer2.email,
          isSuperAdmin: false,
        });
      });

      it('Scenario 1: Super Admin manual order creation, real DB persistence, atomic stock reservation, and movement recording in PostgreSQL', async () => {
        const sku = `SKU-ORD-1-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'SafeTag QR Standard Kit',
            sku,
            category: ProductCategory.QR,
            price: 349,
            available: 50,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const res = await request(app)
          .post('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({
            userId: ordCustomer1.id,
            customerName: 'Aarav Customer',
            customerEmail: ordCustomer1.email,
            customerPhone: '+919876543201',
            shippingAddress: { city: 'Indore', state: 'MP', pincode: '452001', street: 'AB Road' },
            payStatus: 'PAID',
            items: [{ productId: prod.id, quantity: 5 }],
            notes: 'Integration test manual order creation',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const orderId = res.body.data.id;
        createdOrderIds.push(orderId);

        expect(res.body.data.orderNo).toMatch(/^FR-/);
        expect(res.body.data.amount).toBe(1745); // 349 * 5
        expect(res.body.data.status).toBe('PLACED');
        expect(res.body.data.payStatus).toBe('PAID');
        expect(res.body.data.product).toBe('SafeTag QR Standard Kit');
        expect(res.body.data.qty).toBe(5);

        // Verify in PostgreSQL database
        const dbOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true, notes: true, activities: true },
        });
        expect(dbOrder).not.toBeNull();
        expect(dbOrder?.userId).toBe(ordCustomer1.id);
        expect(dbOrder?.amount).toBe(1745);
        expect(dbOrder?.items).toHaveLength(1);
        expect(dbOrder?.items[0]?.productId).toBe(prod.id);
        expect(dbOrder?.items[0]?.sku).toBe(sku);
        expect(dbOrder?.items[0]?.unitPrice).toBe(349);
        expect(dbOrder?.items[0]?.quantity).toBe(5);
        expect(dbOrder?.items[0]?.totalPrice).toBe(1745);

        // Verify notes and activities in PostgreSQL
        expect(dbOrder?.notes).toHaveLength(1);
        expect(dbOrder?.notes[0]?.text).toBe('Integration test manual order creation');
        expect(dbOrder?.activities).toHaveLength(1);
        expect(dbOrder?.activities[0]?.status).toBe('PLACED');

        // Verify inventory reservation in PostgreSQL
        const stockInDb = await prisma.stockItem.findFirst({
          where: { productId: prod.id },
        });
        expect(stockInDb?.available).toBe(45);
        expect(stockInDb?.reserved).toBe(5);

        // Verify movement in PostgreSQL
        const movement = await prisma.inventoryMovement.findFirst({
          where: { productId: prod.id, type: MovementType.RESERVATION },
        });
        expect(movement).not.toBeNull();
        expect(movement?.quantity).toBe(5);
        expect(movement?.previousAvailable).toBe(50);
        expect(movement?.newAvailable).toBe(45);
        expect(movement?.previousReserved).toBe(0);
        expect(movement?.newReserved).toBe(5);
      });

      it('Scenario 2: Immutable snapshot stability: order items retain historical price, name, SKU when catalog changes later', async () => {
        const sku = `SKU-ORD-SNAP-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Original Kit Name',
            sku,
            category: ProductCategory.HARDWARE,
            price: 500,
            available: 20,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 2 }],
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);
        expect(order.amount).toBe(1000);
        expect(order.items[0]?.unitPrice).toBe(500);

        // Update product in catalog to a higher price and new name
        await adminInventoryService.updateProduct(
          prod.id,
          {
            name: 'Renamed Kit 2.0',
            price: 799,
          },
          ordAdminUser.id,
        );

        // Fetch order from DB again: must remain 100% stable with historical snapshot
        const fetched = await adminOrdersService.getOrderById(order.id);
        expect(fetched.amount).toBe(1000);
        expect(fetched.items[0]?.unitPrice).toBe(500);
        expect(fetched.items[0]?.totalPrice).toBe(1000);
        expect(fetched.items[0]?.productName).toBe('Original Kit Name');
      });

      it('Scenario 3: Complete lifecycle state machine (PLACED -> CONFIRMED -> SHIPPED -> RETURNED) with real PostgreSQL inventory transitions', async () => {
        const sku = `SKU-ORD-LIFE-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Lifecycle Tracked Product',
            sku,
            category: ProductCategory.GPS,
            price: 2499,
            available: 30,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 3 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        // 1. PLACED -> CONFIRMED
        const confRes = await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CONFIRMED' });
        expect(confRes.status).toBe(200);
        expect(confRes.body.data.status).toBe('CONFIRMED');

        // 2. CONFIRMED -> SHIPPED (dispatches from reserved stock in PostgreSQL)
        const shipRes = await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'SHIPPED', awb: 'AWB-INT-123456' });
        expect(shipRes.status).toBe(200);
        expect(shipRes.body.data.status).toBe('SHIPPED');
        expect(shipRes.body.data.awb).toBe('AWB-INT-123456');

        // Verify in PostgreSQL: reserved stock decremented by 3, dispatched incremented by 3
        let stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(27);
        expect(stock?.reserved).toBe(0);
        expect(stock?.dispatched).toBe(3);

        const dispMove = await prisma.inventoryMovement.findFirst({
          where: { productId: prod.id, type: MovementType.DISPATCH },
        });
        expect(dispMove?.quantity).toBe(3);
        expect(dispMove?.referenceType).toBe('ORDER_DISPATCH');

        // 3. SHIPPED -> RETURNED (restocks available inventory in PostgreSQL)
        const retRes = await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'RETURNED', reason: 'Customer returned unit undamaged' });
        expect(retRes.status).toBe(200);
        expect(retRes.body.data.status).toBe('RETURNED');

        stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(30); // 27 + 3 restored to sellable
        expect(stock?.returned).toBe(3);
        expect(stock?.dispatched).toBe(3);

        // 4. Process refund on returned order: moves order to REFUND_PENDING awaiting webhook
        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ reason: 'Full refund for returned unit' });
        expect(refRes.status).toBe(200);
        expect(refRes.body.data.payStatus).toBe('REFUND_PENDING');

        const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrder?.payStatus).toBe('REFUND_PENDING');
      });

      it('Scenario 4: Order cancellation before shipment releases reserved stock back to available atomically', async () => {
        const sku = `SKU-ORD-CANC-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Cancellation Release Product',
            sku,
            category: ProductCategory.QR,
            price: 199,
            available: 25,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 5 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        // Stock reserved: available 20, reserved 5
        let stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(20);
        expect(stock?.reserved).toBe(5);

        // Cancel order
        const cancelRes = await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Customer requested cancellation' });
        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.status).toBe('CANCELLED');
        expect(cancelRes.body.data.payStatus).toBe('PAID'); // Truthful: cancellation preserves PAID status until explicit refund is executed

        // Stock released in PostgreSQL
        stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(25);
        expect(stock?.reserved).toBe(0);

        const relMove = await prisma.inventoryMovement.findFirst({
          where: { productId: prod.id, type: MovementType.RELEASE },
        });
        expect(relMove?.quantity).toBe(5);
        expect(relMove?.referenceType).toBe('ORDER_CANCELLATION');

        // Explicit refund processing via dedicated endpoint: moves order to REFUND_PENDING
        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ reason: 'Refund for cancelled order' });
        expect(refRes.status).toBe(200);
        expect(refRes.body.data.payStatus).toBe('REFUND_PENDING');
      });

      it('Scenario 5: PostgreSQL check constraints reject negative amount, negative unitPrice, and zero quantity at database level', async () => {
        // Attempt negative amount via raw SQL insert
        await expect(
          prisma.$executeRawUnsafe(`
            INSERT INTO "orders" ("id", "orderNo", "userId", "customerName", "customerEmail", "amount", "status", "payStatus", "currency", "createdAt", "updatedAt")
            VALUES ('chk_fail_ord', 'FR-CHK-NEG', '${ordCustomer1.id}', 'Check Fail', 'chk@test.com', -100, 'PLACED', 'PENDING', 'INR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `),
        ).rejects.toThrow(/violates check constraint/i);

        // Attempt zero quantity via raw SQL insert into order_items
        const sku = `SKU-CHK-QTY-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          { name: 'Check Test Prod', sku, category: ProductCategory.QR, price: 99, available: 10 },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const validOrder = await adminOrdersService.createOrder(
          { userId: ordCustomer1.id, items: [{ productId: prod.id, quantity: 1 }] },
          ordAdminUser.id,
        );
        createdOrderIds.push(validOrder.id);

        await expect(
          prisma.$executeRawUnsafe(`
            INSERT INTO "order_items" ("id", "orderId", "productId", "productName", "sku", "unitPrice", "quantity", "totalPrice", "createdAt", "updatedAt")
            VALUES ('chk_item_zero', '${validOrder.id}', '${prod.id}', 'Check Item', '${sku}', 99, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `),
        ).rejects.toThrow(/violates check constraint/i);
      });

      it('Scenario 6: Real PostgreSQL concurrent orders serialize via SELECT ... FOR UPDATE and reject overselling', async () => {
        const sku = `SKU-ORD-CONC-${ordSuffix}`.toUpperCase();
        // Product has exactly 5 units available
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Concurrency Limited Product',
            sku,
            category: ProductCategory.HARDWARE,
            price: 899,
            available: 5,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Launch two competing orders for 4 units each concurrently
        const [res1, res2] = await Promise.allSettled([
          adminOrdersService.createOrder(
            { userId: ordCustomer1.id, items: [{ productId: prod.id, quantity: 4 }] },
            ordAdminUser.id,
          ),
          adminOrdersService.createOrder(
            { userId: ordCustomer2.id, items: [{ productId: prod.id, quantity: 4 }] },
            ordAdminUser.id,
          ),
        ]);

        const statuses = [res1.status, res2.status];
        expect(statuses).toContain('fulfilled');
        expect(statuses).toContain('rejected');

        const successful = res1.status === 'fulfilled' ? res1.value : (res2 as PromiseFulfilledResult<{ id: string }>).value;
        createdOrderIds.push(successful.id);

        const rejected = res1.status === 'rejected' ? res1.reason : (res2 as PromiseRejectedResult).reason;
        expect(rejected.message).toContain('Insufficient available stock');

        // Check real stock in PostgreSQL: exactly 1 available (5 - 4), exactly 4 reserved. NEVER negative!
        const stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(1);
        expect(stock?.reserved).toBe(4);
      });

      it('Scenario 7: Customer order placement, strict ownership boundary enforcement, and customer-driven cancellation in PostgreSQL', async () => {
        const sku = `SKU-ORD-CUST-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Customer Retail Product',
            sku,
            category: ProductCategory.QR,
            price: 299,
            available: 15,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Customer 1 places order
        const placeRes = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${ordCustomer1Token}`)
          .send({
            items: [{ productId: prod.id, quantity: 3 }],
            shippingAddress: { city: 'Indore', address: 'Bhawarkua' },
          });
        expect(placeRes.status).toBe(201);
        expect(placeRes.body.success).toBe(true);
        const orderId = placeRes.body.data.id;
        createdOrderIds.push(orderId);

        // Customer 2 attempts to view Customer 1's order -> 404
        const viewRes2 = await request(app)
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${ordCustomer2Token}`);
        expect(viewRes2.status).toBe(404);

        // Customer 2 attempts to cancel Customer 1's order -> 404
        const cancelRes2 = await request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${ordCustomer2Token}`)
          .send({ reason: 'Malicious cancel attempt' });
        expect(cancelRes2.status).toBe(404);

        // Customer 1 cancels own order -> 200 OK
        const cancelRes1 = await request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${ordCustomer1Token}`)
          .send({ reason: 'Decided to buy later' });
        expect(cancelRes1.status).toBe(200);
        expect(cancelRes1.body.data.status).toBe('CANCELLED');

        // Verify stock in PostgreSQL: 15 restored to available, 0 reserved
        const stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(15);
        expect(stock?.reserved).toBe(0);

        // Customer 1 attempts to cancel again -> 400 Bad Request
        const cancelAgainRes = await request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${ordCustomer1Token}`)
          .send({ reason: 'Repeat cancel' });
        expect(cancelAgainRes.status).toBe(400);
        expect(cancelAgainRes.body.error.message).toContain('Only orders in \'Placed\' status can be cancelled');
      });

      it('Scenario 8: Transaction rollback safety: failed order leaves zero orphaned movements or corrupted stock', async () => {
        const sku = `SKU-ORD-ROLL-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Rollback Safety Product',
            sku,
            category: ProductCategory.QR,
            price: 150,
            available: 20,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Attempt order creation with invalid customer user ID to trigger transaction rollback
        await expect(
          adminOrdersService.createOrder(
            {
              userId: 'user_nonexistent_rollback_test',
              items: [{ productId: prod.id, quantity: 5 }],
            },
            ordAdminUser.id,
          ),
        ).rejects.toThrow();

        // Verify in PostgreSQL: stock remained completely unchanged at 20 available, 0 reserved
        const stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(20);
        expect(stock?.reserved).toBe(0);

        // Zero movements created
        const movements = await prisma.inventoryMovement.findMany({
          where: { productId: prod.id, type: MovementType.RESERVATION },
        });
        expect(movements).toHaveLength(0);
      });

      it('Scenario 9: Real PostgreSQL order stats aggregation and filtering', async () => {
        const stats = await adminOrdersService.getOrderStats();
        expect(stats).toBeDefined();
        expect(typeof stats.total).toBe('number');
        expect(typeof stats.revenue).toBe('number');
        expect(stats.byStatus).toBeDefined();
        expect(stats.byPayStatus).toBeDefined();

        const listRes = await request(app)
          .get('/api/v1/admin/orders?limit=10')
          .set('Authorization', `Bearer ${ordAdminToken}`);
        expect(listRes.status).toBe(200);
        expect(listRes.body.success).toBe(true);
        expect(Array.isArray(listRes.body.data)).toBe(true);
      });

      it('Scenario 10: Adversarial refund integrity: rejects refund on unpaid order (PENDING/FAILED) and rejects excess refund amount beyond order value', async () => {
        const sku = `SKU-REF-ADV-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Refund Adversarial Product',
            sku,
            category: ProductCategory.HARDWARE,
            price: 200,
            available: 20,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // 1. Create order with PENDING payment
        const orderPending = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 2 }],
            payStatus: PaymentStatus.PENDING,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(orderPending.id);

        // Cancel the unpaid order
        await request(app)
          .patch(`/api/v1/admin/orders/${orderPending.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Unpaid order cancelled' });

        // Attempting to refund an unpaid order must fail
        const unpaidRefundRes = await request(app)
          .post(`/api/v1/admin/orders/${orderPending.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ reason: 'Attempting fraudulent refund' });

        expect(unpaidRefundRes.status).toBe(400);
        expect(unpaidRefundRes.body.success).toBe(false);
        expect(unpaidRefundRes.body.error.message).toContain('Only \'PAID\' orders can be refunded');

        // Verify in PostgreSQL: payStatus remains strictly PENDING
        const dbPending = await prisma.order.findUnique({ where: { id: orderPending.id } });
        expect(dbPending?.payStatus).toBe(PaymentStatus.PENDING);

        // 2. Create order with PAID payment, amount = 400 (2 * 200)
        const orderPaid = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 2 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(orderPaid.id);

        // Cancel the paid order
        await request(app)
          .patch(`/api/v1/admin/orders/${orderPaid.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Customer requested refund' });

        // Attempting excess refund amount (e.g. 1000 INR on 400 INR order) must fail
        const excessRefundRes = await request(app)
          .post(`/api/v1/admin/orders/${orderPaid.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 1000, reason: 'Excess refund' });

        expect(excessRefundRes.status).toBe(400);
        expect(excessRefundRes.body.success).toBe(false);
        expect(excessRefundRes.body.error.message).toContain('cannot exceed order total amount');

        // 3. Initiate refund execution: truthful endpoint moves order to REFUND_PENDING (never falsely REFUNDED)
        const validRefundRes = await request(app)
          .post(`/api/v1/admin/orders/${orderPaid.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 400, reason: 'Full legitimate refund' });

        expect(validRefundRes.status).toBe(200);
        expect(validRefundRes.body.success).toBe(true);
        expect(validRefundRes.body.data.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(validRefundRes.body.data.refundId).toBeDefined();

        const gatewayRefundId = validRefundRes.body.data.refundId;

        // Verify in PostgreSQL: payStatus is REFUND_PENDING, NOT REFUNDED
        const dbPendingRefund = await prisma.order.findUnique({ where: { id: orderPaid.id } });
        expect(dbPendingRefund?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbPendingRefund?.refundId).toBe(gatewayRefundId);

        // Verify OrderRefund record in PostgreSQL
        const dbRefundRecord = await prisma.orderRefund.findFirst({ where: { orderId: orderPaid.id } });
        expect(dbRefundRecord).toBeDefined();
        expect(dbRefundRecord?.status).toBe(RefundStatus.PENDING);
        expect(dbRefundRecord?.gatewayRefundId).toBe(gatewayRefundId);
        expect(dbRefundRecord?.amount).toBe(400);

        // 4. Duplicate request while refund is in flight is rejected
        const dupInFlightRes = await request(app)
          .post(`/api/v1/admin/orders/${orderPaid.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 400, reason: 'Concurrent retry' });
        expect(dupInFlightRes.status).toBe(400);
        expect(dupInFlightRes.body.error.message).toContain('Refund is already in progress');

        // 5. Adversarial Webhook Verification:
        // A) Forged signature is rejected (400)
        const forgedPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: validRefundRes.body.data.paymentId,
                amount: 40000,
                status: 'processed',
              },
            },
          },
        });
        const forgedRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', 'forged_fake_signature_hex')
          .set('Content-Type', 'application/json')
          .send(forgedPayload);
        expect(forgedRes.status).toBe(400);
        expect(forgedRes.body.error.message).toContain('Invalid Razorpay webhook signature');

        // Database remains REFUND_PENDING, not altered by forgery
        const dbPostForgery = await prisma.order.findUnique({ where: { id: orderPaid.id } });
        expect(dbPostForgery?.payStatus).toBe(PaymentStatus.REFUND_PENDING);

        // B) Authentic HMAC-SHA256 signature confirms refund
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';
        process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
        const validSignature = crypto.createHmac('sha256', testWebhookSecret).update(forgedPayload).digest('hex');

        const validWebhookRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', validSignature)
          .set('Content-Type', 'application/json')
          .send(forgedPayload);
        expect(validWebhookRes.status).toBe(200);
        expect(validWebhookRes.body.received).toBe(true);

        // Verify in PostgreSQL: payStatus transitioned to REFUNDED only upon verified webhook
        const dbConfirmed = await prisma.order.findUnique({ where: { id: orderPaid.id } });
        expect(dbConfirmed?.payStatus).toBe(PaymentStatus.REFUNDED);

        const dbConfirmedRefund = await prisma.orderRefund.findFirst({ where: { orderId: orderPaid.id } });
        expect(dbConfirmedRefund?.status).toBe(RefundStatus.PROCESSED);
        expect(dbConfirmedRefund?.processedAt).toBeDefined();

        // C) Webhook replay idempotency: duplicate event is safe and returns 200 without changes
        const replayRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', validSignature)
          .set('Content-Type', 'application/json')
          .send(forgedPayload);
        expect(replayRes.status).toBe(200);

        // D) Admin refund call on already-refunded order is idempotent
        const repeatRefundRes = await request(app)
          .post(`/api/v1/admin/orders/${orderPaid.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ reason: 'Duplicate refund request' });

        expect(repeatRefundRes.status).toBe(200);
        expect(repeatRefundRes.body.data.payStatus).toBe(PaymentStatus.REFUNDED);
      });

      it('Scenario 10b: Provider failure webhook (refund.failed) securely reverts payStatus to PAID, marks OrderRefund FAILED, and never produces a successful refund state in PostgreSQL', async () => {
        const skuFail = `SKU-REF-FAIL-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Refund Failure Test Product',
            sku: skuFail,
            category: ProductCategory.HARDWARE,
            price: 300,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // 1. Create paid order & cancel it
        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Customer cancellation' });

        // 2. Admin initiates refund -> order enters REFUND_PENDING
        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 300, reason: 'Initiate refund before failure' });

        expect(refRes.status).toBe(200);
        expect(refRes.body.data.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        const gatewayRefundId = refRes.body.data.refundId;
        expect(gatewayRefundId).toBeDefined();

        // 3. Provider emits authentic refund.failed webhook
        const failedPayload = JSON.stringify({
          event: 'refund.failed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: refRes.body.data.paymentId,
                amount: 30000,
                status: 'failed',
                error_description: 'Issuer declined reversal due to account restriction',
              },
            },
          },
        });

        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';
        const signature = crypto.createHmac('sha256', testWebhookSecret).update(failedPayload).digest('hex');

        const webhookRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', signature)
          .set('Content-Type', 'application/json')
          .send(failedPayload);

        expect(webhookRes.status).toBe(200);
        expect(webhookRes.body.received).toBe(true);

        // 4. Verify in PostgreSQL:
        // Order payStatus MUST revert to PAID, never marked REFUNDED
        const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrder?.payStatus).toBe(PaymentStatus.PAID);
        expect(dbOrder?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        // OrderRefund record MUST be FAILED with recorded failure reason
        const dbRefund = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefund?.status).toBe(RefundStatus.FAILED);
        expect(dbRefund?.failureReason).toContain('Issuer declined reversal');
        expect(dbRefund?.failedAt).toBeDefined();
      });

      it('Scenario 10c: Webhook correlation safety, payment reference validation, unknown reference handling, and monetary precision checks in PostgreSQL', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // 1. Unknown refund reference: webhook receives an unassociated gatewayRefundId
        const unknownPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: 'rfnd_unknown_foreign_reference_999',
                payment_id: 'pay_unknown_999',
                amount: 50000,
                status: 'processed',
              },
            },
          },
        });
        const unknownSig = crypto.createHmac('sha256', testWebhookSecret).update(unknownPayload).digest('hex');

        const unknownRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', unknownSig)
          .set('Content-Type', 'application/json')
          .send(unknownPayload);

        expect(unknownRes.status).toBe(200);
        expect(unknownRes.body.received).toBe(true);

        // 2. Mismatched payment reference: create paid & cancelled order
        const skuCorr = `SKU-REF-CORR-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Correlation Safety Product',
            sku: skuCorr,
            category: ProductCategory.HARDWARE,
            price: 500,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Customer cancellation' });

        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500, reason: 'Correlation test refund' });

        expect(refRes.status).toBe(200);
        const gatewayRefundId = refRes.body.data.refundId;
        expect(gatewayRefundId).toBeDefined();

        // Webhook arrives with valid refund ID but mismatched payment_id
        const mismatchedPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: 'pay_attacker_forged_mismatch',
                amount: 50000,
                status: 'processed',
              },
            },
          },
        });
        const mismatchSig = crypto.createHmac('sha256', testWebhookSecret).update(mismatchedPayload).digest('hex');

        const mismatchRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', mismatchSig)
          .set('Content-Type', 'application/json')
          .send(mismatchedPayload);

        expect(mismatchRes.status).toBe(200);

        // Order remains in REFUND_PENDING, protected against mismatched payment reference
        const dbPostMismatch = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostMismatch?.payStatus).toBe(PaymentStatus.REFUND_PENDING);

        // 3. Monetary precision & partial refund protection:
        // Webhook arrives with authentic signature but partial amount (250 INR = 25000 paise on 500 INR order)
        const partialPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: dbPostMismatch?.paymentId,
                amount: 25000, // 250 INR
                status: 'processed',
              },
            },
          },
        });
        const partialSig = crypto.createHmac('sha256', testWebhookSecret).update(partialPayload).digest('hex');

        const partialRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', partialSig)
          .set('Content-Type', 'application/json')
          .send(partialPayload);

        expect(partialRes.status).toBe(200);

        // Partial refund MUST NOT mark order fully REFUNDED
        const dbPostPartial = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostPartial?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbPostPartial?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        // 4. Exact full monetary precision settlement in paise:
        const fullPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: dbPostMismatch?.paymentId,
                amount: 50000, // Exactly 50000 paise = 500 INR
                status: 'processed',
              },
            },
          },
        });
        const fullSig = crypto.createHmac('sha256', testWebhookSecret).update(fullPayload).digest('hex');

        const fullRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', fullSig)
          .set('Content-Type', 'application/json')
          .send(fullPayload);

        expect(fullRes.status).toBe(200);

        // Now order is confirmed REFUNDED in PostgreSQL
        const dbPostFull = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostFull?.payStatus).toBe(PaymentStatus.REFUNDED);
      });

      it('Scenario 10d: Out-of-order regression protection, negative amount webhook rejection, duplicate failure idempotency, and exact ₹349.99 precision in PostgreSQL', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // 1. Webhook rejection of negative or zero amount:
        const invalidAmtPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: 'rfnd_invalid_amount_test',
                amount: 0, // non-positive amount
              },
            },
          },
        });
        const invalidSig = crypto.createHmac('sha256', testWebhookSecret).update(invalidAmtPayload).digest('hex');

        const invalidRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', invalidSig)
          .set('Content-Type', 'application/json')
          .send(invalidAmtPayload);

        expect(invalidRes.status).toBe(400);
        expect(invalidRes.body.error.message).toContain('Invalid refund amount in webhook payload');

        // 2. Exact ₹349.99 decimal monetary precision test:
        const skuPrec = `SKU-PREC-349-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Exact 349.99 INR Product',
            sku: skuPrec,
            category: ProductCategory.QR,
            price: 349.99,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);
        expect(order.amount).toBe(349.99);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Cancel 349.99 order' });

        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 349.99, reason: 'Exact full refund 349.99' });

        expect(refRes.status).toBe(200);
        expect(refRes.body.data.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        const gatewayRefundId = refRes.body.data.refundId;
        expect(gatewayRefundId).toBeDefined();

        // Authentic settlement webhook with exactly 34999 paise:
        const fullPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: refRes.body.data.paymentId,
                amount: 34999, // 349.99 INR in paise
                status: 'processed',
              },
            },
          },
        });
        const fullSig = crypto.createHmac('sha256', testWebhookSecret).update(fullPayload).digest('hex');

        const fullRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', fullSig)
          .set('Content-Type', 'application/json')
          .send(fullPayload);

        expect(fullRes.status).toBe(200);

        // Verify order is now fully confirmed as REFUNDED in PostgreSQL:
        const dbConfirmed = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbConfirmed?.payStatus).toBe(PaymentStatus.REFUNDED);
        const dbConfirmedRefund = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbConfirmedRefund?.status).toBe(RefundStatus.PROCESSED);

        // 3. Out-of-order regression protection:
        // A delayed/out-of-order refund.failed event arrives for this already-refunded order
        const delayedFailedPayload = JSON.stringify({
          event: 'refund.failed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: refRes.body.data.paymentId,
                amount: 34999,
                status: 'failed',
                error_description: 'Out-of-order delayed failure signal',
              },
            },
          },
        });
        const delayedSig = crypto.createHmac('sha256', testWebhookSecret).update(delayedFailedPayload).digest('hex');

        const delayedRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', delayedSig)
          .set('Content-Type', 'application/json')
          .send(delayedFailedPayload);

        expect(delayedRes.status).toBe(200);

        // Crucial verification: Out-of-order failure MUST NOT regress state in PostgreSQL
        const dbPostDelayed = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostDelayed?.payStatus).toBe(PaymentStatus.REFUNDED); // NOT regressed to PAID
        const dbRefundPostDelayed = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefundPostDelayed?.status).toBe(RefundStatus.PROCESSED); // NOT regressed to FAILED

        // 4. Duplicate failure idempotency:
        // Create an order where refund actually fails:
        const failOrder = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(failOrder.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${failOrder.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Cancel fail order' });

        const failRefRes = await request(app)
          .post(`/api/v1/admin/orders/${failOrder.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 349.99, reason: 'Actual fail refund' });

        const failGatewayId = failRefRes.body.data.refundId;

        const failPayload = JSON.stringify({
          event: 'refund.failed',
          payload: {
            refund: {
              entity: {
                id: failGatewayId,
                payment_id: failRefRes.body.data.paymentId,
                amount: 34999,
                status: 'failed',
                error_description: 'Account balance insufficient',
              },
            },
          },
        });
        const failSig = crypto.createHmac('sha256', testWebhookSecret).update(failPayload).digest('hex');

        // First delivery:
        const firstFailRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', failSig)
          .set('Content-Type', 'application/json')
          .send(failPayload);
        expect(firstFailRes.status).toBe(200);

        const activitiesCount1 = await prisma.orderActivity.count({ where: { orderId: failOrder.id } });

        // Duplicate second delivery:
        const dupFailRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', failSig)
          .set('Content-Type', 'application/json')
          .send(failPayload);
        expect(dupFailRes.status).toBe(200);

        // Activity count remains identical (no duplicate logs)
        const activitiesCount2 = await prisma.orderActivity.count({ where: { orderId: failOrder.id } });
        expect(activitiesCount2).toBe(activitiesCount1);
      });

      it('Scenario 10e: Final Refund State Consistency — strict amount validation, over-refund quarantine, partial to full settlement, duplicate idempotency, unknown refund safety, and delayed failure immunity', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // 1. Missing or malformed amount in refund.processed must be rejected with 400
        // Case 1a: entity.amount missing
        const missingAmtPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: 'rfnd_missing_amt_test',
                // amount omitted!
              },
            },
          },
        });
        const missingSig = crypto.createHmac('sha256', testWebhookSecret).update(missingAmtPayload).digest('hex');
        const missingRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', missingSig)
          .set('Content-Type', 'application/json')
          .send(missingAmtPayload);

        expect(missingRes.status).toBe(400);
        expect(missingRes.body.error.message).toContain('Webhook missing or invalid provider refund amount');

        // Case 1b: entity.amount non-finite (e.g., string / NaN representation)
        const malformedAmtPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: 'rfnd_malformed_amt_test',
                amount: 'not_a_number',
              },
            },
          },
        });
        const malformedSig = crypto.createHmac('sha256', testWebhookSecret).update(malformedAmtPayload).digest('hex');
        const malformedRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', malformedSig)
          .set('Content-Type', 'application/json')
          .send(malformedAmtPayload);

        expect(malformedRes.status).toBe(400);
        expect(malformedRes.body.error.message).toContain('Invalid refund amount');

        // 2. Unknown refund ID must safely return 200 without mutating database or throwing
        const unknownPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: 'rfnd_completely_unknown_999999',
                payment_id: 'pay_unknown_999',
                amount: 50000,
                status: 'processed',
              },
            },
          },
        });
        const unknownSig = crypto.createHmac('sha256', testWebhookSecret).update(unknownPayload).digest('hex');
        const unknownRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', unknownSig)
          .set('Content-Type', 'application/json')
          .send(unknownPayload);

        expect(unknownRes.status).toBe(200);

        // 3. Create a clean test product and order for full lifecycle testing
        const skuLifecycle = `SKU-LIFECYCLE-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Lifecycle Consistency Product',
            sku: skuLifecycle,
            category: ProductCategory.GPS,
            price: 500.00,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);
        expect(order.amount).toBe(500.00);

        // Cancel order to allow refund
        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Lifecycle test cancellation' });

        // Request full refund via admin endpoint
        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Lifecycle full refund request' });

        expect(refRes.status).toBe(200);
        expect(refRes.body.data.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        const gatewayRefundId = refRes.body.data.refundId;
        const paymentId = refRes.body.data.paymentId;
        expect(gatewayRefundId).toBeDefined();

        // 4. Over-refund quarantine check:
        // Gateway reports refund amount greater than order amount (60000 paise = 600 INR on 500 INR order)
        const overRefundPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: paymentId,
                amount: 60000, // 600 INR > 500 INR order amount
                status: 'processed',
              },
            },
          },
        });
        const overSig = crypto.createHmac('sha256', testWebhookSecret).update(overRefundPayload).digest('hex');
        const overRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', overSig)
          .set('Content-Type', 'application/json')
          .send(overRefundPayload);

        expect(overRes.status).toBe(200);

        // Verification: order MUST NOT be marked REFUNDED! It must remain REFUND_PENDING!
        const dbPostOver = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostOver?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbPostOver?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        // Verify OrderRefund was NOT marked PROCESSED
        const refundPostOver = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(refundPostOver?.status).not.toBe(RefundStatus.PROCESSED);

        // Verify over-refund quarantine activity and audit log exist
        const quarantineActivity = await prisma.orderActivity.findFirst({
          where: { orderId: order.id, title: 'Over-Refund Quarantined' },
        });
        expect(quarantineActivity).not.toBeNull();
        expect(quarantineActivity?.description).toContain('exceeding order total');

        const overAudit = await prisma.auditLog.findFirst({
          where: { entityId: order.id, action: 'payment.refund_over_amount_detected' },
        });
        expect(overAudit).not.toBeNull();

        // 5. Truthful Partial Settlement:
        // Gateway confirms 25000 paise (250 INR, partial refund)
        const partialPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: paymentId,
                amount: 25000, // 250 INR
                status: 'processed',
              },
            },
          },
        });
        const partSig = crypto.createHmac('sha256', testWebhookSecret).update(partialPayload).digest('hex');
        const partRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', partSig)
          .set('Content-Type', 'application/json')
          .send(partialPayload);

        expect(partRes.status).toBe(200);

        // Verification: Order remains REFUND_PENDING (never false full refund)
        const dbPostPartial = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostPartial?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbPostPartial?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        // OrderRefund record truthfully reflects 250 INR and PROCESSED status
        const refundPostPartial = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(refundPostPartial?.status).toBe(RefundStatus.PROCESSED);
        expect(refundPostPartial?.amount).toBe(250.00);

        // 6. Duplicate partial settlement delivery: idempotent, no duplicate activities
        const partActCountBefore = await prisma.orderActivity.count({ where: { orderId: order.id } });
        const dupPartRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', partSig)
          .set('Content-Type', 'application/json')
          .send(partialPayload);
        expect(dupPartRes.status).toBe(200);
        const partActCountAfter = await prisma.orderActivity.count({ where: { orderId: order.id } });
        expect(partActCountAfter).toBe(partActCountBefore);

        // 7. Delayed failure event after partial settlement:
        // Must NOT regress Order to PAID or OrderRefund to FAILED
        const delayedFailPayload = JSON.stringify({
          event: 'refund.failed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: paymentId,
                amount: 25000,
                status: 'failed',
                error_description: 'Delayed network failure on partial',
              },
            },
          },
        });
        const delayedFailSig = crypto.createHmac('sha256', testWebhookSecret).update(delayedFailPayload).digest('hex');
        const delayedFailRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', delayedFailSig)
          .set('Content-Type', 'application/json')
          .send(delayedFailPayload);
        expect(delayedFailRes.status).toBe(200);

        const dbAfterDelayedFail = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbAfterDelayedFail?.payStatus).toBe(PaymentStatus.REFUND_PENDING); // Still REFUND_PENDING
        const refundAfterDelayedFail = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(refundAfterDelayedFail?.status).toBe(RefundStatus.PROCESSED); // Still PROCESSED

        // 8. Later full settlement event:
        // Gateway reports the full 50000 paise (500 INR)
        const fullPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: paymentId,
                amount: 50000, // 500 INR
                status: 'processed',
              },
            },
          },
        });
        const fullSig = crypto.createHmac('sha256', testWebhookSecret).update(fullPayload).digest('hex');
        const fullRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', fullSig)
          .set('Content-Type', 'application/json')
          .send(fullPayload);
        expect(fullRes.status).toBe(200);

        // Verification: Order is now successfully confirmed as REFUNDED
        const dbPostFull = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbPostFull?.payStatus).toBe(PaymentStatus.REFUNDED);

        const refundPostFull = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(refundPostFull?.status).toBe(RefundStatus.PROCESSED);
        expect(refundPostFull?.amount).toBe(500.00);

        // 9. Duplicate full-success event: idempotent no-op
        const fullActCountBefore = await prisma.orderActivity.count({ where: { orderId: order.id } });
        const dupFullRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', fullSig)
          .set('Content-Type', 'application/json')
          .send(fullPayload);
        expect(dupFullRes.status).toBe(200);
        const fullActCountAfter = await prisma.orderActivity.count({ where: { orderId: order.id } });
        expect(fullActCountAfter).toBe(fullActCountBefore);

        // 10. Delayed failure event after full settlement:
        // Order must remain REFUNDED without any regression
        const lateFailPayload = JSON.stringify({
          event: 'refund.failed',
          payload: {
            refund: {
              entity: {
                id: gatewayRefundId,
                payment_id: paymentId,
                amount: 50000,
                status: 'failed',
                error_description: 'Late failure arrives after full refund settled',
              },
            },
          },
        });
        const lateFailSig = crypto.createHmac('sha256', testWebhookSecret).update(lateFailPayload).digest('hex');
        const lateFailRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', lateFailSig)
          .set('Content-Type', 'application/json')
          .send(lateFailPayload);
        expect(lateFailRes.status).toBe(200);

        const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(finalOrder?.payStatus).toBe(PaymentStatus.REFUNDED);
        const finalRefund = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(finalRefund?.status).toBe(RefundStatus.PROCESSED);
        expect(finalRefund?.amount).toBe(500.00);
      });

      it('Scenario 10f: Refund Record Semantics & Reconciliation — distinct provider operations, over-refund followed by legitimate settlement, and quarantine durability without sensitive data leakage', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // 1. Create a product and paid order of 500 INR
        const skuRecon = `SKU-RECON-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Reconciliation Semantics Product',
            sku: skuRecon,
            category: ProductCategory.GPS,
            price: 500.00,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Recon test cancel' });

        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Recon test refund' });

        expect(refRes.status).toBe(200);
        const rfndOp1 = refRes.body.data.refundId;
        const paymentId = refRes.body.data.paymentId;

        // 2. Over-refund event arrives for rfndOp1 (amount 75000 paise = 750 INR > 500 INR order total)
        const overPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndOp1,
                payment_id: paymentId,
                amount: 75000,
                status: 'processed',
              },
            },
          },
        });
        const overSig = crypto.createHmac('sha256', testWebhookSecret).update(overPayload).digest('hex');
        const overRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', overSig)
          .set('Content-Type', 'application/json')
          .send(overPayload);

        // Webhook retry policy: acknowledged with 200 after durable quarantine to avoid provider retry storms
        expect(overRes.status).toBe(200);

        // Verify quarantine evidence:
        // - Order is NOT REFUNDED
        const dbOrderPostOver = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrderPostOver?.payStatus).toBe(PaymentStatus.REFUND_PENDING);

        // - OrderRefund is NOT PROCESSED
        const dbRefundPostOver = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefundPostOver?.status).not.toBe(RefundStatus.PROCESSED);

        // - Searchable OrderActivity exists with explicit quarantine record
        const overActivity = await prisma.orderActivity.findFirst({
          where: { orderId: order.id, title: 'Over-Refund Quarantined' },
        });
        expect(overActivity).not.toBeNull();
        expect(overActivity?.description).toContain('exceeding order total');

        // - Audit log exists with detailed metadata and NO sensitive leaked data (passwords, card numbers, secrets)
        const overAudit = await prisma.auditLog.findFirst({
          where: { entityId: order.id, action: 'payment.refund_over_amount_detected' },
        });
        expect(overAudit).not.toBeNull();
        const auditMeta = overAudit?.metadata as Record<string, unknown>;
        expect(auditMeta.orderNo).toBe(order.orderNo);
        expect(auditMeta.gatewayRefundId).toBe(rfndOp1);
        expect(auditMeta.confirmedPaise).toBe(75000);
        expect(auditMeta.password).toBeUndefined();
        expect(auditMeta.secret).toBeUndefined();
        expect(auditMeta.cardNumber).toBeUndefined();

        // 3. Over-refund followed by legitimate full-success event:
        // Now legitimate settlement arrives for this refund with exactly 50000 paise (500 INR)
        const legitPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndOp1,
                payment_id: paymentId,
                amount: 50000,
                status: 'processed',
              },
            },
          },
        });
        const legitSig = crypto.createHmac('sha256', testWebhookSecret).update(legitPayload).digest('hex');
        const legitRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', legitSig)
          .set('Content-Type', 'application/json')
          .send(legitPayload);

        expect(legitRes.status).toBe(200);

        // Verification: Order is now confirmed REFUNDED, OrderRefund is PROCESSED,
        // AND the prior over-refund quarantine evidence is STILL preserved in order history!
        const dbOrderLegit = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrderLegit?.payStatus).toBe(PaymentStatus.REFUNDED);

        const dbRefundLegit = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefundLegit?.status).toBe(RefundStatus.PROCESSED);
        expect(dbRefundLegit?.amount).toBe(500.00);

        const preservedOverActivity = await prisma.orderActivity.findFirst({
          where: { orderId: order.id, title: 'Over-Refund Quarantined' },
        });
        expect(preservedOverActivity).not.toBeNull(); // Still present for reconciliation audit!

        // 4. Distinct Provider Operations Test:
        // Test two distinct provider operations (rfnd_multi_1 = 200 INR, rfnd_multi_2 = 300 INR) on a 500 INR order
        const skuMulti = `SKU-MULTI-${ordSuffix}`.toUpperCase();
        const prodMulti = await adminInventoryService.createProduct(
          {
            name: 'Multi Operation Product',
            sku: skuMulti,
            category: ProductCategory.GPS,
            price: 500.00,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prodMulti.id);

        const orderMulti = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prodMulti.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(orderMulti.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${orderMulti.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Multi test cancel' });

        const refResMulti = await request(app)
          .post(`/api/v1/admin/orders/${orderMulti.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Multi test refund' });

        const rfndOpA = refResMulti.body.data.refundId;
        const paymentIdMulti = refResMulti.body.data.paymentId;

        // Operation A: Provider processes partial 200 INR (20000 paise) on rfndOpA
        const opAPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndOpA,
                payment_id: paymentIdMulti,
                amount: 20000,
                status: 'processed',
              },
            },
          },
        });
        const opASig = crypto.createHmac('sha256', testWebhookSecret).update(opAPayload).digest('hex');
        const opARes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', opASig)
          .set('Content-Type', 'application/json')
          .send(opAPayload);
        expect(opARes.status).toBe(200);

        // Order remains REFUND_PENDING, rfndOpA is PROCESSED for 200 INR
        const dbOrderMultiPostA = await prisma.order.findUnique({ where: { id: orderMulti.id } });
        expect(dbOrderMultiPostA?.payStatus).toBe(PaymentStatus.REFUND_PENDING);

        const refundA = await prisma.orderRefund.findUnique({ where: { gatewayRefundId: rfndOpA } });
        expect(refundA?.status).toBe(RefundStatus.PROCESSED);
        expect(refundA?.amount).toBe(200.00);

        // Operation B: Provider issues a distinct refund entity rfndOpB for remaining 300 INR (30000 paise)
        const rfndOpB = `rfnd_subsequent_${Date.now()}`;
        const opBPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndOpB,
                payment_id: paymentIdMulti,
                amount: 30000,
                status: 'processed',
              },
            },
          },
        });
        const opBSig = crypto.createHmac('sha256', testWebhookSecret).update(opBPayload).digest('hex');
        const opBRes = await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('x-razorpay-signature', opBSig)
          .set('Content-Type', 'application/json')
          .send(opBPayload);
        expect(opBRes.status).toBe(200);

        // Now cumulative settlement: 200 + 300 = 500 INR!
        // Order transitions to REFUNDED!
        const dbOrderMultiPostB = await prisma.order.findUnique({ where: { id: orderMulti.id } });
        expect(dbOrderMultiPostB?.payStatus).toBe(PaymentStatus.REFUNDED);

        // Both distinct provider refund records exist independently in the database:
        const allRefundsMulti = await prisma.orderRefund.findMany({
          where: { orderId: orderMulti.id },
          orderBy: { createdAt: 'asc' },
        });
        expect(allRefundsMulti).toHaveLength(2);
        expect(allRefundsMulti[0]!.gatewayRefundId).toBe(rfndOpA);
        expect(allRefundsMulti[0]!.amount).toBe(200.00);
        expect(allRefundsMulti[0]!.status).toBe(RefundStatus.PROCESSED);

        expect(allRefundsMulti[1]!.gatewayRefundId).toBe(rfndOpB);
        expect(allRefundsMulti[1]!.amount).toBe(300.00);
        expect(allRefundsMulti[1]!.status).toBe(RefundStatus.PROCESSED);
      });

      it('Scenario 10g: Concurrent Refund Settlement Acceptance — concurrent distinct settlement (20000 + 30000 paise), over-refund race protection, and concurrent duplicate delivery in PostgreSQL', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // ---------------------------------------------------------------------
        // Part 1: Concurrent distinct settlement (20000 paise + 30000 paise)
        // ---------------------------------------------------------------------
        const skuConc = `SKU-CONC-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Concurrent Settlement Product',
            sku: skuConc,
            category: ProductCategory.GPS,
            price: 500.00, // 50000 paise
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);
        expect(order.amount).toBe(500.00);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Cancel for concurrent test' });

        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Full refund request' });

        expect(refRes.status).toBe(200);
        const rfndInitial = refRes.body.data.refundId;
        const paymentId = refRes.body.data.paymentId;

        // Two distinct, valid, correctly correlated provider operations:
        // Op 1: rfndInitial (20000 paise = 200 INR)
        // Op 2: rfndSecond (30000 paise = 300 INR)
        const rfndSecond = `rfnd_conc_${Date.now()}`;

        const payload1 = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndInitial,
                payment_id: paymentId,
                amount: 20000, // 200 INR
                status: 'processed',
              },
            },
          },
        });
        const sig1 = crypto.createHmac('sha256', testWebhookSecret).update(payload1).digest('hex');

        const payload2 = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndSecond,
                payment_id: paymentId,
                amount: 30000, // 300 INR
                status: 'processed',
              },
            },
          },
        });
        const sig2 = crypto.createHmac('sha256', testWebhookSecret).update(payload2).digest('hex');

        // Deliver both signed webhook events concurrently:
        const [res1, res2] = await Promise.all([
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig1)
            .set('Content-Type', 'application/json')
            .send(payload1),
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig2)
            .set('Content-Type', 'application/json')
            .send(payload2),
        ]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        // Verification 1: Both individual refund records are preserved with their own provider IDs and confirmed amounts
        const dbRefunds = await prisma.orderRefund.findMany({
          where: { orderId: order.id },
          orderBy: { createdAt: 'asc' },
        });
        expect(dbRefunds).toHaveLength(2);

        const refund1Record = dbRefunds.find((r) => r.gatewayRefundId === rfndInitial);
        const refund2Record = dbRefunds.find((r) => r.gatewayRefundId === rfndSecond);

        expect(refund1Record).toBeDefined();
        expect(refund1Record?.amount).toBe(200.00);
        expect(refund1Record?.status).toBe(RefundStatus.PROCESSED);

        expect(refund2Record).toBeDefined();
        expect(refund2Record?.amount).toBe(300.00);
        expect(refund2Record?.status).toBe(RefundStatus.PROCESSED);

        // Verification 2: The order ends in REFUNDED once, and only once, when cumulative committed settlement equals exactly 50000 paise
        const dbFinalOrder = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbFinalOrder?.payStatus).toBe(PaymentStatus.REFUNDED);

        const refundConfirmedActivities = await prisma.orderActivity.findMany({
          where: { orderId: order.id, title: 'Refund Confirmed' },
        });
        expect(refundConfirmedActivities).toHaveLength(1); // exactly once!

        // ---------------------------------------------------------------------
        // Part 2: Over-refund race protection under concurrent delivery
        // ---------------------------------------------------------------------
        // Order of 500 INR (50000 paise) receives two concurrent webhooks of 35000 paise each (total 70000 > 50000)
        const skuRace = `SKU-RACE-${ordSuffix}`.toUpperCase();
        const prodRace = await adminInventoryService.createProduct(
          {
            name: 'Over-Refund Race Product',
            sku: skuRace,
            category: ProductCategory.GPS,
            price: 500.00,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prodRace.id);

        const orderRace = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prodRace.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(orderRace.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${orderRace.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Cancel for race test' });

        const refResRace = await request(app)
          .post(`/api/v1/admin/orders/${orderRace.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Race refund request' });

        const rfndRaceA = refResRace.body.data.refundId;
        const rfndRaceB = `rfnd_race_b_${Date.now()}`;
        const paymentIdRace = refResRace.body.data.paymentId;

        const racePayloadA = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndRaceA,
                payment_id: paymentIdRace,
                amount: 35000, // 350 INR
                status: 'processed',
              },
            },
          },
        });
        const raceSigA = crypto.createHmac('sha256', testWebhookSecret).update(racePayloadA).digest('hex');

        const racePayloadB = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndRaceB,
                payment_id: paymentIdRace,
                amount: 35000, // 350 INR (350 + 350 = 700 > 500 INR)
                status: 'processed',
              },
            },
          },
        });
        const raceSigB = crypto.createHmac('sha256', testWebhookSecret).update(racePayloadB).digest('hex');

        const [raceResA, raceResB] = await Promise.all([
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', raceSigA)
            .set('Content-Type', 'application/json')
            .send(racePayloadA),
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', raceSigB)
            .set('Content-Type', 'application/json')
            .send(racePayloadB),
        ]);

        expect(raceResA.status).toBe(200);
        expect(raceResB.status).toBe(200);

        // Verification: The over-refund race MUST NOT produce a false successful state!
        // Order remains in REFUND_PENDING
        const dbOrderRace = await prisma.order.findUnique({ where: { id: orderRace.id } });
        expect(dbOrderRace?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbOrderRace?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        // Quarantine evidence is recorded
        const raceQuarantineAudit = await prisma.auditLog.findFirst({
          where: { entityId: orderRace.id, action: 'payment.refund_over_amount_detected' },
        });
        expect(raceQuarantineAudit).not.toBeNull();

        // ---------------------------------------------------------------------
        // Part 3: Concurrent duplicate delivery
        // ---------------------------------------------------------------------
        // Delivering the exact same payload multiple times concurrently
        const [dup1, dup2, dup3] = await Promise.all([
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig2)
            .set('Content-Type', 'application/json')
            .send(payload2),
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig2)
            .set('Content-Type', 'application/json')
            .send(payload2),
          request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig2)
            .set('Content-Type', 'application/json')
            .send(payload2),
        ]);

        expect(dup1.status).toBe(200);
        expect(dup2.status).toBe(200);
        expect(dup3.status).toBe(200);

        // Verify order remains REFUNDED and no duplicate settlement records created
        const dbOrderAfterDups = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrderAfterDups?.payStatus).toBe(PaymentStatus.REFUNDED);

        const dbRefundsAfterDups = await prisma.orderRefund.findMany({ where: { orderId: order.id } });
        expect(dbRefundsAfterDups).toHaveLength(2); // Still exactly 2 records!
      });

      it('Scenario 10h: Lock Acquisition Failure Safety — lock error or missing locked row strictly aborts transaction without mutating order or marking refund processed', async () => {
        const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_fioner_phase3e';

        // 1. Create a product and paid order of 500 INR
        const skuLockFail = `SKU-LOCKFAIL-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Lock Failure Safety Product',
            sku: skuLockFail,
            category: ProductCategory.GPS,
            price: 500.00,
            available: 10,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        const order = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [{ productId: prod.id, quantity: 1 }],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(order.id);

        await request(app)
          .patch(`/api/v1/admin/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Cancel for lock fail test' });

        const refRes = await request(app)
          .post(`/api/v1/admin/orders/${order.id}/refund`)
          .set('Authorization', `Bearer ${ordAdminToken}`)
          .send({ amount: 500.00, reason: 'Lock fail refund request' });

        expect(refRes.status).toBe(200);
        const rfndId = refRes.body.data.refundId;
        const paymentId = refRes.body.data.paymentId;

        const validPayload = JSON.stringify({
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: rfndId,
                payment_id: paymentId,
                amount: 50000,
                status: 'processed',
              },
            },
          },
        });
        const sig = crypto.createHmac('sha256', testWebhookSecret).update(validPayload).digest('hex');

        // 2. Case A: Lock query throws unexpected database error / timeout
        type TxCallback = (tx: unknown) => Promise<unknown>;
        const originalTx = prisma.$transaction;
        try {
          prisma.$transaction = (async (callback: TxCallback) => {
            return originalTx.call(prisma, async (tx) => {
              const wrappedTx = new Proxy(tx, {
                get(target, prop, receiver) {
                  if (prop === '$queryRaw') {
                    return () => Promise.reject(new Error('Simulated database lock failure / timeout on orders table'));
                  }
                  return Reflect.get(target, prop, receiver);
                },
              });
              return callback(wrappedTx);
            });
          }) as unknown as typeof prisma.$transaction;

          const failRes = await request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig)
            .set('Content-Type', 'application/json')
            .send(validPayload);

          expect(failRes.status).toBe(500);
        } finally {
          prisma.$transaction = originalTx;
        }

        // Verification A: In PostgreSQL, order MUST remain strictly REFUND_PENDING!
        const dbOrderPostFail = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrderPostFail?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbOrderPostFail?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        const dbRefundPostFail = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefundPostFail?.status).not.toBe(RefundStatus.PROCESSED);

        const confirmedActivity = await prisma.orderActivity.findFirst({
          where: { orderId: order.id, title: 'Refund Confirmed' },
        });
        expect(confirmedActivity).toBeNull();

        // 3. Case B: Lock query returns empty array [] (missing locked row)
        try {
          prisma.$transaction = (async (callback: TxCallback) => {
            return originalTx.call(prisma, async (tx) => {
              const wrappedTx = new Proxy(tx, {
                get(target, prop, receiver) {
                  if (prop === '$queryRaw') {
                    return () => Promise.resolve([]);
                  }
                  return Reflect.get(target, prop, receiver);
                },
              });
              return callback(wrappedTx);
            });
          }) as unknown as typeof prisma.$transaction;

          const missingRowRes = await request(app)
            .post('/api/v1/webhooks/razorpay')
            .set('x-razorpay-signature', sig)
            .set('Content-Type', 'application/json')
            .send(validPayload);

          expect(missingRowRes.status).toBe(500);
          expect(missingRowRes.body.error.message).toContain('Failed to acquire order lock');
        } finally {
          prisma.$transaction = originalTx;
        }

        // Verification B: Order remains safely in REFUND_PENDING with zero state mutation
        const dbOrderPostMissing = await prisma.order.findUnique({ where: { id: order.id } });
        expect(dbOrderPostMissing?.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(dbOrderPostMissing?.payStatus).not.toBe(PaymentStatus.REFUNDED);

        const dbRefundPostMissing = await prisma.orderRefund.findFirst({ where: { orderId: order.id } });
        expect(dbRefundPostMissing?.status).not.toBe(RefundStatus.PROCESSED);
      });

      it('Scenario 11: Multi-warehouse inventory accounting: order items spanning multiple warehouses correctly reserve, dispatch, and return to their respective warehouses in PostgreSQL', async () => {
        // Ensure a secondary warehouse exists in PostgreSQL
        const whBhopalCode = `BHO-${ordSuffix}`.slice(0, 10).toUpperCase();
        const whBhopal = await prisma.warehouse.create({
          data: {
            name: `Bhopal DC ${ordSuffix}`,
            code: whBhopalCode,
            city: 'Bhopal',
            state: 'Madhya Pradesh',
            isActive: true,
          },
        });
        createdWarehouseIds.push(whBhopal.id);

        const whIndore = await adminInventoryRepository.findWarehouseByCode('IND-DC');
        expect(whIndore).not.toBeNull();

        const skuMulti = `SKU-MW-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Multi-Warehouse Hardware Kit',
            sku: skuMulti,
            category: ProductCategory.HARDWARE,
            price: 500,
            available: 20,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Add 20 units to Bhopal warehouse as well
        await adminInventoryService.adjustStock(
          prod.id,
          {
            warehouseId: whBhopal.id,
            quantity: 20,
            type: MovementType.PURCHASE,
            reason: 'Stock addition for multi-warehouse integration test',
          },
          ordAdminUser.id,
        );

        // Create order spanning both warehouses: 3 units from Indore, 5 units from Bhopal
        const mwOrder = await adminOrdersService.createOrder(
          {
            userId: ordCustomer1.id,
            items: [
              { productId: prod.id, quantity: 3, warehouseId: whIndore!.id },
              { productId: prod.id, quantity: 5, warehouseId: whBhopal.id },
            ],
            payStatus: PaymentStatus.PAID,
          },
          ordAdminUser.id,
        );
        createdOrderIds.push(mwOrder.id);
        expect(mwOrder.amount).toBe(4000); // (3 + 5) * 500 = 4000

        // Verify stock in PostgreSQL after reservation:
        // Indore: 20 - 3 = 17 available, 3 reserved
        const stockIndorePostRes = await adminInventoryRepository.findStockItem(prod.id, whIndore!.id);
        expect(stockIndorePostRes?.available).toBe(17);
        expect(stockIndorePostRes?.reserved).toBe(3);

        // Bhopal: 20 - 5 = 15 available, 5 reserved
        const stockBhopalPostRes = await adminInventoryRepository.findStockItem(prod.id, whBhopal.id);
        expect(stockBhopalPostRes?.available).toBe(15);
        expect(stockBhopalPostRes?.reserved).toBe(5);

        // Transition PLACED -> CONFIRMED -> SHIPPED
        await adminOrdersService.updateOrderStatus(
          mwOrder.id,
          { status: OrderStatus.CONFIRMED },
          ordAdminUser.id,
        );

        await adminOrdersService.updateOrderStatus(
          mwOrder.id,
          { status: OrderStatus.SHIPPED, awb: 'AWB-MW-12345' },
          ordAdminUser.id,
        );

        // Verify stock in PostgreSQL after dispatch:
        // Indore: 17 available, 0 reserved, 3 dispatched
        const stockIndorePostShip = await adminInventoryRepository.findStockItem(prod.id, whIndore!.id);
        expect(stockIndorePostShip?.available).toBe(17);
        expect(stockIndorePostShip?.reserved).toBe(0);
        expect(stockIndorePostShip?.dispatched).toBe(3);

        // Bhopal: 15 available, 0 reserved, 5 dispatched
        const stockBhopalPostShip = await adminInventoryRepository.findStockItem(prod.id, whBhopal.id);
        expect(stockBhopalPostShip?.available).toBe(15);
        expect(stockBhopalPostShip?.reserved).toBe(0);
        expect(stockBhopalPostShip?.dispatched).toBe(5);

        // Verify distinct dispatch movements in PostgreSQL
        const dispMovements = await prisma.inventoryMovement.findMany({
          where: { productId: prod.id, type: MovementType.DISPATCH },
        });
        expect(dispMovements).toHaveLength(2);
        const indoreDisp = dispMovements.find((m) => m.warehouseId === whIndore!.id);
        const bhopalDisp = dispMovements.find((m) => m.warehouseId === whBhopal.id);
        expect(indoreDisp?.quantity).toBe(3);
        expect(bhopalDisp?.quantity).toBe(5);

        // Transition SHIPPED -> RETURNED
        await adminOrdersService.updateOrderStatus(
          mwOrder.id,
          { status: OrderStatus.RETURNED, reason: 'Customer multi-item return' },
          ordAdminUser.id,
        );

        // Verify stock in PostgreSQL after return:
        // Indore: 17 + 3 = 20 available restored, 3 returned
        const stockIndorePostRet = await adminInventoryRepository.findStockItem(prod.id, whIndore!.id);
        expect(stockIndorePostRet?.available).toBe(20);
        expect(stockIndorePostRet?.returned).toBe(3);

        // Bhopal: 15 + 5 = 20 available restored, 5 returned
        const stockBhopalPostRet = await adminInventoryRepository.findStockItem(prod.id, whBhopal.id);
        expect(stockBhopalPostRet?.available).toBe(20);
        expect(stockBhopalPostRet?.returned).toBe(5);
      });

      it('Scenario 12: Duplicate line consolidation & client total tamper protection in PostgreSQL', async () => {
        const skuConsol = `SKU-CONSOL-${ordSuffix}`.toUpperCase();
        const prod = await adminInventoryService.createProduct(
          {
            name: 'Consolidation Test Product',
            sku: skuConsol,
            category: ProductCategory.QR,
            price: 250,
            available: 30,
            warehouse: 'Indore DC',
          },
          ordAdminUser.id,
        );
        createdProductIds.push(prod.id);

        // Customer places order with duplicate lines of same product: 2 + 4 = 6 units
        const res = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${ordCustomer1Token}`)
          .send({
            items: [
              { productId: prod.id, quantity: 2 },
              { productId: prod.id, quantity: 4 },
            ],
            shippingAddress: { city: 'Indore', address: 'Scheme 78' },
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const orderId = res.body.data.id;
        createdOrderIds.push(orderId);

        // Verify order items in PostgreSQL: exactly 1 consolidated item row with quantity 6
        const dbItems = await prisma.orderItem.findMany({ where: { orderId } });
        expect(dbItems).toHaveLength(1);
        expect(dbItems[0]?.quantity).toBe(6);
        expect(dbItems[0]?.unitPrice).toBe(250);
        expect(dbItems[0]?.totalPrice).toBe(1500);

        // Verify total amount in PostgreSQL: server-calculated 1500
        const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
        expect(dbOrder?.amount).toBe(1500);

        // Verify inventory in PostgreSQL: exactly 24 available (30 - 6), 6 reserved
        const stock = await prisma.stockItem.findFirst({ where: { productId: prod.id } });
        expect(stock?.available).toBe(24);
        expect(stock?.reserved).toBe(6);

        // Exactly 1 reservation movement in PostgreSQL
        const movements = await prisma.inventoryMovement.findMany({
          where: { productId: prod.id, type: MovementType.RESERVATION },
        });
        expect(movements).toHaveLength(1);
        expect(movements[0]?.quantity).toBe(6);
      });
    });

    describe('Phase 3E.3 Consumer Memberships & Subscriptions Integration Suite', () => {
      let memAdminUser: { id: string; email: string };
      let memAdminToken: string;
      let memCustomer1: { id: string; email: string };
      let memCustomer1Token: string;
      let memCustomer2: { id: string; email: string };
      let memCustomer2Token: string;
      const memSuffix = ('mem' + Date.now() + Math.random().toString(36).substring(2, 6)).toLowerCase().replace(/[^a-z0-9]/g, '');
      const testRazorpaySecret = 'test_razorpay_secret_fioner_phase3e3';

      beforeAll(async () => {
        process.env.RAZORPAY_KEY_SECRET = testRazorpaySecret;
        process.env.RAZORPAY_KEY_ID = 'rzp_test_phase3e3';

        memAdminUser = await prisma.user.create({
          data: {
            email: `mem_admin_${memSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Membership',
            lastName: 'Admin',
            isActive: true,
            isSuperAdmin: true,
          },
        });
        createdUserIds.push(memAdminUser.id);
        memAdminToken = signAccessToken({
          sub: memAdminUser.id,
          email: memAdminUser.email,
          isSuperAdmin: true,
        });

        memCustomer1 = await prisma.user.create({
          data: {
            email: `mem_cust1_${memSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Rohan',
            lastName: 'Verma',
            phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
            isActive: true,
            isSuperAdmin: false,
          },
        });
        createdUserIds.push(memCustomer1.id);
        memCustomer1Token = signAccessToken({
          sub: memCustomer1.id,
          email: memCustomer1.email,
          isSuperAdmin: false,
        });

        memCustomer2 = await prisma.user.create({
          data: {
            email: `mem_cust2_${memSuffix}@fioner.test`,
            passwordHash: 'dummy_hash',
            firstName: 'Aarav',
            lastName: 'Sharma',
            phone: `+91988${Math.floor(1000000 + Math.random() * 9000000)}`,
            isActive: true,
            isSuperAdmin: false,
          },
        });
        createdUserIds.push(memCustomer2.id);
        memCustomer2Token = signAccessToken({
          sub: memCustomer2.id,
          email: memCustomer2.email,
          isSuperAdmin: false,
        });
      });

      afterEach(() => {
        razorpayClient.setOrderAdapter(null);
        razorpayClient.setPaymentAdapter(null);
      });

      let planBasicId: string;
      let planProId: string;

      it('Scenario 1: Membership plan creation in PostgreSQL with integer-paise price & slug uniqueness', async () => {
        const slug = `rakshak-basic-${memSuffix}`;
        const res = await request(app)
          .post('/api/v1/admin/memberships/plans')
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({
            name: `Rakshak Basic ${memSuffix}`,
            slug,
            priceInPaise: 49900,
            validityDays: 365,
            color: 'info',
            benefits: ['1 vehicle QR', 'Standard calling'],
            entitlements: {
              tripPlanner: false,
              prioritySupport: false,
              familyAlerts: true,
              gpsLiveTracking: false,
            },
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.priceInPaise).toBe(49900);
        expect(res.body.data.priceInRupees).toBe(499);
        planBasicId = res.body.data.id;
        createdPlanIds.push(planBasicId);

        // Verify direct PostgreSQL integer persistence
        const dbPlan = await prisma.membershipPlan.findUnique({ where: { id: planBasicId } });
        expect(dbPlan?.priceInPaise).toBe(49900);
        expect(Number.isInteger(dbPlan?.priceInPaise)).toBe(true);

        // Duplicate slug fails with 409 Conflict
        const dupRes = await request(app)
          .post('/api/v1/admin/memberships/plans')
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({
            name: `Duplicate Basic ${memSuffix}`,
            slug,
            priceInPaise: 49900,
            validityDays: 365,
            benefits: ['Duplicate'],
            entitlements: {
              tripPlanner: false,
              prioritySupport: false,
              familyAlerts: false,
              gpsLiveTracking: false,
            },
          });

        expect(dupRes.status).toBe(409);
      });

      it('Scenario 2: Customer checkout, verified Razorpay payment, and active subscription creation', async () => {
        const orderId = `order_mem_${Date.now()}`;
        const paymentId = `pay_mem_${Date.now()}`;

        razorpayClient.setOrderAdapter(async (params) => ({
          id: orderId,
          entity: 'order',
          amount: params.amountInPaise,
          currency: params.currency || 'INR',
          status: 'created',
          receipt: params.receipt,
          created_at: Math.floor(Date.now() / 1000),
        }));

        razorpayClient.setPaymentAdapter(async () => ({
          id: paymentId,
          orderId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        const signature = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        // Customer 1 initiates checkout
        const checkoutRes = await request(app)
          .post('/api/v1/memberships/checkout')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({ planId: planBasicId });

        expect(checkoutRes.status).toBe(200);
        expect(checkoutRes.body.data.amount).toBe(49900);
        expect(checkoutRes.body.data.amountInPaise).toBe(49900);
        expect(checkoutRes.body.data.amountInRupees).toBe(499);
        expect(checkoutRes.body.data.currency).toBe('INR');

        // Customer 1 completes subscription with verified payment
        const subRes = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({
            planId: planBasicId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
          });

        expect(subRes.status).toBe(200);
        expect(subRes.body.success).toBe(true);
        expect(subRes.body.data.status).toBe('ACTIVE');
        expect(subRes.body.data.planId).toBe(planBasicId);
        createdSubscriptionIds.push(subRes.body.data.id);

        // Verify in PostgreSQL: subscription is ACTIVE with valid dates
        const dbSub = await prisma.subscription.findUnique({
          where: { id: subRes.body.data.id },
        });
        expect(dbSub?.status).toBe(SubscriptionStatus.ACTIVE);
        expect(dbSub?.userId).toBe(memCustomer1.id);
        expect(dbSub?.expiresAt.getTime()).toBeGreaterThan(Date.now());

        // Verify customer entitlement derivation
        const mySubRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer1Token}`);

        expect(mySubRes.status).toBe(200);
        expect(mySubRes.body.data.hasActiveSubscription).toBe(true);
        expect(mySubRes.body.data.entitlements.familyAlerts).toBe(true);
        expect(mySubRes.body.data.entitlements.tripPlanner).toBe(false);
      });

      it('Scenario 3: Same-plan renewal extends future expiry atomically in PostgreSQL', async () => {
        // Read current subscription expiry
        const priorSub = await prisma.subscription.findFirst({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(priorSub).toBeDefined();
        const priorExpiresAt = priorSub!.expiresAt.getTime();

        const renewOrderId = `order_renew_${Date.now()}`;
        const renewPaymentId = `pay_renew_${Date.now()}`;

        razorpayClient.setPaymentAdapter(async () => ({
          id: renewPaymentId,
          orderId: renewOrderId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          method: 'netbanking',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        const renewSig = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${renewOrderId}|${renewPaymentId}`)
          .digest('hex');

        const renewRes = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({
            planId: planBasicId,
            razorpayOrderId: renewOrderId,
            razorpayPaymentId: renewPaymentId,
            razorpaySignature: renewSig,
          });

        expect(renewRes.status).toBe(200);
        expect(renewRes.body.data.id).not.toBe(priorSub!.id);
        createdSubscriptionIds.push(renewRes.body.data.id);

        // Verify in PostgreSQL: prior subscription is REPLACED, preserving payment and start dates
        const priorSubInDb = await prisma.subscription.findUnique({
          where: { id: priorSub!.id },
        });
        expect(priorSubInDb?.status).toBe(SubscriptionStatus.REPLACED);
        expect(priorSubInDb?.replacedAt).toBeDefined();

        // Verify in PostgreSQL: new active subscription has exactly 365 days added to previous expiry
        const postRenewSub = await prisma.subscription.findUnique({
          where: { id: renewRes.body.data.id },
        });
        expect(postRenewSub?.status).toBe(SubscriptionStatus.ACTIVE);
        const expectedMs = priorExpiresAt + 365 * 86400000;
        expect(Math.abs(postRenewSub!.expiresAt.getTime() - expectedMs)).toBeLessThan(5000);

        // Verify exactly one active subscription exists for Customer 1
        const activeCount = await prisma.subscription.count({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(activeCount).toBe(1);

        // Verify customer subscription history retains BOTH records
        const historyRes = await request(app)
          .get('/api/v1/memberships/history')
          .set('Authorization', `Bearer ${memCustomer1Token}`);
        expect(historyRes.status).toBe(200);
        expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);
      });

      it('Scenario 4: Different-plan upgrade transitions prior subscription to REPLACED atomically', async () => {
        // Create Pro plan
        const proPlanRes = await request(app)
          .post('/api/v1/admin/memberships/plans')
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({
            name: `Rakshak Pro ${memSuffix}`,
            slug: `rakshak-pro-${memSuffix}`,
            priceInPaise: 199900,
            validityDays: 365,
            color: 'success',
            benefits: ['All features included'],
            entitlements: {
              tripPlanner: true,
              prioritySupport: true,
              familyAlerts: true,
              gpsLiveTracking: true,
            },
          });
        expect(proPlanRes.status).toBe(201);
        planProId = proPlanRes.body.data.id;
        createdPlanIds.push(planProId);

        const priorSub = await prisma.subscription.findFirst({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(priorSub).toBeDefined();

        const upgOrderId = `order_upg_${Date.now()}`;
        const upgPaymentId = `pay_upg_${Date.now()}`;

        razorpayClient.setPaymentAdapter(async () => ({
          id: upgPaymentId,
          orderId: upgOrderId,
          amount: 199900,
          currency: 'INR',
          status: 'captured',
          method: 'card',
          notes: {
            userId: memCustomer1.id,
            planId: planProId,
            type: 'membership_subscription',
          },
        }));

        const upgSig = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${upgOrderId}|${upgPaymentId}`)
          .digest('hex');

        const upgRes = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({
            planId: planProId,
            razorpayOrderId: upgOrderId,
            razorpayPaymentId: upgPaymentId,
            razorpaySignature: upgSig,
          });

        expect(upgRes.status).toBe(200);
        expect(upgRes.body.data.planId).toBe(planProId);
        createdSubscriptionIds.push(upgRes.body.data.id);

        // Verify in PostgreSQL: prior subscription is now REPLACED with replacedAt timestamp
        const replacedSub = await prisma.subscription.findUnique({
          where: { id: priorSub!.id },
        });
        expect(replacedSub?.status).toBe(SubscriptionStatus.REPLACED);
        expect(replacedSub?.replacedAt).toBeDefined();

        // New subscription is ACTIVE with Pro plan
        const newSub = await prisma.subscription.findUnique({
          where: { id: upgRes.body.data.id },
        });
        expect(newSub?.status).toBe(SubscriptionStatus.ACTIVE);
        expect(newSub?.planId).toBe(planProId);

        // Customer's effective entitlements now reflect Pro plan
        const mySubRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer1Token}`);
        expect(mySubRes.body.data.entitlements.tripPlanner).toBe(true);
        expect(mySubRes.body.data.entitlements.prioritySupport).toBe(true);
      });

      it('Scenario 5: Preference update (autoRenew) persists without billing', async () => {
        const prefRes = await request(app)
          .patch('/api/v1/memberships/preferences')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({ autoRenew: true });

        expect(prefRes.status).toBe(200);
        expect(prefRes.body.data.autoRenew).toBe(true);

        // Verify in PostgreSQL
        const activeSub = await prisma.subscription.findFirst({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(activeSub?.autoRenew).toBe(true);
      });

      it('Scenario 6: Cancellation marks subscription CANCELLED and revokes premium entitlements', async () => {
        const cancelRes = await request(app)
          .post('/api/v1/memberships/cancel')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({ reason: 'Integration test cancellation' });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.status).toBe(SubscriptionStatus.CANCELLED);

        // Verify in PostgreSQL
        const dbCancelled = await prisma.subscription.findUnique({
          where: { id: cancelRes.body.data.id },
        });
        expect(dbCancelled?.status).toBe(SubscriptionStatus.CANCELLED);
        expect(dbCancelled?.cancelledAt).toBeDefined();

        // Customer now has base entitlements only
        const mySubRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer1Token}`);

        expect(mySubRes.body.data.hasActiveSubscription).toBe(false);
        expect(mySubRes.body.data.entitlements.tripPlanner).toBe(false);
        expect(mySubRes.body.data.entitlements.familyAlerts).toBe(false);
      });

      it('Scenario 7: Restrictive plan deletion prevents removing plan with subscription history', async () => {
        // Attempting to delete planBasic directly in PostgreSQL must violate foreign key restriction (P2003)
        await expect(
          prisma.membershipPlan.delete({ where: { id: planBasicId } }),
        ).rejects.toThrow();

        // Plan remains in PostgreSQL
        const planStillExists = await prisma.membershipPlan.findUnique({
          where: { id: planBasicId },
        });
        expect(planStillExists).toBeDefined();
      });

      it('Scenario 8: Derived expiry treats past expiresAt as expired without background workers', async () => {
        // Create an expired subscription for Customer 2 directly in PostgreSQL
        const expiredSub = await prisma.subscription.create({
          data: {
            userId: memCustomer2.id,
            planId: planProId,
            status: SubscriptionStatus.ACTIVE, // Stored as ACTIVE
            startedAt: new Date(Date.now() - 400 * 86400000),
            expiresAt: new Date(Date.now() - 35 * 86400000), // Expired 35 days ago
          },
        });
        createdSubscriptionIds.push(expiredSub.id);

        // Derived entitlement query must report expired / base access
        const mySubRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer2Token}`);

        expect(mySubRes.status).toBe(200);
        expect(mySubRes.body.data.hasActiveSubscription).toBe(false);
        expect(mySubRes.body.data.entitlements.tripPlanner).toBe(false);
      });

      it('Scenario 9: Executive Dashboard aggregates real PostgreSQL subscription counts', async () => {
        const ranges = {
          currentStart: new Date(Date.now() - 30 * 86400000),
          currentEnd: new Date(),
          prevStart: new Date(Date.now() - 60 * 86400000),
          prevEnd: new Date(Date.now() - 30 * 86400000),
        };

        const overview = await adminDashboardRepository.getExecutiveOverview(ranges);
        expect(overview.subscriptions).toBeDefined();
        expect(overview.subscriptions.total).toBeGreaterThanOrEqual(2);
        expect(typeof overview.subscriptions.active).toBe('number');
      });

      it('Scenario 10: Policy A verification in PostgreSQL — Plan deactivation rejects new checkouts but existing paid subscriber retains entitlements until expiry', async () => {
        // 1. Create dedicated Policy A test plan
        const planRes = await request(app)
          .post('/api/v1/admin/memberships/plans')
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({
            name: `Policy A Plan ${memSuffix}`,
            slug: `policy-a-plan-${memSuffix}`,
            priceInPaise: 89900,
            validityDays: 365,
            color: 'info',
            benefits: ['Policy A full entitlements'],
            entitlements: {
              tripPlanner: true,
              prioritySupport: true,
              familyAlerts: true,
              gpsLiveTracking: true,
            },
          });
        expect(planRes.status).toBe(201);
        const policyAPlanId = planRes.body.data.id;
        createdPlanIds.push(policyAPlanId);

        // 2. Create active subscription for Customer 2 with 60 days validity
        const sub = await prisma.subscription.create({
          data: {
            userId: memCustomer2.id,
            planId: policyAPlanId,
            status: SubscriptionStatus.ACTIVE,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 86400000),
            paymentId: `pay_policy_a_${Date.now()}`,
            amountPaidInPaise: 89900,
          },
        });
        createdSubscriptionIds.push(sub.id);

        // 3. Customer 2 has active entitlements
        const initialRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer2Token}`);
        expect(initialRes.status).toBe(200);
        expect(initialRes.body.data.hasActiveSubscription).toBe(true);
        expect(initialRes.body.data.entitlements.tripPlanner).toBe(true);
        expect(initialRes.body.data.entitlements.gpsLiveTracking).toBe(true);

        // 4. Super Admin deactivates the plan
        const deactRes = await request(app)
          .patch(`/api/v1/admin/memberships/plans/${policyAPlanId}`)
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({ isActive: false });
        expect(deactRes.status).toBe(200);
        expect(deactRes.body.data.isActive).toBe(false);

        // 5. Plan disappears from active public catalog
        const catalogRes = await request(app).get('/api/v1/memberships/plans');
        expect(catalogRes.status).toBe(200);
        const inCatalog = catalogRes.body.data.some((p: { id: string }) => p.id === policyAPlanId);
        expect(inCatalog).toBe(false);

        // 6. Attempting new checkout on deactivated plan fails closed with 400
        const checkoutRes = await request(app)
          .post('/api/v1/memberships/checkout')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({ planId: policyAPlanId });
        expect(checkoutRes.status).toBe(400);
        expect(checkoutRes.body.error.message).toContain('inactive');

        // 7. Policy A: Existing paid subscriber retains full entitlements before expiry
        const postDeactRes = await request(app)
          .get('/api/v1/memberships/my-subscription')
          .set('Authorization', `Bearer ${memCustomer2Token}`);
        expect(postDeactRes.status).toBe(200);
        expect(postDeactRes.body.data.hasActiveSubscription).toBe(true);
        expect(postDeactRes.body.data.entitlements.tripPlanner).toBe(true);
        expect(postDeactRes.body.data.entitlements.gpsLiveTracking).toBe(true);

        // 8. Super Admin reactivates plan — Customer 2 subscription remains untouched in PostgreSQL
        const reactRes = await request(app)
          .patch(`/api/v1/admin/memberships/plans/${policyAPlanId}`)
          .set('Authorization', `Bearer ${memAdminToken}`)
          .send({ isActive: true });
        expect(reactRes.status).toBe(200);

        const dbSubAfter = await prisma.subscription.findUnique({
          where: { id: sub.id },
        });
        expect(dbSubAfter?.status).toBe(SubscriptionStatus.ACTIVE);
        expect(dbSubAfter?.paymentId).toBe(sub.paymentId);
        expect(dbSubAfter?.amountPaidInPaise).toBe(89900);
      });

      it('Scenario 11: Two concurrent verification requests using the same payment ID yield exactly one subscription', async () => {
        const racePaymentId = `pay_race_same_${Date.now()}`;
        const raceOrderId = `order_race_same_${Date.now()}`;

        razorpayClient.setPaymentAdapter(async (id: string) => ({
          id,
          orderId: raceOrderId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        const sig = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${raceOrderId}|${racePaymentId}`)
          .digest('hex');

        // Fire two concurrent verification requests with identical paymentId
        const [res1, res2] = await Promise.all([
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planBasicId,
              razorpayOrderId: raceOrderId,
              razorpayPaymentId: racePaymentId,
              razorpaySignature: sig,
            }),
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planBasicId,
              razorpayOrderId: raceOrderId,
              razorpayPaymentId: racePaymentId,
              razorpaySignature: sig,
            }),
        ]);

        // Both requests must complete with 200 OK
        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        // One is the initial creation, the other is an idempotent response
        const messages = [res1.body.data.message, res2.body.data.message];
        expect(messages.some((m) => m && m.includes('already processed'))).toBe(true);

        const subId = res1.body.data.id;
        expect(res2.body.data.id).toBe(subId);
        createdSubscriptionIds.push(subId);

        // Verify in PostgreSQL: exactly one subscription record exists with this paymentId
        const count = await prisma.subscription.count({
          where: { paymentId: racePaymentId },
        });
        expect(count).toBe(1);
      });

      it('Scenario 12: Two concurrent successful purchases using different payment IDs preserve the single active subscription invariant', async () => {
        const payA = `pay_conc_a_${Date.now()}`;
        const payB = `pay_conc_b_${Date.now()}`;
        const orderA = `order_conc_a_${Date.now()}`;
        const orderB = `order_conc_b_${Date.now()}`;
        const sigA = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${orderA}|${payA}`)
          .digest('hex');
        const sigB = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${orderB}|${payB}`)
          .digest('hex');

        razorpayClient.setPaymentAdapter(async (id: string) => ({
          id,
          orderId: id === payA ? orderA : orderB,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        const [resA, resB] = await Promise.all([
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planBasicId,
              razorpayOrderId: orderA,
              razorpayPaymentId: payA,
              razorpaySignature: sigA,
            }),
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planBasicId,
              razorpayOrderId: orderB,
              razorpayPaymentId: payB,
              razorpaySignature: sigB,
            }),
        ]);

        expect(resA.status).toBe(200);
        expect(resB.status).toBe(200);
        createdSubscriptionIds.push(resA.body.data.id, resB.body.data.id);

        // Verify in PostgreSQL: User has exactly ONE ACTIVE subscription; the other is REPLACED
        const activeSubs = await prisma.subscription.findMany({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(activeSubs.length).toBe(1);

        // Both payment records are preserved in history
        const historySubs = await prisma.subscription.findMany({
          where: { userId: memCustomer1.id, paymentId: { in: [payA, payB] } },
        });
        expect(historySubs.length).toBe(2);
      });

      it('Scenario 13: Concurrent same-plan renewal and different-plan purchase serialize without conflicts', async () => {
        const payRenew = `pay_conc_renew_${Date.now()}`;
        const payUpgrade = `pay_conc_upg_${Date.now()}`;
        const orderRenew = `order_conc_renew_${Date.now()}`;
        const orderUpgrade = `order_conc_upg_${Date.now()}`;
        const sigRenew = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${orderRenew}|${payRenew}`)
          .digest('hex');
        const sigUpgrade = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${orderUpgrade}|${payUpgrade}`)
          .digest('hex');

        razorpayClient.setPaymentAdapter(async (id: string) => {
          if (id === payRenew) {
            return {
              id,
              orderId: orderRenew,
              amount: 49900,
              currency: 'INR',
              status: 'captured',
              notes: {
                userId: memCustomer1.id,
                planId: planBasicId,
                type: 'membership_subscription',
              },
            };
          }
          return {
            id,
            orderId: orderUpgrade,
            amount: 199900,
            currency: 'INR',
            status: 'captured',
            notes: {
              userId: memCustomer1.id,
              planId: planProId,
              type: 'membership_subscription',
            },
          };
        });

        const [renewRes, upgRes] = await Promise.all([
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planBasicId,
              razorpayOrderId: orderRenew,
              razorpayPaymentId: payRenew,
              razorpaySignature: sigRenew,
            }),
          request(app)
            .post('/api/v1/memberships/subscribe')
            .set('Authorization', `Bearer ${memCustomer1Token}`)
            .send({
              planId: planProId,
              razorpayOrderId: orderUpgrade,
              razorpayPaymentId: payUpgrade,
              razorpaySignature: sigUpgrade,
            }),
        ]);

        expect(renewRes.status).toBe(200);
        expect(upgRes.status).toBe(200);
        createdSubscriptionIds.push(renewRes.body.data.id, upgRes.body.data.id);

        // Verify in PostgreSQL: Exactly one subscription remains ACTIVE
        const activeSubs = await prisma.subscription.findMany({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(activeSubs.length).toBe(1);
      });

      it('Scenario 14: Failed transaction rolls back atomically without partial replacement or history mutation', async () => {
        // Read current active subscription
        const priorSub = await prisma.subscription.findFirst({
          where: { userId: memCustomer1.id, status: SubscriptionStatus.ACTIVE },
        });
        expect(priorSub).toBeDefined();

        const failPaymentId = `pay_fail_tx_${Date.now()}`;
        const failOrderId = `order_fail_tx_${Date.now()}`;
        const failSig = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${failOrderId}|${failPaymentId}`)
          .digest('hex');

        razorpayClient.setPaymentAdapter(async (id: string) => ({
          id,
          orderId: failOrderId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        // Force an error inside the transaction by mocking auditService.record to reject
        const auditSpy = vi.spyOn(auditService, 'record').mockRejectedValueOnce(
          new Error('Simulated audit write failure for atomicity test'),
        );

        const failRes = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({
            planId: planBasicId,
            razorpayOrderId: failOrderId,
            razorpayPaymentId: failPaymentId,
            razorpaySignature: failSig,
          });

        expect(failRes.status).toBe(500);

        // Verify in PostgreSQL: prior subscription remains ACTIVE, NOT REPLACED
        const priorInDb = await prisma.subscription.findUnique({
          where: { id: priorSub!.id },
        });
        expect(priorInDb?.status).toBe(SubscriptionStatus.ACTIVE);
        expect(priorInDb?.replacedAt).toBeNull();

        // Verify no orphan subscription was created with failPaymentId
        const orphanSub = await prisma.subscription.findUnique({
          where: { paymentId: failPaymentId },
        });
        expect(orphanSub).toBeNull();

        auditSpy.mockRestore();
      });

      it('Scenario 15: Cross-user duplicate payment replay fails closed with 409 CONFLICT in PostgreSQL', async () => {
        const sharedPaymentId = `pay_shared_replay_${Date.now()}`;
        const sharedOrderId = `order_shared_replay_${Date.now()}`;
        const sharedSig = crypto
          .createHmac('sha256', testRazorpaySecret)
          .update(`${sharedOrderId}|${sharedPaymentId}`)
          .digest('hex');

        razorpayClient.setPaymentAdapter(async (id: string) => ({
          id,
          orderId: sharedOrderId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: memCustomer1.id,
            planId: planBasicId,
            type: 'membership_subscription',
          },
        }));

        // Customer 1 purchases subscription with sharedPaymentId
        const cust1Res = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer1Token}`)
          .send({
            planId: planBasicId,
            razorpayOrderId: sharedOrderId,
            razorpayPaymentId: sharedPaymentId,
            razorpaySignature: sharedSig,
          });
        expect(cust1Res.status).toBe(200);
        createdSubscriptionIds.push(cust1Res.body.data.id);

        // Customer 2 attempts to claim the exact same paymentId
        const cust2Res = await request(app)
          .post('/api/v1/memberships/subscribe')
          .set('Authorization', `Bearer ${memCustomer2Token}`)
          .send({
            planId: planBasicId,
            razorpayOrderId: sharedOrderId,
            razorpayPaymentId: sharedPaymentId,
            razorpaySignature: sharedSig,
          });

        expect(cust2Res.status).toBe(409);
        expect(cust2Res.body.error.code).toBe('CONFLICT');
        expect(cust2Res.body.error.message).toContain('already been applied to another subscription or user');

        // Verify in PostgreSQL: Customer 2 has no subscription with sharedPaymentId
        const cust2Sub = await prisma.subscription.findFirst({
          where: { userId: memCustomer2.id, paymentId: sharedPaymentId },
        });
        expect(cust2Sub).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Public QR Resolver Integration Suite
  // Tests run against the real fioner_test PostgreSQL database.
  // Creates its own isolated fixtures and cleans them up after each test.
  // ==========================================================================
  describe('Public QR Resolver (GET /api/v1/qr/:code)', () => {
    // Ids tracked for cleanup
    const pubQrIds: string[] = [];
    const pubVehicleIds: string[] = [];
    const pubUserIds: string[] = [];
    const pubScanLogIds: string[] = [];

    // Create a minimal user + vehicle + QR code in the test DB
    async function createFixture(
      overrides: { qrStatus?: 'AVAILABLE' | 'ASSIGNED' | 'ACTIVE' | 'SUSPENDED' | 'REPLACED' | 'DEACTIVATED'; linkVehicle?: boolean } = {},
    ) {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const userId = `pubqr_user_${suffix}`;
      const vehicleId = `pubqr_veh_${suffix}`;
      const qrCode = `PUBTEST-${suffix.toUpperCase().slice(0, 8)}`;
      const qrId = `pubqr_qr_${suffix}`;

      // Insert user
      await prisma.$executeRawUnsafe(
        `INSERT INTO "users" ("id","email","passwordHash","firstName","lastName","isActive","isSuperAdmin","createdAt","updatedAt")
         VALUES ($1,$2,'$2b$12$placeholder','PubQr','User',true,false,NOW(),NOW())`,
        userId,
        `pubqr_${suffix}@fioner.test`,
      );
      pubUserIds.push(userId);

      // Insert vehicle
      await prisma.$executeRawUnsafe(
        `INSERT INTO "vehicles" ("id","userId","reg","model","fuel","isDefault","createdAt","updatedAt")
         VALUES ($1,$2,$3,'TestModel','PETROL',false,NOW(),NOW())`,
        vehicleId,
        userId,
        `PQ${suffix.slice(0, 6).toUpperCase()}`,
      );
      pubVehicleIds.push(vehicleId);

      const status = overrides.qrStatus ?? 'ACTIVE';
      const linkedVehicleId = overrides.linkVehicle !== false && status !== 'REPLACED' && status !== 'DEACTIVATED' && status !== 'AVAILABLE' ? vehicleId : null;

      // Insert QR code
      if (linkedVehicleId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "qr_codes" ("id","code","batch","status","vehicleId","scansCount","createdAt","updatedAt")
           VALUES ($1,$2,'BATCH-PUBTEST',$3::\"QrStatus\",$4,0,NOW(),NOW())`,
          qrId,
          qrCode,
          status,
          linkedVehicleId,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "qr_codes" ("id","code","batch","status","scansCount","createdAt","updatedAt")
           VALUES ($1,$2,'BATCH-PUBTEST',$3::\"QrStatus\",0,NOW(),NOW())`,
          qrId,
          qrCode,
          status,
        );
      }
      pubQrIds.push(qrId);

      return { userId, vehicleId, qrId, qrCode };
    }

    afterEach(async () => {
      // Clean up only records created by this suite, in dependency order
      if (pubScanLogIds.length > 0) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "qr_scan_logs" WHERE "id" = ANY($1::text[])`,
          pubScanLogIds,
        );
        pubScanLogIds.length = 0;
      }
      if (pubQrIds.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "qr_codes" SET "vehicleId" = NULL WHERE "id" = ANY($1::text[])`,
          [...pubQrIds],
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM "qr_codes" WHERE "id" = ANY($1::text[])`,
          [...pubQrIds],
        );
        pubQrIds.length = 0;
      }
      if (pubVehicleIds.length > 0) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "vehicles" WHERE "id" = ANY($1::text[])`,
          [...pubVehicleIds],
        );
        pubVehicleIds.length = 0;
      }
      if (pubUserIds.length > 0) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "users" WHERE "id" = ANY($1::text[])`,
          [...pubUserIds],
        );
        pubUserIds.length = 0;
      }
    });

    it('INT-QR-01: ACTIVE QR resolves with real vehicle data from PostgreSQL', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'ACTIVE', linkVehicle: true });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.vehicle).not.toBeNull();
      expect(res.body.data.vehicle.label).toBeTruthy();
      expect(res.body.data.vehicle.model).toBe('TestModel');
    });

    it('INT-QR-02: ACTIVE QR does not expose owner userId, email, or phone', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'ACTIVE', linkVehicle: true });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('pubqr_user_');
      expect(body).not.toContain('@fioner.test');
      expect(body).not.toContain('userId');
      expect(body).not.toContain('phone');
      expect(body).not.toContain('vehicleId');
    });

    it('INT-QR-03: ACTIVE QR records a scan log in PostgreSQL', async () => {
      const { qrId, qrCode } = await createFixture({ qrStatus: 'ACTIVE', linkVehicle: true });

      await request(app)
        .get(`/api/v1/qr/${qrCode}`)
        .set('User-Agent', 'INT-QR-Test/1.0');

      // Wait a brief moment for the fire-and-forget log write
      await new Promise((r) => setTimeout(r, 150));

      const logs = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "qr_scan_logs" WHERE "qrCodeId" = ${qrId}
      `;
      expect(logs.length).toBeGreaterThan(0);
      // Track for cleanup
      logs.forEach((l) => pubScanLogIds.push(l.id));
    });

    it('INT-QR-04: SUSPENDED QR returns status=suspended, no vehicle data', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'SUSPENDED', linkVehicle: true });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('INT-QR-05: ASSIGNED QR returns status=inactive, no vehicle data', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'ASSIGNED', linkVehicle: true });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('INT-QR-06: REPLACED QR returns status=inactive, null vehicle (no stale data leak)', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'REPLACED', linkVehicle: false });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('INT-QR-07: DEACTIVATED QR returns status=inactive, null vehicle', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'DEACTIVATED', linkVehicle: false });

      const res = await request(app).get(`/api/v1/qr/${qrCode}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('INT-QR-08: Unknown code returns not_found without writing a scan log', async () => {
      const neverExistingCode = `NEVER-${Date.now()}`;

      const countBefore = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM "qr_scan_logs" WHERE "qrCodeValue" = ${neverExistingCode}
      `;

      const res = await request(app).get(`/api/v1/qr/${neverExistingCode}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('not_found');

      await new Promise((r) => setTimeout(r, 100));

      const countAfter = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM "qr_scan_logs" WHERE "qrCodeValue" = ${neverExistingCode}
      `;
      expect(Number(countAfter[0]?.count)).toBe(Number(countBefore[0]?.count));
    });

    it('INT-QR-09: No auth token required — anonymous access works', async () => {
      const { qrCode } = await createFixture({ qrStatus: 'ACTIVE', linkVehicle: true });

      const res = await request(app)
        .get(`/api/v1/qr/${qrCode}`)
        // deliberately no Authorization header
      ;

      expect(res.status).toBe(200);
    });

    it('INT-QR-10: Malformed code returns 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/qr/X');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
