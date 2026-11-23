import { prisma } from '../../../config/database';
import { syncUserToCustomer } from '../../../common/utils/customerSync';
import { ApiError } from '../../../common/utils/apiError';

export const appProfileService = {
  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; email?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });
    
    // Sync to CRM Customer record in the background
    syncUserToCustomer(userId).catch(console.error);
    return user;
  },

  async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async syncAddresses(userId: string, addresses: any[]) {
    await prisma.address.deleteMany({ where: { userId } });
    if (addresses && addresses.length > 0) {
      await prisma.address.createMany({
        data: addresses.map((data) => ({
          userId,
          type: data.type || 'HOME',
          address: data.address || '',
          landmark: data.landmark || null,
          city: data.city || 'Delhi',
          state: data.state || 'Delhi',
          pincode: data.pincode || '110001',
          isDefault: data.isDefault ?? false,
        })),
      });
    }
    
    // Sync to CRM Customer record in the background
    syncUserToCustomer(userId).catch(console.error);
    return this.getAddresses(userId);
  },

  async getEmergencyContacts(userId: string) {
    return prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async syncEmergencyContacts(userId: string, contacts: any[]) {
    await prisma.emergencyContact.deleteMany({ where: { userId } });
    if (contacts && contacts.length > 0) {
      await prisma.emergencyContact.createMany({
        data: contacts.map((data) => {
          const name = data.name || 'Emergency Contact';
          const initials = data.initials || (name.length >= 2 ? name.substring(0, 2).toUpperCase() : 'EC');
          return {
            userId,
            name,
            phone: data.phone || '',
            initials,
            isPrimary: data.isPrimary ?? false,
            email: data.email || null,
            relationship: data.relationship || 'Family',
            sendSmsGps: data.sendSmsGps ?? true,
            shareTelemetry: data.shareTelemetry ?? true,
          };
        }),
      });
    }
    
    // Sync to CRM Customer record in the background
    syncUserToCustomer(userId).catch(console.error);
    return this.getEmergencyContacts(userId);
  },

  async deleteAccount(userId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const timestamp = Date.now();
    const randomizedSuffix = Math.random().toString(36).substring(2, 7);
    const anonymizedEmail = `deleted_${timestamp}_${randomizedSuffix}@anonymized.carq.in`;

    await prisma.$transaction(async (tx) => {
      // 1. Revoke all active sessions/refresh tokens
      await tx.refreshToken.deleteMany({ where: { userId } });

      // 2. Anonymize user PII and mark inactive
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: anonymizedEmail,
          phone: null,
          firstName: 'Deleted',
          lastName: 'User',
          avatarUrl: null,
        },
      });

      // 3. Deactivate & release user's QR codes
      await tx.qrCode.updateMany({
        where: { userId },
        data: {
          isActive: false,
          status: 'DEACTIVATED',
          userId: null,
          vehicleId: null,
        },
      });

      // 4. Delete user's vehicles and associated documents (cascading)
      await tx.vehicle.deleteMany({
        where: { userId },
      });

      // 5. Delete addresses and emergency contacts
      await tx.emergencyContact.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });

      // 6. Record audit log entry
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'user.account_deleted_self_service',
          entity: 'User',
          entityId: userId,
          metadata: {
            reason: reason || 'User initiated account deletion via CarQConnect Mobile App',
            deletedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 7. Sync deletion to CRM customer records
    syncUserToCustomer(userId).catch(console.error);

    return {
      success: true,
      message: 'Your account has been deleted and personal data permanently anonymized.',
    };
  },
};
