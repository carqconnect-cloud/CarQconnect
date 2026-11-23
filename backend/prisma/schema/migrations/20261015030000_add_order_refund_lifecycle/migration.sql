-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PENDING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentId" TEXT,
ADD COLUMN "refundId" TEXT;

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "paymentId" TEXT,
    "gatewayRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_refunds_gatewayRefundId_key" UNIQUE ("gatewayRefundId"),
    CONSTRAINT "order_refunds_idempotencyKey_key" UNIQUE ("idempotencyKey"),
    CONSTRAINT "order_refunds_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "order_refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_refundId_key" ON "orders"("refundId");

-- CreateIndex
CREATE INDEX "orders_paymentId_idx" ON "orders"("paymentId");

-- CreateIndex
CREATE INDEX "order_refunds_orderId_idx" ON "order_refunds"("orderId");

-- CreateIndex
CREATE INDEX "order_refunds_status_idx" ON "order_refunds"("status");

-- CreateIndex
CREATE INDEX "order_refunds_gatewayRefundId_idx" ON "order_refunds"("gatewayRefundId");
