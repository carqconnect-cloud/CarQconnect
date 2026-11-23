-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('QR', 'GPS', 'HARDWARE', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'DISPATCH', 'RETURN', 'DAMAGE');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 25,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "damaged" INTEGER NOT NULL DEFAULT 0,
    "dispatched" INTEGER NOT NULL DEFAULT 0,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_items_available_check" CHECK ("available" >= 0),
    CONSTRAINT "stock_items_reserved_check" CHECK ("reserved" >= 0),
    CONSTRAINT "stock_items_damaged_check" CHECK ("damaged" >= 0),
    CONSTRAINT "stock_items_dispatched_check" CHECK ("dispatched" >= 0),
    CONSTRAINT "stock_items_returned_check" CHECK ("returned" >= 0)
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_serial_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "imei" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "batch" TEXT,
    "vehicleReg" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_serial_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_name_key" ON "warehouses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_name_idx" ON "warehouses"("name");

-- CreateIndex
CREATE INDEX "warehouses_code_idx" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "stock_items_productId_idx" ON "stock_items"("productId");

-- CreateIndex
CREATE INDEX "stock_items_warehouseId_idx" ON "stock_items"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_productId_warehouseId_key" ON "stock_items"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_movements_productId_idx" ON "inventory_movements"("productId");

-- CreateIndex
CREATE INDEX "inventory_movements_warehouseId_idx" ON "inventory_movements"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements"("type");

-- CreateIndex
CREATE INDEX "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_serial_items_serialNumber_key" ON "inventory_serial_items"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_serial_items_imei_key" ON "inventory_serial_items"("imei");

-- CreateIndex
CREATE INDEX "inventory_serial_items_productId_idx" ON "inventory_serial_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_serial_items_serialNumber_idx" ON "inventory_serial_items"("serialNumber");

-- CreateIndex
CREATE INDEX "inventory_serial_items_imei_idx" ON "inventory_serial_items"("imei");

-- CreateIndex
CREATE INDEX "inventory_serial_items_status_idx" ON "inventory_serial_items"("status");

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serial_items" ADD CONSTRAINT "inventory_serial_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default distribution centers
INSERT INTO "warehouses" ("id", "name", "code", "city", "state", "isActive", "createdAt", "updatedAt")
VALUES
    ('wh_indore', 'Indore DC', 'IND-DC', 'Indore', 'Madhya Pradesh', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_mumbai', 'Mumbai DC', 'MUM-DC', 'Mumbai', 'Maharashtra', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_pune', 'Pune DC', 'PUN-DC', 'Pune', 'Maharashtra', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
