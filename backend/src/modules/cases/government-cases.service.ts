import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  CaseStatus,
  OfficeLevel,
  Prisma,
  RoleCode,
  TransferStatus,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { QueryGovernmentCasesDto } from './dto/query-government-cases.dto';
import { AcceptTransferDto } from './dto/accept-transfer.dto';
import { TriageCaseDto } from './dto/triage-case.dto';
import { AssignOfficerDto } from './dto/assign-officer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import {
  OfficerContext,
  resolveOfficerContext,
  assertOfficerJurisdiction,
  formatCaseSummary,
  formatCaseDetails,
  executeAcceptTransferTx,
  executeTriageCaseTx,
  executeAssignOfficerTx,
  GOVERNMENT_CASE_SUMMARY_INCLUDE,
  GOVERNMENT_CASE_DETAIL_INCLUDE,
} from './government-cases.helpers';

@Injectable()
export class GovernmentCasesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async getOfficerContext(actorUserId: string): Promise<OfficerContext> {
    return resolveOfficerContext(this.prisma, actorUserId);
  }

  async listCases(actorUserId: string, query: QueryGovernmentCasesDto) {
    const actor = await this.getOfficerContext(actorUserId);
    const where: Prisma.CaseWhereInput = {};

    if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
      if (query.officeId) where.currentOfficeId = query.officeId;
      if (query.subcityCode) where.currentOffice = { subcityCode: query.subcityCode };
    } else if (actor.level === OfficeLevel.SUBCITY) {
      where.currentOffice = { subcityCode: actor.subcityCode };
      if (query.officeId) where.currentOfficeId = query.officeId;
    } else if (actor.level === OfficeLevel.WOREDA) {
      where.currentOfficeId = actor.officeId || undefined;
    }

    if (query.status) where.status = query.status;
    if (query.route) where.route = query.route;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { itemDescription: { contains: query.search, mode: 'insensitive' } },
        { complainantAlias: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: GOVERNMENT_CASE_SUMMARY_INCLUDE,
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      cases: cases.map(formatCaseSummary),
      total,
      page,
      limit,
    };
  }

  async getCaseByReference(actorUserId: string, reference: string) {
    return this.getCaseDetails(actorUserId, reference);
  }

  async listPendingTransfers(actorUserId: string) {
    return this.getTransfers(actorUserId);
  }

  async getCaseDetails(actorUserId: string, reference: string) {
    const actor = await this.getOfficerContext(actorUserId);

    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: GOVERNMENT_CASE_DETAIL_INCLUDE,
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    return formatCaseDetails(c);
  }

  async getEligibleOfficers(actorUserId: string, officeId?: string) {
    const actor = await this.getOfficerContext(actorUserId);
    const targetOfficeId = officeId || actor.officeId;

    if (!targetOfficeId) {
      throw new BadRequestException({
        code: 'OFFICE_REQUIRED',
        message: 'An office ID must be specified to list eligible officers.',
      });
    }

    const office = await this.prisma.administrativeOffice.findUnique({ where: { id: targetOfficeId } });
    if (!office) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Office not found.' });

    assertOfficerJurisdiction(actor, office);

    const deployments = await this.prisma.userOffice.findMany({
      where: { officeId: targetOfficeId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            status: true,
            roles: { include: { role: true } },
          },
        },
      },
    });

    return deployments
      .filter((d) => d.user.status === 'ACTIVE')
      .map((d) => ({
        id: d.user.id,
        fullName: d.user.fullName,
        roleInOffice: d.roleInOffice,
        roles: d.user.roles.map((r) => r.role.code),
      }));
  }

  async getTransfers(actorUserId: string, transferId?: string) {
    const actor = await this.getOfficerContext(actorUserId);

    if (transferId) {
      const transfer = await this.prisma.caseTransfer.findUnique({
        where: { id: transferId },
        include: {
          case: true,
          fromOffice: true,
          toOffice: true,
          initiatedBy: { select: { id: true, fullName: true } },
          respondedBy: { select: { id: true, fullName: true } },
        },
      });

      if (!transfer) throw new NotFoundException({ code: 'TRANSFER_NOT_FOUND', message: 'Transfer record not found.' });
      assertOfficerJurisdiction(actor, transfer.toOffice);
      return transfer;
    }

    const where: Prisma.CaseTransferWhereInput = {
      status: TransferStatus.PENDING_ACCEPTANCE,
    };

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.toOffice = { subcityCode: actor.subcityCode };
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.toOfficeId = actor.officeId || undefined;
      }
    }

    return this.prisma.caseTransfer.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
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

  async acceptTransfer(actorUserId: string, transferId: string, dto: AcceptTransferDto) {
    const actor = await this.getOfficerContext(actorUserId);

    const transfer = await this.prisma.caseTransfer.findUnique({
      where: { id: transferId },
      include: { toOffice: true, case: true },
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
      return executeAcceptTransferTx(tx, transfer, targetOffice, nextStatus, handlingLevel, actorUserId, dto.notes);
    });
  }

  async triageCase(actorUserId: string, reference: string, dto: TriageCaseDto) {
    const actor = await this.getOfficerContext(actorUserId);

    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (
      c.status !== CaseStatus.RECEIVED_BY_OFFICE &&
      c.status !== CaseStatus.ESCALATED_TO_GOVERNMENT &&
      c.status !== CaseStatus.UNDER_INITIAL_REVIEW
    ) {
      throw new BadRequestException({
        code: 'INVALID_TRIAGE_STATE',
        message: `Cannot triage a case with current status '${c.status}'.`,
      });
    }

    const nextStatus = CaseStatus.UNDER_INITIAL_REVIEW;
    const handlingLevel = c.currentOffice
      ? c.currentOffice.level === OfficeLevel.CITY_BUREAU
        ? 'bureau'
        : c.currentOffice.level.toLowerCase()
      : 'woreda';

    return this.prisma.$transaction(async (tx) => {
      return executeTriageCaseTx(tx, c, nextStatus, handlingLevel, actorUserId, dto);
    });
  }

  async assignOfficer(actorUserId: string, reference: string, dto: AssignOfficerDto, isReassignment = false) {
    const actor = await this.getOfficerContext(actorUserId);

    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (!c.currentOfficeId) {
      throw new BadRequestException({
        code: 'NO_HOLDING_OFFICE',
        message: 'Complaint is not currently held by a government office.',
      });
    }

    const targetOfficer = await this.prisma.user.findUnique({
      where: { id: dto.officerId },
      include: {
        offices: { where: { isActive: true }, include: { office: true } },
      },
    });

    if (!targetOfficer || targetOfficer.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'OFFICER_NOT_ELIGIBLE',
        message: 'Selected officer does not exist or is inactive.',
      });
    }

    const officerDeployedHere = targetOfficer.offices.some((o) => o.officeId === c.currentOfficeId);
    if (!officerDeployedHere) {
      throw new BadRequestException({
        code: 'OFFICER_NOT_IN_OFFICE',
        message: 'Officer is not deployed to the government office holding this case.',
      });
    }

    const nextStatus = CaseStatus.OFFICER_ASSIGNED;
    const handlingLevel = c.currentOffice
      ? c.currentOffice.level === OfficeLevel.CITY_BUREAU
        ? 'bureau'
        : c.currentOffice.level.toLowerCase()
      : 'woreda';

    const result = await this.prisma.$transaction(async (tx) => {
      return executeAssignOfficerTx(
        tx,
        c,
        nextStatus,
        handlingLevel,
        actorUserId,
        targetOfficer,
        dto,
        isReassignment,
      );
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.OFFICER_ASSIGNED,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        targetOfficerId: dto.officerId,
        complainantId: c.complainantId,
      }).catch(() => {});
    }

    return result;
  }

  async reassignOfficer(actorUserId: string, reference: string, dto: AssignOfficerDto) {
    return this.assignOfficer(actorUserId, reference, dto, true);
  }
}
