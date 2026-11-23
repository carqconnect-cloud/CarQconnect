import { prisma } from '../../../config/database';
import { syncUserToCustomer } from '../../../common/utils/customerSync';
import { notificationsService } from '../notifications/notifications.service';

export interface CreateTripDto {
  fromName: string;
  fromLat: number;
  fromLng: number;
  toName: string;
  toLat: number;
  toLng: number;
  distance?: string;
  duration?: string;
  viaRoute?: string;
  preference?: string;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  geometry?: any;
  status?: string;
}

async function addTripNotification(
  userId: string,
  title: string,
  description: string
) {
  try {
    await notificationsService.createNotification(userId, {
      title,
      description,
      type: 'trip',
      isUnread: true,
    });
  } catch (err: any) {
    console.warn('[tripsService] notification create warning, attempting raw fallback:', err?.message || err);
    try {
      const nid = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await prisma.$queryRawUnsafe(
        `INSERT INTO "notifications" ("id", "user_id", "title", "description", "type", "isUnread", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        nid,
        userId,
        title,
        description,
        'trip',
        true
      );
    } catch (rawErr) {
      console.error('[tripsService] Failed to insert notification in database:', rawErr);
    }
  }
}

export const tripsService = {
  async getTrips(userId: string) {
    const trips = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "trips" WHERE "userId" = $1 ORDER BY "createdAt" DESC;`,
      userId
    );
    return trips;
  },

  async getTripById(userId: string, tripId: string) {
    const trips = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "trips" WHERE "id" = $1 AND "userId" = $2 LIMIT 1;`,
      tripId,
      userId
    );
    return trips[0] || null;
  },

  async createTrip(userId: string, data: CreateTripDto) {
    const id = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const geomJson = data.geometry ? JSON.stringify(data.geometry) : null;
    const status = data.status ?? 'PLANNED';

    await prisma.$queryRawUnsafe(
      `INSERT INTO "trips" (
        "id", "userId", "fromName", "fromLat", "fromLng", 
        "toName", "toLat", "toLng", "distance", "duration", 
        "viaRoute", "preference", "avoidTolls", "avoidHighways", 
        "geometry", "status", "startedAt", "completedAt", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, 
        $15::jsonb, $16,
        CASE WHEN $16 IN ('ACTIVE', 'COMPLETED') THEN NOW() ELSE NULL END,
        CASE WHEN $16 = 'COMPLETED' THEN NOW() ELSE NULL END,
        NOW(), NOW()
      );`,
      id,
      userId,
      data.fromName,
      data.fromLat,
      data.fromLng,
      data.toName,
      data.toLat,
      data.toLng,
      data.distance || null,
      data.duration || null,
      data.viaRoute || null,
      data.preference || 'Fastest',
      data.avoidTolls ?? false,
      data.avoidHighways ?? false,
      geomJson,
      status
    );

    // Sync trips count to CRM customer profile
    syncUserToCustomer(userId).catch(console.error);

    // Auto-create notification for trip event
    if (status === 'ACTIVE') {
      addTripNotification(
        userId,
        `Trip Started: ${data.toName}`,
        `Heading to ${data.toName}${data.distance ? ` (${data.distance})` : ''} via ${data.viaRoute || 'selected route'}. Drive safe!`
      ).catch(console.error);
    } else if (status === 'COMPLETED') {
      addTripNotification(
        userId,
        `Trip Completed: ${data.toName}`,
        `You arrived at ${data.toName}! Total distance: ${data.distance || 'N/A'}.`
      ).catch(console.error);
    } else {
      addTripNotification(
        userId,
        `Trip Planned: ${data.fromName} → ${data.toName}`,
        `Your trip to ${data.toName} via ${data.viaRoute || 'selected route'}${data.distance ? ` (${data.distance})` : ''} is planned and saved.`
      ).catch(console.error);
    }

    return this.getTripById(userId, id);
  },

  async updateTripStatus(userId: string, tripId: string, status: string) {
    let extraClause = '';
    if (status === 'ACTIVE') {
      extraClause = `, "startedAt" = COALESCE("startedAt", NOW())`;
    } else if (status === 'COMPLETED') {
      extraClause = `, "completedAt" = NOW()`;
    }

    await prisma.$queryRawUnsafe(
      `UPDATE "trips" SET "status" = $1, "updatedAt" = NOW() ${extraClause} WHERE "id" = $2 AND "userId" = $3;`,
      status,
      tripId,
      userId
    );

    syncUserToCustomer(userId).catch(console.error);

    const trip = await this.getTripById(userId, tripId);
    if (trip) {
      if (status === 'ACTIVE') {
        addTripNotification(
          userId,
          `Trip Started: ${trip.toName}`,
          `Heading to ${trip.toName}${trip.distance ? ` (${trip.distance})` : ''}. Drive safe!`
        ).catch(console.error);
      } else if (status === 'COMPLETED') {
        addTripNotification(
          userId,
          `Trip Completed: ${trip.toName}`,
          `You reached ${trip.toName}! Total distance: ${trip.distance || 'N/A'}, duration: ${trip.duration || 'N/A'}.`
        ).catch(console.error);
      }
    }

    return trip;
  },

  async deleteTrip(userId: string, tripId: string) {
    await prisma.$queryRawUnsafe(
      `DELETE FROM "trips" WHERE "id" = $1 AND "userId" = $2;`,
      tripId,
      userId
    );

    syncUserToCustomer(userId).catch(console.error);
    return { success: true };
  },
};
