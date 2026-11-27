import { vehicleDatasetService } from './vehicleDataset.service';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { syncUserToCustomer } from '../../../common/utils/customerSync';
import { vehicleImageService } from './vehicleImage.service';

/**
 * Mobile App service for QR tag assignment, vehicle linking, and public scan interactions.
 */
export const appQrService = {
  async getVehicles(userId: string) {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return vehicles.map((v) => {
      const lowerName = v.name.toLowerCase();
      const imgPath = v.imagePath || '';
      const isMismatched =
        (lowerName.includes('pulsar') && (imgPath.includes('splendor') || imgPath.includes('uqkb0n2xuqdi8f40mwgh'))) ||
        (lowerName.includes('activa') && !imgPath.includes('activa')) ||
        (lowerName.includes('splendor') && !imgPath.includes('splendor') && !imgPath.includes('uqkb0n2xuqdi8f40mwgh'));

      const isCorruptOrPlaceholder = !v.imagePath ||
        imgPath === 'assets/images/white_creta.jpg' ||
        imgPath === 'assets/homescreensicons/carimage.png' ||
        imgPath.includes('wikimedia.org') ||
        imgPath.includes('wikipedia.org') ||
        imgPath.trim() === '' ||
        isMismatched;

      let resolvedFuel = v.fuel as string;
      if (!v.fuel || v.fuel === 'PETROL') {
        const detected = vehicleDatasetService.detectType(v.name);
        resolvedFuel = detected.fuelEnum;
      }
      const fuelDisplay = resolvedFuel === 'ELECTRIC' ? 'EV' : (resolvedFuel === 'CNG' ? 'CNG' : (resolvedFuel ? resolvedFuel.charAt(0) + resolvedFuel.slice(1).toLowerCase() : 'Petrol'));
      if (isCorruptOrPlaceholder) {
        const resolved = vehicleImageService.getSmartFallback(v.name);
        return { ...v, type: fuelDisplay, fuel: resolvedFuel, imagePath: resolved };
      }
      return { ...v, type: fuelDisplay, fuel: resolvedFuel };
    });
  },

  async addVehicle(userId: string, data: { name: string; regNumber: string; fuel?: string; type?: string; imagePath?: string }) {
    let imagePath = data.imagePath;
    if (!imagePath ||
      imagePath === 'assets/images/white_creta.jpg' ||
      imagePath === 'assets/homescreensicons/carimage.png' ||
      imagePath.includes('wikimedia.org') ||
      imagePath.includes('wikipedia.org') ||
      imagePath.trim() === '') {
      imagePath = vehicleImageService.getSmartFallback(data.name);
    }

    let fuelEnum: 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID' = 'PETROL';
    const fuelInput = (data.fuel || data.type || '').toUpperCase();
    if (fuelInput && fuelInput !== 'PETROL') {
      if (fuelInput.includes('ELECTRIC') || fuelInput.includes('EV')) {
        fuelEnum = 'ELECTRIC';
      } else if (fuelInput.includes('DIESEL')) {
        fuelEnum = 'DIESEL';
      } else if (fuelInput.includes('CNG')) {
        fuelEnum = 'CNG';
      } else if (fuelInput.includes('HYBRID')) {
        fuelEnum = 'HYBRID';
      }
    } else {
      const detected = vehicleDatasetService.detectType(data.name);
      fuelEnum = detected.fuelEnum;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        name: data.name,
        regNumber: data.regNumber,
        reg: data.regNumber,
        model: data.name,
        fuel: fuelEnum,
        imagePath,
      },
    });

    // Create a notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Vehicle Added',
        description: `Your vehicle ${data.name} (${data.regNumber}) has been added successfully.`,
        type: 'general',
      }
    });

    syncUserToCustomer(userId).catch(console.error);
    return vehicle;
  },

  async getQrTags(userId: string) {
    const codes = await prisma.qrCode.findMany({
      where: { userId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
    return codes.map((q) => ({
      id: q.id,
      tagId: q.code,
      code: q.code,
      vehicleId: q.vehicleId,
      userId: q.userId,
      callOwner: q.callOwner,
      sendMessage: q.sendMessage,
      bloodGroupVisibility: q.bloodGroupVisibility,
      emergencyContact: q.emergencyContact,
      isActive: q.isActive,
      status: q.status,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      vehicle: q.vehicle,
    }));
  },

  async linkQrTag(userId: string, data: { tagId: string; vehicleId: string }) {
    // Check if tag already linked to another vehicle
    const existing = await prisma.qrCode.findUnique({
      where: { code: data.tagId },
    });
    if (existing && existing.vehicleId && existing.vehicleId !== data.vehicleId) {
      throw ApiError.badRequest('This tag is already linked to another vehicle.');
    }

    const tag = await prisma.qrCode.upsert({
      where: { code: data.tagId },
      create: {
        code: data.tagId,
        vehicleId: data.vehicleId,
        userId,
        batch: 'APP_REGISTERED',
        status: 'ACTIVE',
        isActive: true,
      },
      update: {
        vehicleId: data.vehicleId,
        userId,
        status: 'ACTIVE',
        isActive: true,
      },
      include: { vehicle: true },
    });

    syncUserToCustomer(userId).catch(console.error);
    return {
      ...tag,
      tagId: tag.code,
    };
  },

  async updateQrPrivacy(userId: string, tagId: string, data: any) {
    let tag = await prisma.qrCode.findUnique({
      where: { code: tagId },
    });

    if (!tag) {
      tag = await prisma.qrCode.findUnique({
        where: { id: tagId },
      });
    }

    if (!tag || tag.userId !== userId) {
      throw ApiError.notFound('QR Tag');
    }

    const sanitizedData: Record<string, boolean> = {};
    if (data.callOwner !== undefined) sanitizedData.callOwner = Boolean(data.callOwner);
    if (data.sendMessage !== undefined) sanitizedData.sendMessage = Boolean(data.sendMessage);
    if (data.bloodGroupVisibility !== undefined) sanitizedData.bloodGroupVisibility = Boolean(data.bloodGroupVisibility);
    if (data.emergencyContact !== undefined) sanitizedData.emergencyContact = Boolean(data.emergencyContact);
    if (data.isActive !== undefined) sanitizedData.isActive = Boolean(data.isActive);

    const updated = await prisma.qrCode.update({
      where: { id: tag.id },
      data: sanitizedData,
    });
    return {
      ...updated,
      tagId: updated.code,
    };
  },

  async getPublicTagInfo(tagId: string) {
    let tag = await prisma.qrCode.findUnique({
      where: { code: tagId },
      include: {
        vehicle: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            emergencyContacts: true,
          },
        },
      },
    });

    if (!tag) {
      tag = await prisma.qrCode.findUnique({
        where: { id: tagId },
        include: {
          vehicle: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              emergencyContacts: true,
            },
          },
        },
      });
    }

    if (!tag) {
      throw ApiError.notFound('QR Tag not found');
    }

    if (!tag.isActive) {
      throw ApiError.badRequest('This tag is currently inactive.');
    }

    // Increment scan count asynchronously
    prisma.qrCode.update({
      where: { id: tag.id },
      data: { scansCount: { increment: 1 } },
    }).catch(() => {});

    // Filter sensitive info based on privacy settings
    const hasEmergency = Boolean(tag.emergencyContact);

    const responseData = {
      vehicle: {
        name: tag.vehicle?.name || tag.vehicle?.model,
        regNumber: tag.vehicle?.regNumber || tag.vehicle?.reg,
      },
      ownerName: tag.user?.firstName ? `${tag.user.firstName} ${tag.user.lastName || ''}`.trim() : 'Owner',
      callEnabled: Boolean(tag.callOwner),
      messageEnabled: Boolean(tag.sendMessage),
      bloodGroup: tag.bloodGroupVisibility ? ((tag.user as any)?.bloodGroup || 'O+') : null,
      emergencyContactEnabled: hasEmergency,
      supportPhone: process.env.EXOTEL_VIRTUAL_NUMBER || '09513886363',
      supportMessage: 'CarQConnect 24x7 Helpline',
    };

    return responseData;
  },

  async initiateMaskedCall(tagId: string, callerPhone: string, targetType: 'owner' | 'emergency' = 'owner') {
    let tag = await prisma.qrCode.findUnique({
      where: { code: tagId },
      include: {
        user: {
          include: {
            emergencyContacts: true,
          },
        },
        vehicle: true,
      },
    });

    if (!tag) {
      tag = await prisma.qrCode.findUnique({
        where: { id: tagId },
        include: {
          user: {
            include: {
              emergencyContacts: true,
            },
          },
          vehicle: true,
        },
      });
    }

    if (!tag || !tag.isActive) {
      throw ApiError.badRequest('Invalid or inactive tag');
    }

    let targetPhone = tag.user?.phone;

    if (targetType === 'emergency') {
      if (tag.emergencyContact === false) {
        throw ApiError.badRequest('Owner has disabled emergency contact calls');
      }
      const emergencyContacts = (tag.user?.emergencyContacts as any[]) || [];
      if (emergencyContacts.length > 0 && emergencyContacts[0]?.phone) {
        targetPhone = emergencyContacts[0].phone;
      } else {
        targetPhone = tag.user?.phone;
      }
    } else {
      if (tag.callOwner === false) {
        throw ApiError.badRequest('Owner has disabled direct calls');
      }
    }

    if (!targetPhone) {
      throw ApiError.badRequest(
        targetType === 'emergency'
          ? 'Emergency contact number is not available'
          : 'Vehicle owner phone number is not available'
      );
    }

    // Format phone numbers (standard 10-digit Indian numbers get leading 0 if needed by Exotel)
    let formattedCaller = callerPhone.trim().replace(/\s+/g, '');
    if (!formattedCaller.startsWith('+') && !formattedCaller.startsWith('0') && formattedCaller.length === 10) {
      formattedCaller = '0' + formattedCaller;
    }

    let formattedTarget = targetPhone.trim().replace(/\s+/g, '');
    if (!formattedTarget.startsWith('+') && !formattedTarget.startsWith('0') && formattedTarget.length === 10) {
      formattedTarget = '0' + formattedTarget;
    }

    const exotelApiKey = process.env.API_Key?.trim();
    const exotelApiToken = process.env.API_Token?.trim();
    const exotelSubdomain = process.env.Subdomain?.trim();

    const exotelCallerId = (process.env.EXOTEL_VIRTUAL_NUMBER || '09513886363').trim();
    const exotelAccountSid = (process.env.EXOTEL_ACCOUNT_SID || process.env.API_Key || '').trim();

    if (!exotelApiKey || !exotelApiToken || !exotelSubdomain || !exotelAccountSid) {
      throw ApiError.internal('Masked calling is not configured correctly on the server');
    }

    const auth = Buffer.from(`${exotelApiKey}:${exotelApiToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', formattedCaller);
    params.append('To', formattedTarget);
    params.append('CallerId', exotelCallerId);

    const response = await fetch(`https://${exotelSubdomain}/v1/Accounts/${exotelAccountSid}/Calls/connect.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const text = await response.text();
      throw ApiError.internal(`Masked call failed: ${text}`);
    }

    return await response.json();
  },

  async sendMessageToOwner(tagId: string, messageText: string, callerPhone?: string) {
    let tag = await prisma.qrCode.findUnique({
      where: { code: tagId },
      include: { vehicle: true, user: true }
    });

    if (!tag) {
      tag = await prisma.qrCode.findUnique({
        where: { id: tagId },
        include: { vehicle: true, user: true }
      });
    }

    if (!tag || !tag.isActive) {
      throw ApiError.badRequest('Invalid or inactive tag');
    }

    if (tag.sendMessage === false) {
      throw ApiError.badRequest('Owner has disabled messages for this tag');
    }

    const cleanPhone = callerPhone?.trim() || '';
    const maskedSender = cleanPhone.length >= 4
      ? `(from ${cleanPhone.substring(0, 3)}••••${cleanPhone.substring(cleanPhone.length - 2)})`
      : '(anonymous)';

    // Create alert notification for owner if user exists
    let notificationId: string | null = null;
    if (tag.userId) {
      const notification = await prisma.notification.create({
        data: {
          userId: tag.userId,
          title: `Vehicle Alert: ${tag.vehicle?.name || 'Your Vehicle'}`,
          description: `Alert: "${messageText.trim()}" ${maskedSender}`,
          type: 'alert',
        }
      });
      notificationId = notification.id;
    }

    return { sent: true, notificationId };
  }
};
