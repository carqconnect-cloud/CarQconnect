-- CreateEnum
CREATE TYPE "SosEventStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- CreateTable
CREATE TABLE "sos_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "vehicleReg" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "status" "SosEventStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_event_contacts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_event_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_timeline_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_timeline_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sos_events_status_idx" ON "sos_events"("status");
CREATE INDEX "sos_events_userId_idx" ON "sos_events"("userId");
CREATE INDEX "sos_events_organizationId_idx" ON "sos_events"("organizationId");
CREATE INDEX "sos_events_createdAt_idx" ON "sos_events"("createdAt");
CREATE UNIQUE INDEX "sos_events_user_active_unique" ON "sos_events"("userId") WHERE "status" IN ('PENDING', 'ACKNOWLEDGED', 'ESCALATED');
CREATE INDEX "sos_contacts_userId_idx" ON "sos_contacts"("userId");
CREATE INDEX "sos_event_contacts_eventId_idx" ON "sos_event_contacts"("eventId");
CREATE INDEX "sos_timeline_items_eventId_idx" ON "sos_timeline_items"("eventId");

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sos_contacts" ADD CONSTRAINT "sos_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_event_contacts" ADD CONSTRAINT "sos_event_contacts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "sos_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_timeline_items" ADD CONSTRAINT "sos_timeline_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "sos_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_timeline_items" ADD CONSTRAINT "sos_timeline_items_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
