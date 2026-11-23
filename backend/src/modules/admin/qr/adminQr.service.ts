import { Prisma, QrStatus } from '@prisma/client';
import { ApiError } from '../../../common/utils/apiError';
import { prisma } from '../../../config/database';
import { auditService } from '../../audit';
import { adminQrRepository } from './adminQr.repository';
import {
  AssignQrInput,
  BatchGenerateQrInput,
  DeactivateQrInput,
  ListAdminQrQuery,
  ReactivateQrInput,
  ReplaceQrInput,
  SuspendQrInput,
} from './adminQr.schema';

function generateRandomQrCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `QRR-${num}`;
}

export const adminQrService = {
  async listQrCodes(query: ListAdminQrQuery) {
    const { items, total } = await adminQrRepository.listQrCodes(query);

    const formatted = items.map((q) => {
      const owner = q.vehicle?.user || q.user;
      const ownerName = owner
        ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email
        : null;

      return {
        id: q.id,
        code: q.code,
        batch: q.batch,
        status: q.status.toLowerCase(),
        rawStatus: q.status,
        vehicleId: q.vehicleId,
        vehicleReg: q.vehicle?.reg ?? null,
        vehicleModel: q.vehicle?.model ?? null,
        ownerId: owner?.id ?? null,
        ownerName: ownerName,
        ownerEmail: owner?.email ?? null,
        ownerPhone: owner?.phone ?? null,
        scans: q.scansCount,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      };
    });

    return {
      items: formatted,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  },

  async getQrById(id: string) {
    const q = await adminQrRepository.findById(id);
    if (!q) {
      throw ApiError.notFound('QR code not found');
    }

    const owner = q.vehicle?.user || q.user;
    const ownerName = owner
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email
      : null;

    return {
      id: q.id,
      code: q.code,
      batch: q.batch,
      status: q.status.toLowerCase(),
      rawStatus: q.status,
      vehicleId: q.vehicleId,
      vehicleReg: q.vehicle?.reg ?? null,
      vehicleModel: q.vehicle?.model ?? null,
      owner: owner
        ? {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            fullName: ownerName,
            email: owner.email,
            phone: owner.phone,
          }
        : null,
      ownerName,
      scans: q.scansCount,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      history: q.history.map((h) => ({
        id: h.id,
        qrCodeId: h.qrCodeId,
        qrCodeValue: h.qrCodeValue,
        vehicleId: h.vehicleId,
        vehicleReg: h.vehicle?.reg ?? h.vehicleReg ?? null,
        userId: h.userId,
        userName: h.user
          ? `${h.user.firstName} ${h.user.lastName}`.trim()
          : null,
        userEmail: h.user?.email ?? h.userEmail ?? null,
        assignedBy: h.assignedBy,
        assignedAt: h.assignedAt.toISOString(),
        unassignedAt: h.unassignedAt ? h.unassignedAt.toISOString() : null,
        reason: h.reason,
        notes: h.notes,
      })),
      recentScans: q.scanLogs.map((s) => ({
        id: s.id,
        qrCodeId: s.qrCodeId,
        qrCodeValue: s.qrCodeValue,
        scannedAt: s.scannedAt.toISOString(),
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        city: s.city,
        actionTaken: s.actionTaken,
      })),
    };
  },

  async batchGenerate(
    input: BatchGenerateQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    const batch =
      input.batchName ||
      `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (input.codes && input.codes.length > 0) {
      // 1. Batch Import mode
      const normalizedCodes = input.codes.map((c) => c.toUpperCase());
      const existing = await adminQrRepository.findExistingCodes(normalizedCodes);
      if (existing.length > 0) {
        throw ApiError.conflict(
          `The following QR codes already exist in inventory: ${existing.join(', ')}`,
        );
      }

      return prisma.$transaction(async (tx) => {
        const records = normalizedCodes.map((code) => ({
          code,
          batch,
          status: QrStatus.AVAILABLE,
        }));

        await adminQrRepository.createMany(records, tx);

        await auditService.record(
          {
            actorId,
            action: 'admin.qr_batch_imported',
            entity: 'QrCode',
            entityId: batch,
            metadata: {
              batch,
              count: normalizedCodes.length,
              mode: 'IMPORT',
            },
            ipAddress,
          },
          tx,
        );

        return {
          batch,
          count: normalizedCodes.length,
          status: 'AVAILABLE',
          imported: true,
        };
      });
    }

    // 2. Batch Generation mode
    const qty = input.quantity ?? 50;

    return prisma.$transaction(async (tx) => {
      const generatedCodes: string[] = [];
      const records: Array<{ code: string; batch: string; status: QrStatus }> = [];

      let attempts = 0;
      while (generatedCodes.length < qty && attempts < qty * 5) {
        attempts++;
        const candidate = generateRandomQrCode();
        if (!generatedCodes.includes(candidate)) {
          generatedCodes.push(candidate);
        }
      }

      // Check DB for any unexpected collisions with candidate codes
      const existing = await adminQrRepository.findExistingCodes(generatedCodes, tx);
      const existingSet = new Set(existing);
      const finalCodes = generatedCodes.filter((c) => !existingSet.has(c));

      // Fill remaining if collision occurred
      while (finalCodes.length < qty) {
        const candidate = generateRandomQrCode();
        if (!finalCodes.includes(candidate)) {
          const exists = await adminQrRepository.findByCode(candidate, tx);
          if (!exists) {
            finalCodes.push(candidate);
          }
        }
      }

      for (const code of finalCodes) {
        records.push({
          code,
          batch,
          status: QrStatus.AVAILABLE,
        });
      }

      await adminQrRepository.createMany(records, tx);

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_batch_generated',
          entity: 'QrCode',
          entityId: batch,
          metadata: {
            batch,
            count: finalCodes.length,
            mode: 'GENERATE',
          },
          ipAddress,
        },
        tx,
      );

      return {
        batch,
        count: finalCodes.length,
        status: 'AVAILABLE',
        generated: true,
      };
    });
  },

  async assignQr(
    id: string,
    input: AssignQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const qr = await adminQrRepository.lockById(id, tx);

      if (!qr) {
        throw ApiError.notFound('QR code not found');
      }

      if (qr.status === QrStatus.REPLACED || qr.status === QrStatus.DEACTIVATED) {
        throw ApiError.badRequest(
          `Cannot assign QR code in ${qr.status} status. It has been permanently retired.`,
        );
      }

      await adminQrRepository.lockVehicleById(input.vehicleId, tx);

      const vehicle = await tx.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { user: true },
      });

      if (!vehicle) {
        throw ApiError.notFound('Target vehicle not found');
      }

      if (qr.vehicleId === vehicle.id) {
        throw ApiError.conflict(`QR code '${qr.code}' is already assigned to this vehicle`);
      }

      // Enforce at most one active QR code per vehicle
      const existingActiveQr = await tx.qrCode.findFirst({
        where: {
          vehicleId: vehicle.id,
          id: { not: qr.id },
          status: { in: [QrStatus.ASSIGNED, QrStatus.ACTIVE, QrStatus.SUSPENDED] },
        },
      });

      if (existingActiveQr) {
        throw ApiError.conflict(
          `Vehicle ${vehicle.reg} already has an active QR code (${existingActiveQr.code}). Use Replace QR to supersede an existing QR.`,
        );
      }

      // If this QR was previously assigned to a different vehicle, close that history
      if (qr.vehicleId && qr.vehicleId !== vehicle.id) {
        await adminQrRepository.closeActiveAssignmentHistory(
          qr.id,
          'REASSIGNMENT',
          tx,
        );
      }

      const updated = await adminQrRepository.update(
        qr.id,
        {
          vehicleId: vehicle.id,
          status: QrStatus.ASSIGNED,
        },
        tx,
      );

      await adminQrRepository.createAssignmentHistory(
        {
          qrCodeId: qr.id,
          qrCodeValue: qr.code,
          vehicleId: vehicle.id,
          vehicleReg: vehicle.reg,
          userId: vehicle.userId,
          userEmail: vehicle.user?.email ?? null,
          assignedBy: actorId,
          reason: qr.vehicleId ? 'REASSIGNMENT' : 'INITIAL_ASSIGNMENT',
          notes: input.notes,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_assigned',
          entity: 'QrCode',
          entityId: qr.id,
          metadata: {
            code: qr.code,
            vehicleId: vehicle.id,
            vehicleReg: vehicle.reg,
            previousVehicleId: qr.vehicleId,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        code: updated.code,
        status: updated.status.toLowerCase(),
        vehicleId: vehicle.id,
        vehicleReg: vehicle.reg,
        ownerName: `${vehicle.user.firstName} ${vehicle.user.lastName}`.trim(),
      };
    });
  },

  async replaceQr(
    id: string,
    input: ReplaceQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      let oldQr: { id: string; code: string; batch: string; status: QrStatus; vehicleId: string | null } | null;
      let newQrRecord: { id: string; code: string; batch: string };

      if (input.replacementQrId || input.replacementCode) {
        let candidateId = input.replacementQrId;
        if (!candidateId && input.replacementCode) {
          const normalizedCandidateCode = input.replacementCode.trim().toUpperCase();
          const candidateLookup = await tx.qrCode.findUnique({
            where: { code: normalizedCandidateCode },
            select: { id: true },
          });
          if (!candidateLookup) {
            throw ApiError.notFound(
              `Replacement QR code '${input.replacementCode}' not found in inventory`,
            );
          }
          candidateId = candidateLookup.id;
        }

        if (candidateId === id) {
          throw ApiError.badRequest('Replacement QR code cannot be the same as the current QR code');
        }

        // Lock both QR codes in deterministic lexicographical order to prevent ABBA deadlocks
        const [firstId, secondId] = ([id, candidateId!] as [string, string]).sort() as [string, string];
        const firstLocked = await adminQrRepository.lockById(firstId, tx);
        const secondLocked = await adminQrRepository.lockById(secondId, tx);

        oldQr = firstId === id ? firstLocked : secondLocked;
        const candidate = firstId === candidateId ? firstLocked : secondLocked;

        if (!oldQr) {
          throw ApiError.notFound('QR code not found');
        }

        if (!oldQr.vehicleId) {
          throw ApiError.badRequest('Cannot replace a QR code that is not linked to any vehicle');
        }

        if (oldQr.status === QrStatus.REPLACED || oldQr.status === QrStatus.DEACTIVATED) {
          throw ApiError.badRequest(`Cannot replace a QR code that is already in ${oldQr.status} state`);
        }

        if (!candidate) {
          throw ApiError.notFound('Replacement QR code not found');
        }

        if (candidate.status !== QrStatus.AVAILABLE) {
          throw ApiError.badRequest(
            `Replacement QR code must be AVAILABLE, but is currently in ${candidate.status} status`,
          );
        }

        newQrRecord = candidate;

        // Lock vehicle only AFTER all QR rows have been locked
        await adminQrRepository.lockVehicleById(oldQr.vehicleId, tx);
      } else {
        oldQr = await adminQrRepository.lockById(id, tx);

        if (!oldQr) {
          throw ApiError.notFound('QR code not found');
        }

        if (!oldQr.vehicleId) {
          throw ApiError.badRequest('Cannot replace a QR code that is not linked to any vehicle');
        }

        if (oldQr.status === QrStatus.REPLACED || oldQr.status === QrStatus.DEACTIVATED) {
          throw ApiError.badRequest(`Cannot replace a QR code that is already in ${oldQr.status} state`);
        }

        // Lock vehicle only AFTER QR code is locked
        await adminQrRepository.lockVehicleById(oldQr.vehicleId, tx);

        // Auto-generate replacement QR code
        let candidateCode = generateRandomQrCode();
        let exists = await tx.qrCode.findUnique({ where: { code: candidateCode } });
        while (exists) {
          candidateCode = generateRandomQrCode();
          exists = await tx.qrCode.findUnique({ where: { code: candidateCode } });
        }

        newQrRecord = await tx.qrCode.create({
          data: {
            code: candidateCode,
            batch: oldQr.batch,
            status: QrStatus.AVAILABLE,
          },
        });
      }

      const vehicle =
        (oldQr as { vehicle?: { id: string; reg: string; model?: string; userId: string; user: { firstName: string; lastName: string; email?: string | null } } }).vehicle ??
        (await tx.vehicle.findUnique({
          where: { id: oldQr.vehicleId },
          include: { user: true },
        }));

      if (!vehicle) {
        throw ApiError.notFound('Target vehicle not found');
      }

      // 1. Terminate old QR association and mark REPLACED
      await tx.qrCode.update({
        where: { id: oldQr.id },
        data: {
          status: QrStatus.REPLACED,
          vehicleId: null,
        },
      });

      await adminQrRepository.closeActiveAssignmentHistory(
        oldQr.id,
        `REPLACED_BY_${newQrRecord.code}`,
        tx,
      );

      // 2. Bind new QR to vehicle
      await tx.qrCode.update({
        where: { id: newQrRecord.id },
        data: {
          vehicleId: vehicle.id,
          status: QrStatus.ASSIGNED,
        },
      });

      await adminQrRepository.createAssignmentHistory(
        {
          qrCodeId: newQrRecord.id,
          qrCodeValue: newQrRecord.code,
          vehicleId: vehicle.id,
          vehicleReg: vehicle.reg,
          userId: vehicle.userId,
          userEmail: vehicle.user?.email ?? null,
          assignedBy: actorId,
          reason: `REPLACEMENT_FOR_${oldQr.code}`,
          notes: input.notes ?? input.reason,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_replaced',
          entity: 'QrCode',
          entityId: oldQr.id,
          metadata: {
            previousQrId: oldQr.id,
            previousQrCode: oldQr.code,
            replacementQrId: newQrRecord.id,
            replacementQrCode: newQrRecord.code,
            vehicleId: vehicle.id,
            vehicleReg: vehicle.reg,
            reason: input.reason,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        replacedQr: {
          id: oldQr.id,
          code: oldQr.code,
          status: 'replaced',
        },
        activeQr: {
          id: newQrRecord.id,
          code: newQrRecord.code,
          status: 'assigned',
          vehicleId: vehicle.id,
          vehicleReg: vehicle.reg,
          ownerName: `${vehicle.user.firstName} ${vehicle.user.lastName}`.trim(),
        },
      };
    });
  },

  async suspendQr(
    id: string,
    input: SuspendQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const qr = await adminQrRepository.lockById(id, tx);

      if (!qr) {
        throw ApiError.notFound('QR code not found');
      }

      if (qr.status === QrStatus.REPLACED || qr.status === QrStatus.DEACTIVATED) {
        throw ApiError.badRequest(`Cannot suspend a QR code in ${qr.status} state`);
      }

      if (qr.status === QrStatus.SUSPENDED) {
        return {
          id: qr.id,
          code: qr.code,
          status: 'suspended',
          alreadySuspended: true,
        };
      }

      const updated = await tx.qrCode.update({
        where: { id },
        data: { status: QrStatus.SUSPENDED },
      });

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_suspended',
          entity: 'QrCode',
          entityId: qr.id,
          metadata: {
            code: qr.code,
            previousStatus: qr.status,
            vehicleId: qr.vehicleId,
            reason: input.reason,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        code: updated.code,
        status: updated.status.toLowerCase(),
      };
    });
  },

  async reactivateQr(
    id: string,
    input: ReactivateQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const qr = await adminQrRepository.lockById(id, tx);

      if (!qr) {
        throw ApiError.notFound('QR code not found');
      }

      if (qr.status !== QrStatus.SUSPENDED) {
        throw ApiError.badRequest(
          `Only SUSPENDED QR codes can be reactivated. Current status is ${qr.status}`,
        );
      }

      // If linked to a vehicle, transition back to ACTIVE (or ASSIGNED), otherwise AVAILABLE
      const nextStatus = qr.vehicleId ? QrStatus.ACTIVE : QrStatus.AVAILABLE;

      const updated = await tx.qrCode.update({
        where: { id },
        data: { status: nextStatus },
      });

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_reactivated',
          entity: 'QrCode',
          entityId: qr.id,
          metadata: {
            code: qr.code,
            previousStatus: qr.status,
            newStatus: nextStatus,
            vehicleId: qr.vehicleId,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        code: updated.code,
        status: updated.status.toLowerCase(),
      };
    });
  },

  async deactivateQr(
    id: string,
    input: DeactivateQrInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const qr = await adminQrRepository.lockById(id, tx);

      if (!qr) {
        throw ApiError.notFound('QR code not found');
      }

      if (qr.status === QrStatus.DEACTIVATED) {
        return {
          id: qr.id,
          code: qr.code,
          status: 'deactivated',
          alreadyDeactivated: true,
        };
      }

      // Unbind vehicle and mark DEACTIVATED
      const updated = await tx.qrCode.update({
        where: { id },
        data: {
          status: QrStatus.DEACTIVATED,
          vehicleId: null,
        },
      });

      if (qr.vehicleId) {
        await adminQrRepository.closeActiveAssignmentHistory(
          qr.id,
          'DEACTIVATED',
          tx,
        );
      }

      await auditService.record(
        {
          actorId,
          action: 'admin.qr_deactivated',
          entity: 'QrCode',
          entityId: qr.id,
          metadata: {
            code: qr.code,
            previousStatus: qr.status,
            previousVehicleId: qr.vehicleId,
            reason: input.reason,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        code: updated.code,
        status: updated.status.toLowerCase(),
      };
    });
  },

  async listScanLogs(qrId: string, page: number = 1, limit: number = 20) {
    const qr = await adminQrRepository.findById(qrId);
    if (!qr) {
      throw ApiError.notFound('QR code not found');
    }

    const { items, total } = await adminQrRepository.listScanLogs(qrId, page, limit);

    return {
      items: items.map((l) => ({
        id: l.id,
        qrCodeId: l.qrCodeId,
        scannedAt: l.scannedAt.toISOString(),
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        city: l.city,
        actionTaken: l.actionTaken,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async recordScan(
    codeOrId: string,
    logData: {
      ipAddress?: string;
      userAgent?: string;
      city?: string;
      actionTaken?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const qr =
      (await adminQrRepository.findByCode(codeOrId)) ||
      (await adminQrRepository.findById(codeOrId));

    if (!qr) {
      throw ApiError.notFound('QR code not found');
    }

    return adminQrRepository.recordScanLog(qr.id, qr.code, logData);
  },
};
