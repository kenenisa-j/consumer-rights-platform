import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CaseStatus,
  OfficeLevel,
  Prisma,
  RoleCode,
  TransferDirection,
  TransferStatus,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import {
  resolveOfficerContext,
  assertOfficerJurisdiction,
} from './government-cases.helpers';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { AcceptTransferDto } from './dto/accept-transfer.dto';
import { RejectTransferDto } from './dto/reject-transfer.dto';

const CLOSED_STATUSES: CaseStatus[] = [
  CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
  CaseStatus.CLOSED_WITHDRAWN,
  CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
  CaseStatus.RESOLVED_MUTUALLY,
  CaseStatus.COURT_REFERRAL_ISSUED,
];

@Injectable()
export class GovernmentTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateTransfer(actorUserId: string, reference: string, dto: InitiateTransferDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        currentOffice: true,
        transfers: { where: { status: TransferStatus.PENDING_ACCEPTANCE } },
      },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    if (!c.currentOfficeId || !c.currentOffice) {
      throw new BadRequestException({ code: 'NO_HOLDING_OFFICE', message: 'Case is not currently held by a government office.' });
    }

    assertOfficerJurisdiction(actor, c.currentOffice);

    if (actor.level === OfficeLevel.WOREDA && c.currentOfficeId !== actor.officeId) {
      throw new ForbiddenException({ code: 'NOT_CURRENT_CUSTODIAN', message: 'Only the current holding office can initiate a transfer.' });
    }

    if (CLOSED_STATUSES.includes(c.status)) {
      throw new BadRequestException({ code: 'CANNOT_TRANSFER_CLOSED_CASE', message: 'Cannot transfer a case that is closed or resolved.' });
    }

    if (c.transfers.length > 0) {
      throw new BadRequestException({ code: 'PENDING_TRANSFER_EXISTS', message: 'A pending transfer already exists for this case.' });
    }

    const direction = dto.direction || TransferDirection.UPWARD_ESCALATION;
    let targetOfficeId = dto.toOfficeId;

    if (direction === TransferDirection.UPWARD_ESCALATION) {
      if (c.currentOffice.level === OfficeLevel.WOREDA) {
        const parentOfficeId = c.currentOffice.parentOfficeId;
        if (!parentOfficeId) {
          throw new BadRequestException({ code: 'NO_PARENT_OFFICE', message: 'Woreda office does not have a parent Sub-City office configured.' });
        }
        if (targetOfficeId && targetOfficeId !== parentOfficeId) {
          throw new BadRequestException({ code: 'INVALID_CLIMB', message: 'A Woreda office can only escalate to its parent Sub-City office.' });
        }
        targetOfficeId = parentOfficeId;
      } else if (c.currentOffice.level === OfficeLevel.SUBCITY) {
        const parentOfficeId = c.currentOffice.parentOfficeId;
        if (!parentOfficeId) {
          const bureauOffice = await this.prisma.administrativeOffice.findFirst({ where: { level: OfficeLevel.CITY_BUREAU, isActive: true } });
          if (!bureauOffice) throw new BadRequestException({ code: 'NO_BUREAU_OFFICE', message: 'City Bureau office not found.' });
          targetOfficeId = bureauOffice.id;
        } else {
          targetOfficeId = parentOfficeId;
        }
        if (dto.toOfficeId && dto.toOfficeId !== targetOfficeId) {
          throw new BadRequestException({ code: 'INVALID_CLIMB', message: 'A Sub-City office can only escalate to the City Bureau.' });
        }
      } else if (c.currentOffice.level === OfficeLevel.CITY_BUREAU) {
        throw new BadRequestException({ code: 'TERMINAL_LEVEL', message: 'City Bureau is the terminal upward level. Cannot escalate further upwards.' });
      }
    }

    if (!targetOfficeId) {
      throw new BadRequestException({ code: 'TARGET_OFFICE_REQUIRED', message: 'Target office could not be determined.' });
    }

    const targetOffice = await this.prisma.administrativeOffice.findUnique({ where: { id: targetOfficeId } });
    if (!targetOffice || !targetOffice.isActive) {
      throw new BadRequestException({ code: 'TARGET_OFFICE_INACTIVE', message: 'Target receiving office is inactive or does not exist.' });
    }

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.caseTransfer.create({
        data: {
          caseId: c.id,
          fromOfficeId: c.currentOfficeId!,
          toOfficeId: targetOffice.id,
          direction,
          status: TransferStatus.PENDING_ACCEPTANCE,
          handoverNote: dto.handoverNote.trim(),
          initiatedByUserId: actorUserId,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Case transfer initiated to ${targetOffice.nameEn}. Handover note: ${dto.handoverNote.trim()}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'TRANSFER_INITIATED',
          fieldName: 'toOfficeId',
          newValue: targetOffice.id,
        },
      });

      return transfer;
    });
  }

  async listIncomingTransfers(actorUserId: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where: Prisma.CaseTransferWhereInput = {
      status: TransferStatus.PENDING_ACCEPTANCE,
    };

    if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
      // Full view
    } else if (actor.level === OfficeLevel.SUBCITY) {
      where.toOffice = { subcityCode: actor.subcityCode! };
    } else if (actor.level === OfficeLevel.WOREDA) {
      where.toOfficeId = actor.officeId!;
    }

    return this.prisma.caseTransfer.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            route: true,
            complainantAlias: true,
            itemDescription: true,
            status: true,
          },
        },
        fromOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        toOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        initiatedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async listOutgoingTransfers(actorUserId: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where: Prisma.CaseTransferWhereInput = {};

    if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
      // Full view
    } else if (actor.level === OfficeLevel.SUBCITY) {
      where.fromOffice = { subcityCode: actor.subcityCode! };
    } else if (actor.level === OfficeLevel.WOREDA) {
      where.fromOfficeId = actor.officeId!;
    }

    return this.prisma.caseTransfer.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            route: true,
            complainantAlias: true,
            itemDescription: true,
            status: true,
          },
        },
        fromOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        toOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        initiatedBy: { select: { id: true, fullName: true } },
        respondedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async getCaseTransfers(actorUserId: string, reference: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    return this.prisma.caseTransfer.findMany({
      where: { caseId: c.id },
      orderBy: { transferredAt: 'desc' },
      include: {
        fromOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        toOffice: { select: { id: true, code: true, nameEn: true, level: true } },
        initiatedBy: { select: { id: true, fullName: true } },
        respondedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async acceptTransfer(actorUserId: string, transferId: string, dto: AcceptTransferDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);

    const transfer = await this.prisma.caseTransfer.findUnique({
      where: { id: transferId },
      include: { toOffice: true, fromOffice: true, case: true },
    });

    if (!transfer) {
      throw new NotFoundException({ code: 'TRANSFER_NOT_FOUND', message: 'Transfer record not found.' });
    }

    if (transfer.status !== TransferStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException({
        code: 'TRANSFER_ALREADY_RESOLVED',
        message: `Transfer cannot be accepted because its status is already '${transfer.status}'.`,
      });
    }

    assertOfficerJurisdiction(actor, transfer.toOffice);

    const targetOffice = transfer.toOffice;
    const nextStatus = CaseStatus.RECEIVED_BY_OFFICE;
    const handlingLevel = targetOffice.level === OfficeLevel.CITY_BUREAU ? 'bureau' : targetOffice.level.toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Close any active officer assignment on this case
      await tx.caseAssignment.updateMany({
        where: { caseId: transfer.caseId, isActive: true },
        data: { isActive: false, unassignedAt: new Date() },
      });

      // 2. Mark transfer as accepted
      await tx.caseTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.ACCEPTED,
          respondedByUserId: actorUserId,
          respondedAt: new Date(),
          responseNotes: dto.notes?.trim() || 'Transfer accepted by receiving office.',
        },
      });

      // 3. Update case custody and status
      await tx.case.update({
        where: { id: transfer.caseId },
        data: {
          currentOfficeId: targetOffice.id,
          status: nextStatus,
        },
      });

      // 4. Record history & audit
      await tx.caseHistory.create({
        data: {
          caseId: transfer.caseId,
          fromStatus: transfer.case.status,
          toStatus: nextStatus,
          handlingLevel,
          officeId: targetOffice.id,
          actorUserId,
          publicNote: dto.notes?.trim() || `Accepted by ${targetOffice.nameEn}. Custody transferred from ${transfer.fromOffice.nameEn}.`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: transfer.caseId,
          actorId: actorUserId,
          actionCode: 'TRANSFER_ACCEPTED',
          oldValue: transfer.fromOfficeId,
          newValue: targetOffice.id,
        },
      });

      return {
        success: true,
        caseReference: transfer.case.referenceNumber,
        status: nextStatus,
        holdingOffice: targetOffice.nameEn,
      };
    });
  }

  async rejectTransfer(actorUserId: string, transferId: string, dto: RejectTransferDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);

    const transfer = await this.prisma.caseTransfer.findUnique({
      where: { id: transferId },
      include: { toOffice: true, fromOffice: true, case: true },
    });

    if (!transfer) {
      throw new NotFoundException({ code: 'TRANSFER_NOT_FOUND', message: 'Transfer record not found.' });
    }

    if (transfer.status !== TransferStatus.PENDING_ACCEPTANCE) {
      throw new BadRequestException({
        code: 'TRANSFER_ALREADY_RESOLVED',
        message: `Transfer cannot be rejected because its status is already '${transfer.status}'.`,
      });
    }

    assertOfficerJurisdiction(actor, transfer.toOffice);

    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'A rejection or return reason of at least 5 characters is required.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.caseTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.RETURNED,
          respondedByUserId: actorUserId,
          respondedAt: new Date(),
          responseNotes: dto.reason.trim(),
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: transfer.caseId,
          fromStatus: transfer.case.status,
          toStatus: transfer.case.status,
          handlingLevel: transfer.toOffice.level.toLowerCase(),
          officeId: transfer.toOfficeId,
          actorUserId,
          publicNote: `Transfer rejected/returned by ${transfer.toOffice.nameEn}. Reason: ${dto.reason.trim()}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: transfer.caseId,
          actorId: actorUserId,
          actionCode: 'TRANSFER_RETURNED',
          fieldName: 'transferId',
          newValue: transfer.id,
        },
      });

      return {
        success: true,
        transferId: transfer.id,
        status: TransferStatus.RETURNED,
        returnedBy: actorUserId,
      };
    });
  }
}

