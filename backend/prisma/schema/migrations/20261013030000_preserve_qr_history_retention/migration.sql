-- AlterForeignKey: Drop cascade foreign keys on qr_assignment_history and qr_scan_logs
ALTER TABLE "qr_assignment_history" DROP CONSTRAINT IF EXISTS "qr_assignment_history_qrCodeId_fkey";
ALTER TABLE "qr_scan_logs" DROP CONSTRAINT IF EXISTS "qr_scan_logs_qrCodeId_fkey";

-- AlterTable: Make qrCodeId nullable on historical records to allow retention when QR code record is retired
ALTER TABLE "qr_assignment_history" ALTER COLUMN "qrCodeId" DROP NOT NULL;
ALTER TABLE "qr_scan_logs" ALTER COLUMN "qrCodeId" DROP NOT NULL;

-- AlterTable: Add snapshot columns to retain immutable context even after relations change or are deleted
ALTER TABLE "qr_assignment_history" ADD COLUMN "qrCodeValue" TEXT;
ALTER TABLE "qr_assignment_history" ADD COLUMN "vehicleReg" TEXT;
ALTER TABLE "qr_assignment_history" ADD COLUMN "userEmail" TEXT;

ALTER TABLE "qr_scan_logs" ADD COLUMN "qrCodeValue" TEXT;

-- Backfill snapshot data from existing related tables
UPDATE "qr_assignment_history" h
SET "qrCodeValue" = q."code"
FROM "qr_codes" q
WHERE h."qrCodeId" = q."id" AND h."qrCodeValue" IS NULL;

UPDATE "qr_assignment_history" h
SET "vehicleReg" = v."reg"
FROM "vehicles" v
WHERE h."vehicleId" = v."id" AND h."vehicleReg" IS NULL;

UPDATE "qr_assignment_history" h
SET "userEmail" = u."email"
FROM "users" u
WHERE h."userId" = u."id" AND h."userEmail" IS NULL;

UPDATE "qr_scan_logs" s
SET "qrCodeValue" = q."code"
FROM "qr_codes" q
WHERE s."qrCodeId" = q."id" AND s."qrCodeValue" IS NULL;

UPDATE "qr_assignment_history" SET "qrCodeValue" = COALESCE("qrCodeValue", 'UNKNOWN') WHERE "qrCodeValue" IS NULL;
UPDATE "qr_scan_logs" SET "qrCodeValue" = COALESCE("qrCodeValue", 'UNKNOWN') WHERE "qrCodeValue" IS NULL;

-- Enforce NOT NULL on immutable snapshot identifier
ALTER TABLE "qr_assignment_history" ALTER COLUMN "qrCodeValue" SET NOT NULL;
ALTER TABLE "qr_scan_logs" ALTER COLUMN "qrCodeValue" SET NOT NULL;

-- AddForeignKey: Re-add foreign keys with ON DELETE SET NULL to preserve history
ALTER TABLE "qr_assignment_history" ADD CONSTRAINT "qr_assignment_history_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Snapshot lookup and filtering indexes
CREATE INDEX "qr_assignment_history_qrCodeValue_idx" ON "qr_assignment_history"("qrCodeValue");
CREATE INDEX "qr_assignment_history_vehicleReg_idx" ON "qr_assignment_history"("vehicleReg");
CREATE INDEX "qr_scan_logs_qrCodeValue_idx" ON "qr_scan_logs"("qrCodeValue");
