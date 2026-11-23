-- CreateEnum
CREATE TYPE "GpsDeviceStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'MAINTENANCE', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "gps_devices" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "serialNumber" TEXT,
    "model" TEXT,
    "vendor" TEXT,
    "status" "GpsDeviceStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "vehicleId" TEXT,
    "batteryLevel" INTEGER,
    "signalStrength" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gps_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_device_history" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceImei" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleReg" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_device_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gps_devices_imei_key" ON "gps_devices"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "gps_devices_serialNumber_key" ON "gps_devices"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "gps_devices_vehicleId_key" ON "gps_devices"("vehicleId");

-- CreateIndex
CREATE INDEX "gps_devices_imei_idx" ON "gps_devices"("imei");

-- CreateIndex
CREATE INDEX "gps_devices_serialNumber_idx" ON "gps_devices"("serialNumber");

-- CreateIndex
CREATE INDEX "gps_devices_status_idx" ON "gps_devices"("status");

-- CreateIndex
CREATE INDEX "gps_devices_createdAt_idx" ON "gps_devices"("createdAt");

-- CreateIndex
CREATE INDEX "gps_device_history_deviceId_idx" ON "gps_device_history"("deviceId");

-- CreateIndex
CREATE INDEX "gps_device_history_deviceImei_idx" ON "gps_device_history"("deviceImei");

-- CreateIndex
CREATE INDEX "gps_device_history_vehicleId_idx" ON "gps_device_history"("vehicleId");

-- CreateIndex
CREATE INDEX "gps_device_history_vehicleReg_idx" ON "gps_device_history"("vehicleReg");

-- CreateIndex
CREATE INDEX "gps_device_history_userId_idx" ON "gps_device_history"("userId");

-- CreateIndex
CREATE INDEX "gps_device_history_assignedAt_idx" ON "gps_device_history"("assignedAt");

-- CreateIndex
CREATE INDEX "geofences_vehicleId_idx" ON "geofences"("vehicleId");

-- CreateIndex
CREATE INDEX "geofences_isActive_idx" ON "geofences"("isActive");

-- AddForeignKey
ALTER TABLE "gps_devices" ADD CONSTRAINT "gps_devices_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_device_history" ADD CONSTRAINT "gps_device_history_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "gps_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_device_history" ADD CONSTRAINT "gps_device_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_device_history" ADD CONSTRAINT "gps_device_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
