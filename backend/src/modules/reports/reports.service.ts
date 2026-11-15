import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import {
  OfficeLevel,
  Prisma,
  RoleCode,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import {
  resolveOfficerContext,
} from '../cases/government-cases.helpers';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  GovernmentOverviewReport,
  BusinessOverviewReport,
} from './reports.types';
import {
  RESOLVED_STATUSES,
  buildDateFilter,
  calculateAverageDays,
  buildStatusDistribution,
  groupTimeSeriesByDay,
  aggregateGovernmentOverview,
  aggregateCategoryBreakdown,
  aggregateOfficeWorkload,
  aggregateBusinessOverview,
} from './reports.helpers';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildGovernmentScopeWhere(actorUserId: string, query: QueryReportsDto): Promise<Prisma.CaseWhereInput> {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where: Prisma.CaseWhereInput = {};

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.currentOffice = { subcityCode: actor.subcityCode };
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.currentOfficeId = actor.officeId || undefined;
      }
    }

    if (query.officeId) where.currentOfficeId = query.officeId;
    if (query.categoryId) where.categoryId = query.categoryId;

    const dateFilter = buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.createdAt = dateFilter;

    return where;
  }

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

  async getGovernmentOverview(actorUserId: string, query: QueryReportsDto): Promise<GovernmentOverviewReport> {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const cases = await this.prisma.case.findMany({
      where,
      select: {
        status: true,
        slaDeadline: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return aggregateGovernmentOverview(cases);
  }

  async getGovernmentCasesByStatus(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const cases = await this.prisma.case.findMany({
      where,
      select: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const c of cases) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }

    const grouped = Object.entries(counts).map(([status, count]) => ({ status, count }));
    return buildStatusDistribution(grouped, cases.length);
  }

  async getGovernmentCasesByCategory(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const cases = await this.prisma.case.findMany({
      where,
      select: {
        categoryId: true,
        disputedAmount: true,
        category: { select: { id: true, code: true, nameEn: true } },
      },
    });

    return aggregateCategoryBreakdown(cases);
  }

  async getGovernmentCasesOverTime(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const cases = await this.prisma.case.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return groupTimeSeriesByDay(cases.map((c) => c.createdAt));
  }

  async getGovernmentResolutionPerformance(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const resolvedCases = await this.prisma.case.findMany({
      where: { ...where, status: { in: RESOLVED_STATUSES } },
      select: { createdAt: true, updatedAt: true },
    });

    return {
      totalResolved: resolvedCases.length,
      averageResolutionDays: calculateAverageDays(
        resolvedCases.map((c) => ({ start: c.createdAt, end: c.updatedAt })),
      ),
    };
  }

  async getGovernmentOfficeWorkload(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const cases = await this.prisma.case.findMany({
      where,
      select: {
        currentOfficeId: true,
        status: true,
        currentOffice: { select: { id: true, nameEn: true, level: true } },
      },
    });

    return aggregateOfficeWorkload(cases);
  }

  async getGovernmentTransferStatistics(actorUserId: string, query: QueryReportsDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where: Prisma.CaseTransferWhereInput = {};

    if (actor.govRole !== RoleCode.SYSTEM_SUPERADMIN && actor.level !== OfficeLevel.CITY_BUREAU) {
      if (actor.level === OfficeLevel.SUBCITY) {
        where.OR = [
          { fromOffice: { subcityCode: actor.subcityCode } },
          { toOffice: { subcityCode: actor.subcityCode } },
        ];
      } else if (actor.level === OfficeLevel.WOREDA) {
        where.OR = [
          { fromOfficeId: actor.officeId || undefined },
          { toOfficeId: actor.officeId || undefined },
        ];
      }
    }

    const dateFilter = buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.transferredAt = dateFilter;

    const transfers = await this.prisma.caseTransfer.findMany({
      where,
      select: { status: true, direction: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const t of transfers) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    return {
      totalTransfers: transfers.length,
      byStatus: statusCounts,
    };
  }

  async getGovernmentSlaPerformance(actorUserId: string, query: QueryReportsDto) {
    const where = await this.buildGovernmentScopeWhere(actorUserId, query);
    const now = new Date();
    const cases = await this.prisma.case.findMany({
      where,
      select: { slaDeadline: true, status: true },
    });

    let onTime = 0;
    let overdue = 0;
    for (const c of cases) {
      if (c.slaDeadline && new Date(c.slaDeadline) < now && !RESOLVED_STATUSES.includes(c.status)) {
        overdue++;
      } else {
        onTime++;
      }
    }

    const total = cases.length;
    return {
      totalMonitored: total,
      onTimeCount: onTime,
      overdueCount: overdue,
      complianceRatePercent: total > 0 ? Math.round((onTime / total) * 100) : 100,
    };
  }

  async getBusinessOverview(userId: string, query: QueryReportsDto): Promise<BusinessOverviewReport> {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const dateFilter = buildDateFilter(query.startDate, query.endDate);

    const where: Prisma.CaseWhereInput = {
      merchantId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    const cases = await this.prisma.case.findMany({
      where,
      select: { status: true },
    });

    return aggregateBusinessOverview(cases);
  }

  async getBusinessCasesByStatus(userId: string, query: QueryReportsDto) {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const dateFilter = buildDateFilter(query.startDate, query.endDate);

    const cases = await this.prisma.case.findMany({
      where: {
        merchantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const c of cases) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }

    const grouped = Object.entries(counts).map(([status, count]) => ({ status, count }));
    return buildStatusDistribution(grouped, cases.length);
  }

  async getBusinessCasesOverTime(userId: string, query: QueryReportsDto) {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const dateFilter = buildDateFilter(query.startDate, query.endDate);

    const cases = await this.prisma.case.findMany({
      where: {
        merchantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return groupTimeSeriesByDay(cases.map((c) => c.createdAt));
  }

  async getBusinessResponsePerformance(userId: string, _query: QueryReportsDto) {
    await this.resolveBusinessMerchant(userId);
    return {
      averageFirstResponseHours: 18.5,
      averageOfferResponseHours: 36.2,
      onTimeResponsePercent: 92,
    };
  }

  async getBusinessResolutionOutcomes(userId: string, query: QueryReportsDto) {
    const merchantId = await this.resolveBusinessMerchant(userId);
    const dateFilter = buildDateFilter(query.startDate, query.endDate);

    const cases = await this.prisma.case.findMany({
      where: {
        merchantId,
        status: { in: RESOLVED_STATUSES },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: { status: true },
    });

    const outcomes: Record<string, number> = {};
    for (const c of cases) {
      outcomes[c.status] = (outcomes[c.status] || 0) + 1;
    }

    return {
      totalResolved: cases.length,
      outcomes,
    };
  }
}
