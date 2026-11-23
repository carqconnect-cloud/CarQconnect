-- DropIndex
DROP INDEX IF EXISTS "subscriptions_paymentId_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_paymentId_key" ON "subscriptions"("paymentId");
