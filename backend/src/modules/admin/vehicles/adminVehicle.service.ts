import { ApiError } from '../../../common/utils/apiError';
import { computeReminderStatus } from '../../vehicles/vehicle.service';
import { adminVehicleRepository } from './adminVehicle.repository';
import { ListAdminVehiclesQuery } from './adminVehicle.schema';

/**
 * Super Admin service for vehicle management, QR code linking, and reminder status.
 */
function formatFuelLabel(fuel: string): string {
  switch (fuel) {
    case 'PETROL':
      return 'Petrol';
    case 'DIESEL':
      return 'Diesel';
    case 'CNG':
      return 'CNG';
    case 'ELECTRIC':
      return 'Electric';
    case 'HYBRID':
      return 'Hybrid';
    default:
      return fuel;
  }
}

export const adminVehicleService = {
  async listVehicles(query: ListAdminVehiclesQuery) {
    const { items, total } = await adminVehicleRepository.listVehicles(query);

    const projectedItems = items.map((v) => {
      // Find earliest doc expiry between vehicle.docExpiry and documents
      const docExpiries = [
        ...(v.documents || []).map((d) => (d.expiryDate ? new Date(d.expiryDate).getTime() : null)),
        v.docExpiry ? new Date(v.docExpiry).getTime() : null,
      ].filter((t): t is number => t !== null && !isNaN(t));

      const earliestExpiry = docExpiries.length > 0 ? new Date(Math.min(...docExpiries)) : null;
      const reminder = computeReminderStatus(earliestExpiry);
      const ownerName = `${v.user.firstName || ''} ${v.user.lastName || ''}`.trim() || v.user.email;
      const reg = v.reg || v.regNumber || '—';
      const model = v.model || v.name || '—';
      const qrLinked = Boolean(v.qrCode);
      const qrCodeValue = v.qrCode?.code || null;
      const qrStatus = v.qrCode ? (v.qrCode.isActive ? (v.qrCode.status?.toLowerCase() || 'active') : 'inactive') : null;

      return {
        id: v.id,
        reg,
        model,
        name: v.name,
        regNumber: v.regNumber,
        fuel: formatFuelLabel(v.fuel),
        fuelType: v.fuel,
        ownerId: v.user.id,
        ownerName,
        ownerEmail: v.user.email,
        ownerPhone: v.user.phone,
        mileage: v.mileage,
        isDefault: v.isDefault,
        qrLinked,
        qrCode: qrCodeValue ? { code: qrCodeValue, status: qrStatus, tagId: qrCodeValue } : null,
        qrTag: v.qrCode ? { id: v.qrCode.id, tagId: v.qrCode.code, isActive: v.qrCode.isActive } : null,
        gpsLinked: Boolean(v.gpsDevice),
        gpsDevice: v.gpsDevice,
        docExpiry: earliestExpiry ? earliestExpiry.toISOString() : null,
        reminderStatus: reminder.status,
        reminderLabel: reminder.label,
        daysRemaining: reminder.daysRemaining,
        addedAt: v.createdAt.toISOString(),
        createdAt: v.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      items: projectedItems,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  },

  async getVehicleById(id: string) {
    const v = await adminVehicleRepository.findById(id);
    if (!v) {
      throw ApiError.notFound('Vehicle not found');
    }

    const reg = v.reg || v.regNumber || '—';
    const model = v.model || v.name || '—';
    const ownerName = `${v.user.firstName || ''} ${v.user.lastName || ''}`.trim() || v.user.email;

    // Map vehicle documents from unified documents table
    const combinedDocs = ((v.documents as any[]) || []).map((d: any) => {
      const docReminder = computeReminderStatus(d.expiryDate);
      return {
        id: d.id,
        type: d.docType || d.title || 'Document',
        title: d.title || d.docType || 'Document',
        documentNumber: d.regNumber || d.ownerName || '—',
        expiryDate: d.expiryDate ? (d.expiryDate instanceof Date ? d.expiryDate.toISOString() : new Date(d.expiryDate).toISOString()) : null,
        issueDate: d.issueDate ? (d.issueDate instanceof Date ? d.issueDate.toISOString() : new Date(d.issueDate).toISOString()) : null,
        status: d.status || 'ACTIVE',
        reminderStatus: docReminder.status,
        reminderLabel: docReminder.label,
        daysRemaining: docReminder.daysRemaining,
        notes: d.subtitle || null,
        frontImageUrl: d.frontImageUrl,
        backImageUrl: d.backImageUrl,
        source: 'Vehicle Document',
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString(),
      };
    });

    // Compute earliest document expiry
    const docExpiries = [
      ...combinedDocs.map((d) => (d.expiryDate ? new Date(d.expiryDate).getTime() : null)),
      v.docExpiry ? new Date(v.docExpiry).getTime() : null,
    ].filter((t): t is number => t !== null && !isNaN(t));

    const earliestExpiry = docExpiries.length > 0 ? new Date(Math.min(...docExpiries)) : null;
    const reminder = computeReminderStatus(earliestExpiry);

    // Reminders from user
    const reminders = (v.user.reminders || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      date: r.date ? r.date.toISOString() : null,
      time: r.time,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));

    const qrCode = v.qrCode;
    const qrLinked = Boolean(qrCode);
    const qrCodeValue = qrCode?.code || null;
    const qrStatus = qrCode ? (qrCode.isActive ? (qrCode.status?.toLowerCase() || 'active') : 'inactive') : null;

    const auditLogs = await adminVehicleRepository.findAuditActivity(id);
    const activityTimeline = auditLogs.map((log) => {
      let label = 'Vehicle activity recorded';
      if (log.action === 'vehicle.created') label = 'Vehicle added to garage';
      if (log.action === 'vehicle.updated') label = 'Vehicle details updated';
      if (log.action === 'vehicle.deleted') label = 'Vehicle deleted from garage';

      const actorName = log.actor
        ? `${log.actor.firstName} ${log.actor.lastName}`.trim()
        : 'System';

      return {
        id: log.id,
        action: log.action,
        label,
        actorId: log.actorId,
        actorName,
        createdAt: log.createdAt.toISOString(),
      };
    });

    if (activityTimeline.length === 0) {
      activityTimeline.push({
        id: `tl_${v.id}_created`,
        action: 'vehicle.created',
        label: 'Vehicle added to garage',
        actorId: v.userId,
        actorName: ownerName,
        createdAt: v.createdAt.toISOString(),
      });
    }

    return {
      id: v.id,
      reg,
      model,
      name: v.name,
      regNumber: v.regNumber,
      imagePath: v.imagePath,
      fuel: formatFuelLabel(v.fuel),
      fuelType: v.fuel,
      mileage: v.mileage,
      isDefault: v.isDefault,
      docExpiry: earliestExpiry ? earliestExpiry.toISOString() : null,
      reminderStatus: reminder.status,
      reminderLabel: reminder.label,
      daysRemaining: reminder.daysRemaining,
      addedAt: v.createdAt.toISOString(),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      owner: {
        id: v.user.id,
        firstName: v.user.firstName,
        lastName: v.user.lastName,
        fullName: ownerName,
        email: v.user.email,
        phone: v.user.phone,
      },
      ownerName,
      ownerId: v.user.id,
      ownerEmail: v.user.email,
      ownerPhone: v.user.phone,
      qrLinked,
      qrCode: qrCodeValue ? { code: qrCodeValue, status: qrStatus, tagId: qrCodeValue } : null,
      qrTag: qrCode ? { id: qrCode.id, tagId: qrCode.code, isActive: qrCode.isActive, callOwner: qrCode.callOwner, sendMessage: qrCode.sendMessage, emergencyContact: qrCode.emergencyContact, bloodGroupVisibility: qrCode.bloodGroupVisibility } : null,
      gpsLinked: Boolean(v.gpsDevice),
      gpsDevice: v.gpsDevice,
      documents: combinedDocs,
      reminders,
      links: {
        qr: {
          linked: qrLinked,
          code: qrCodeValue,
          tagId: qrCodeValue,
          status: qrStatus,
          callOwner: qrCode?.callOwner ?? false,
          sendMessage: qrCode?.sendMessage ?? false,
          emergencyContact: qrCode?.emergencyContact ?? false,
          bloodGroupVisibility: qrCode?.bloodGroupVisibility ?? false,
          domainStatus: qrLinked ? 'ACTIVE' : 'NOT_YET_BUILT',
        },
        gps: v.gpsDevice
          ? {
              linked: true,
              id: v.gpsDevice.id,
              imei: v.gpsDevice.imei,
              status: v.gpsDevice.status.toLowerCase(),
              battery: v.gpsDevice.batteryLevel ?? null,
              signal: v.gpsDevice.signalStrength ?? null,
              lastSeen: v.gpsDevice.lastSeenAt ? v.gpsDevice.lastSeenAt.toISOString() : null,
              domainStatus: 'ACTIVE',
            }
          : {
              linked: false,
              imei: null,
              status: null,
              domainStatus: 'NOT_YET_BUILT',
            },
      },
      activity: activityTimeline,
    };
  },
};
