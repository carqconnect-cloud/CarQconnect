import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { syncUserToCustomer } from '../../../common/utils/customerSync';
import type { CreateReminderInput, UpdateReminderInput } from './reminders.schema';

export const remindersService = {
  async getAllReminders(userId: string) {
    // 1. Get explicit reminders
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    // 2. Get expiring documents that have reminders enabled
    const documents = await prisma.document.findMany({
      where: {
        userId,
        reminderEnabled: true,
        expiryDate: { not: null },
      },
    });

    // 3. Map documents to reminder format
    const docReminders = documents.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      title: doc.title,
      description: `Document expires soon. ${doc.subtitle ?? ''}`.trim(),
      type: doc.docType,
      date: doc.expiryDate!, // not null from query
      time: null,
      isActive: doc.status !== 'EXPIRED',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    // 4. Combine and sort
    const allReminders = [...reminders, ...docReminders].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );

    return allReminders;
  },

  async getReminderById(userId: string, id: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
    });
    if (!reminder) {
      throw ApiError.notFound('Reminder not found');
    }
    return reminder;
  },

  async createReminder(userId: string, data: CreateReminderInput) {
    const reminder = await prisma.reminder.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'general',
        date: new Date(data.date),
        time: data.time ?? null,
        isActive: data.isActive ?? true,
        userId,
      },
    });
    syncUserToCustomer(userId).catch(console.error);
    return reminder;
  },

  async updateReminder(userId: string, id: string, data: UpdateReminderInput) {
    const reminder = await this.getReminderById(userId, id);
    
    // Build update payload
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.time !== undefined) updateData.time = data.time;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.reminder.update({
      where: { id: reminder.id },
      data: updateData,
    });
    syncUserToCustomer(userId).catch(console.error);
    return updated;
  },

  async deleteReminder(userId: string, id: string) {
    const reminder = await this.getReminderById(userId, id);
    await prisma.reminder.delete({
      where: { id: reminder.id },
    });
    syncUserToCustomer(userId).catch(console.error);
  },
};
