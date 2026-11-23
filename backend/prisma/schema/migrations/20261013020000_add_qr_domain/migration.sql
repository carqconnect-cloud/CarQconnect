-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ACTIVE', 'SUSPENDED', 'REPLACED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'AVAILABLE',
    "vehicleId" TEXT,
    "scansCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_assignment_history" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "userId" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scan_logs" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "city" TEXT,
    "actionTaken" TEXT,
    "metadata" JSONB,

    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_vehicleId_key" ON "qr_codes"("vehicleId");

-- CreateIndex
CREATE INDEX "qr_codes_code_idx" ON "qr_codes"("code");

-- CreateIndex
CREATE INDEX "qr_codes_batch_idx" ON "qr_codes"("batch");

-- CreateIndex
CREATE INDEX "qr_codes_status_idx" ON "qr_codes"("status");

-- CreateIndex
CREATE INDEX "qr_codes_createdAt_idx" ON "qr_codes"("createdAt");

-- CreateIndex
CREATE INDEX "qr_assignment_history_qrCodeId_idx" ON "qr_assignment_history"("qrCodeId");

-- CreateIndex
CREATE INDEX "qr_assignment_history_vehicleId_idx" ON "qr_assignment_history"("vehicleId");

-- CreateIndex
CREATE INDEX "qr_assignment_history_userId_idx" ON "qr_assignment_history"("userId");

-- CreateIndex
CREATE INDEX "qr_assignment_history_assignedAt_idx" ON "qr_assignment_history"("assignedAt");

-- CreateIndex
CREATE INDEX "qr_scan_logs_qrCodeId_idx" ON "qr_scan_logs"("qrCodeId");

-- CreateIndex
CREATE INDEX "qr_scan_logs_scannedAt_idx" ON "qr_scan_logs"("scannedAt");

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assignment_history" ADD CONSTRAINT "qr_assignment_history_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assignment_history" ADD CONSTRAINT "qr_assignment_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assignment_history" ADD CONSTRAINT "qr_assignment_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
