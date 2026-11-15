import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  CaseStatus,
  OfficeLevel,
  Prisma,
  RoleCode,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import {
  resolveOfficerContext,
  assertOfficerJurisdiction,
} from '../cases/government-cases.helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { QuerySlaDto } from './dto/query-sla.dto';
import {
  SlaUrgency,
  SlaOverviewMetrics,
} from './sla.types';
import {
  RESOLVED_OR_CLOSED_STATUSES,
  evaluateCaseSla,
  formatSlaCaseRow,
} from './sla.helpers';

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private async resolveBusinessMerchant(userId: string) {
    const mu = await this.prisma.merchantUser.findFirst({
      where: { userId },
      include: { merchant: true },
    });
    if (!mu || !mu.merchant || !mu.merchant.isActive) {
      throw new ForbiddenException({
        code: 'NOT_AUTHORIZED_BUSINESS',
        message: 'User is not associated with an active registered merchant.',
      });
    }
    return mu.merchantId;
  }

  async getGovernmentSlaOverview(actorUserId: string): Promise<SlaOverviewMetrics> {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where: Prisma.CaseWhereInput = {
      status: { notIn: RESOLVED_OR_CLOSED_STATUSES },
    };

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.currentOffice = { subcityCode: actor.subcityCode };
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.currentOfficeId = actor.officeId;
      }
    }

    const cases = await this.prisma.case.findMany({
      where,
      select: {
        id: true,
        status: true,
        slaDeadline: true,
        createdAt: true,
        slaPauses: { where: { resumedAt: null } },
      },
    });

    const now = new Date();
    let onTrackCount = 0;
    let approachingCount = 0;
    let overdueCount = 0;
    let pausedCount = 0;
    let totalRemainingHours = 0;
    let casesWithDeadlines = 0;

    for (const c of cases) {
      const evaluation = evaluateCaseSla(c, now);
      if (evaluation.urgency === SlaUrgency.OVERDUE) overdueCount++;
      else if (evaluation.urgency === SlaUrgency.APPROACHING) approachingCount++;
      else if (evaluation.urgency === SlaUrgency.PAUSED) pausedCount++;
      else onTrackCount++;

      if (c.slaDeadline && !evaluation.isPaused) {
        totalRemainingHours += evaluation.hoursRemaining;
        casesWithDeadlines++;
      }
    }

    const totalMonitored = cases.length;
    const compliantCount = onTrackCount + approachingCount;
    const complianceRatePercent = totalMonitored > 0
      ? Math.round((compliantCount / totalMonitored) * 100)
      : 100;
    const averageRemainingHours = casesWithDeadlines > 0
      ? Math.round(totalRemainingHours / casesWithDeadlines)
      : 0;

    return {
      totalMonitored,
      onTrackCount,
      approachingCount,
      overdueCount,
      pausedCount,
      complianceRatePercent,
      averageRemainingHours,
    };
  }

  async getGovernmentOverdueCases(actorUserId: string, query: QuerySlaDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const now = new Date();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {
      status: { notIn: RESOLVED_OR_CLOSED_STATUSES },
      slaDeadline: { lt: now },
    };

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.currentOffice = { subcityCode: actor.subcityCode };
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.currentOfficeId = actor.officeId;
      }
    }

    if (query.officeId) where.currentOfficeId = query.officeId;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { slaDeadline: 'asc' },
        include: {
          category: true,
          merchant: true,
          currentOffice: true,
          assignments: { where: { isActive: true }, include: { assignedTo: true } },
          slaPauses: { where: { resumedAt: null } },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      items: items.map((c) => formatSlaCaseRow(c, now)),
      total,
      page,
      limit,
    };
  }

  async getGovernmentApproachingCases(actorUserId: string, query: QuerySlaDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const now = new Date();
    const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {
      status: { notIn: RESOLVED_OR_CLOSED_STATUSES },
      slaDeadline: { gte: now, lte: threshold },
    };

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.currentOffice = { subcityCode: actor.subcityCode };
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.currentOfficeId = actor.officeId;
      }
    }

    if (query.officeId) where.currentOfficeId = query.officeId;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { slaDeadline: 'asc' },
        include: {
          category: true,
          merchant: true,
          currentOffice: true,
          assignments: { where: { isActive: true }, include: { assignedTo: true } },
          slaPauses: { where: { resumedAt: null } },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      items: items.map((c) => formatSlaCaseRow(c, now)),
      total,
      page,
      limit,
    };
  }

  async getCaseSlaDetails(actorUserId: string, reference: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        category: true,
        currentOffice: true,
        assignments: { include: { assignedTo: true } },
        slaPauses: { include: { authorizedBy: true } },
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    const now = new Date();
    const evaluation = evaluateCaseSla(c, now);

    return {
      reference: c.referenceNumber,
      status: c.status,
      category: c.category?.nameEn,
      defaultSlaDays: c.category?.defaultSlaDays,
      slaDeadline: c.slaDeadline ? new Date(c.slaDeadline).toISOString() : null,
      urgency: evaluation.urgency,
      isOverdue: evaluation.isOverdue,
      hoursRemaining: evaluation.hoursRemaining,
      totalAllowedHours: evaluation.totalAllowedHours,
      pauses: c.slaPauses.map((p) => ({
        id: p.id,
        reason: p.pauseReason,
        pausedAt: p.pausedAt.toISOString(),
        resumedAt: p.resumedAt ? p.resumedAt.toISOString() : null,
        durationMinutes: p.durationMinutes,
        authorizedBy: p.authorizedBy.fullName,
      })),
      activeAssignment: c.assignments.find((a) => a.isActive)?.assignedTo.fullName || null,
      historyCount: c.history.length,
    };
  }

  async getBusinessSlaOverview(userId: string) {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const cases = await this.prisma.case.findMany({
      where: {
        merchantId,
        status: { notIn: RESOLVED_OR_CLOSED_STATUSES },
      },
      select: {
        id: true,
        status: true,
        slaDeadline: true,
        createdAt: true,
        slaPauses: { where: { resumedAt: null } },
      },
    });

    const now = new Date();
    let onTrackCount = 0;
    let approachingCount = 0;
    let overdueCount = 0;

    for (const c of cases) {
      const evaluation = evaluateCaseSla(c, now);
      if (evaluation.urgency === SlaUrgency.OVERDUE) overdueCount++;
      else if (evaluation.urgency === SlaUrgency.APPROACHING) approachingCount++;
      else onTrackCount++;
    }

    return {
      totalMonitored: cases.length,
      onTrackCount,
      approachingCount,
      overdueCount,
      complianceRatePercent: cases.length > 0
        ? Math.round(((onTrackCount + approachingCount) / cases.length) * 100)
        : 100,
    };
  }

  async getBusinessOverdueCases(userId: string, query: QuerySlaDto) {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const now = new Date();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {
      merchantId,
      status: { notIn: RESOLVED_OR_CLOSED_STATUSES },
      slaDeadline: { lt: now },
    };

    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { slaDeadline: 'asc' },
        include: {
          category: true,
          merchant: true,
          currentOffice: true,
          slaPauses: { where: { resumedAt: null } },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      items: items.map((c) => formatSlaCaseRow(c, now)),
      total,
      page,
      limit,
    };
  }
}

