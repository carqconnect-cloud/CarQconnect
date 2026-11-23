-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fuel" "FuelType" NOT NULL,
    "mileage" DOUBLE PRECISION,
    "docExpiry" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_userId_idx" ON "vehicles"("userId");
CREATE INDEX "vehicles_reg_idx" ON "vehicles"("reg");
CREATE INDEX "vehicles_fuel_idx" ON "vehicles"("fuel");
CREATE INDEX "vehicles_docExpiry_idx" ON "vehicles"("docExpiry");
CREATE INDEX "vehicles_createdAt_idx" ON "vehicles"("createdAt");
CREATE UNIQUE INDEX "vehicles_userId_reg_key" ON "vehicles"("userId", "reg");

-- CreateIndex
CREATE INDEX "vehicle_documents_vehicleId_idx" ON "vehicle_documents"("vehicleId");
CREATE INDEX "vehicle_documents_expiryDate_idx" ON "vehicle_documents"("expiryDate");
CREATE UNIQUE INDEX "vehicle_documents_vehicleId_type_key" ON "vehicle_documents"("vehicleId", "type");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
