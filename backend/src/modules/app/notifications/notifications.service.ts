import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { realTimeService } from '../../../common/services/socket.service';
import type { CreateNotificationInput, UpdateNotificationInput } from './notifications.schema';

export const notificationsService = {
  async getAllNotifications(userId: string) {
    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // If user has no trip notifications yet, backfill notifications from existing trips
    const hasTripNotification = notifications.some((n) => n.type === 'trip');
    if (!hasTripNotification) {
      try {
        const trips = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "trips" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 10;`,
          userId
        );
        if (trips && trips.length > 0) {
          for (const trip of trips) {
            const isCompleted = trip.status === 'COMPLETED';
            const isActive = trip.status === 'ACTIVE';
            const title = isCompleted
              ? `Trip Completed: ${trip.toName}`
              : (isActive ? `Trip Started: ${trip.toName}` : `Trip Planned: ${trip.fromName} → ${trip.toName}`);
            const description = isCompleted
              ? `You reached ${trip.toName}! Total distance: ${trip.distance || 'N/A'}, duration: ${trip.duration || 'N/A'}.`
              : (isActive
                  ? `Navigation started towards ${trip.toName}${trip.distance ? ` (${trip.distance})` : ''}. Drive safely!`
                  : `Your trip to ${trip.toName} via ${trip.viaRoute || 'selected route'} (${trip.distance || ''}) is planned and saved.`);

            await prisma.notification.create({
              data: {
                userId,
                title,
                description,
                type: 'trip',
                isUnread: false,
                createdAt: trip.createdAt ? new Date(trip.createdAt) : new Date(),
              },
            }).catch(() => {});
          }

          notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch (err) {
        console.warn('Error auto-syncing trip notifications:', err);
      }
    }

    return notifications;
  },

  async getNotificationById(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    return notification;
  },

  async createNotification(userId: string, data: CreateNotificationInput) {
    const created = await prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    });
    realTimeService.broadcastNotification(userId, {
      id: created.id,
      title: created.title,
      description: created.description,
      type: created.type,
    });
    return created;
  },

  async updateNotification(userId: string, id: string, data: UpdateNotificationInput) {
    const notification = await this.getNotificationById(userId, id);
    return prisma.notification.update({
      where: { id: notification.id },
      data,
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isUnread: true },
      data: { isUnread: false },
    });
  },

  async deleteNotification(userId: string, id: string) {
    const notification = await this.getNotificationById(userId, id);
    await prisma.notification.delete({
      where: { id: notification.id },
    });
  },
};
