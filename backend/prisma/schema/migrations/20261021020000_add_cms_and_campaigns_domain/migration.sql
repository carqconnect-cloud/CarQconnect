-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "schedule" VARCHAR(100) NOT NULL DEFAULT 'Not scheduled',
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "targetUrl" TEXT,
    "imageUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "audience" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_status_idx" ON "banners"("status");

-- CreateIndex
CREATE INDEX "notification_campaigns_status_idx" ON "notification_campaigns"("status");

-- CreateIndex
CREATE INDEX "notification_campaigns_channel_idx" ON "notification_campaigns"("channel");
