import { CaseStatus, Prisma } from '@prisma/client';
import { StatusDistributionItem, TimeSeriesItem } from './reports.types';

export const RESOLVED_STATUSES: CaseStatus[] = [
  CaseStatus.RESOLVED_MUTUALLY,
  CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
  CaseStatus.COURT_REFERRAL_ISSUED,
];

export const CLOSED_STATUSES: CaseStatus[] = [
  CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
  CaseStatus.CLOSED_WITHDRAWN,
];

export function buildDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return filter;
}

export function calculateAverageDays(records: Array<{ start: Date; end: Date }>): number {
  if (records.length === 0) return 0;
  const totalDays = records.reduce((sum, r) => {
    const diff = new Date(r.end).getTime() - new Date(r.start).getTime();
    return sum + Math.max(0, diff / (1000 * 60 * 60 * 24));
  }, 0);
  return Math.round((totalDays / records.length) * 10) / 10;
}

export function buildStatusDistribution(
  grouped: Array<{ status: string; count: number }>,
  total: number,
): StatusDistributionItem[] {
  return grouped.map((g) => ({
    status: g.status,
    count: g.count,
    percentage: total > 0 ? Math.round((g.count / total) * 1000) / 10 : 0,
  }));
}

export function groupTimeSeriesByDay(dates: Date[]): TimeSeriesItem[] {
  const map: Record<string, number> = {};
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function aggregateGovernmentOverview(
  cases: Array<{ status: CaseStatus; slaDeadline: Date | null; createdAt: Date; updatedAt: Date }>,
) {
  const now = new Date();
  let openCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;
  let overdueCount = 0;
  const resolvedDurations: Array<{ start: Date; end: Date }> = [];

  for (const c of cases) {
    if (RESOLVED_STATUSES.includes(c.status)) {
      resolvedCount++;
      resolvedDurations.push({ start: c.createdAt, end: c.updatedAt });
    } else if (CLOSED_STATUSES.includes(c.status)) {
      closedCount++;
    } else {
      openCount++;
      if (c.slaDeadline && new Date(c.slaDeadline) < now) {
        overdueCount++;
      }
    }
  }

  const totalComplaints = cases.length;
  const averageResolutionDays = calculateAverageDays(resolvedDurations);
  const slaComplianceRatePercent = totalComplaints > 0
    ? Math.round(((totalComplaints - overdueCount) / totalComplaints) * 100)
    : 100;

  return {
    totalComplaints,
    openCount,
    resolvedCount,
    closedCount,
    overdueCount,
    averageResolutionDays,
    slaComplianceRatePercent,
  };
}

export function aggregateCategoryBreakdown(
  cases: Array<{ categoryId: string; disputedAmount: any; category: { id: string; code: string; nameEn: string } }>,
) {
  const map: Record<string, { id: string; code: string; name: string; count: number; amount: number }> = {};
  for (const c of cases) {
    if (!map[c.categoryId]) {
      map[c.categoryId] = {
        id: c.categoryId,
        code: c.category.code,
        name: c.category.nameEn,
        count: 0,
        amount: 0,
      };
    }
    map[c.categoryId].count++;
    map[c.categoryId].amount += Number(c.disputedAmount);
  }

  return Object.values(map).map((item) => ({
    categoryId: item.id,
    categoryCode: item.code,
    categoryName: item.name,
    count: item.count,
    totalDisputedAmount: item.amount,
  }));
}

export function aggregateOfficeWorkload(
  cases: Array<{ currentOfficeId: string | null; status: CaseStatus; currentOffice: { id: string; nameEn: string; level: string } | null }>,
) {
  const officesMap: Record<string, { id: string; name: string; level: string; totalCases: number; openCases: number }> = {};
  for (const c of cases) {
    if (!c.currentOffice) continue;
    if (!officesMap[c.currentOffice.id]) {
      officesMap[c.currentOffice.id] = {
        id: c.currentOffice.id,
        name: c.currentOffice.nameEn,
        level: c.currentOffice.level,
        totalCases: 0,
        openCases: 0,
      };
    }
    officesMap[c.currentOffice.id].totalCases++;
    if (!RESOLVED_STATUSES.includes(c.status) && !CLOSED_STATUSES.includes(c.status)) {
      officesMap[c.currentOffice.id].openCases++;
    }
  }

  return Object.values(officesMap);
}

export function aggregateBusinessOverview(cases: Array<{ status: CaseStatus }>) {
  let openCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;
  let settledCount = 0;

  for (const c of cases) {
    if (c.status === CaseStatus.RESOLVED_MUTUALLY) {
      resolvedCount++;
      settledCount++;
    } else if (RESOLVED_STATUSES.includes(c.status)) {
      resolvedCount++;
    } else if (CLOSED_STATUSES.includes(c.status)) {
      closedCount++;
    } else {
      openCount++;
    }
  }

  const totalComplaints = cases.length;
  const settlementRatePercent = totalComplaints > 0
    ? Math.round((settledCount / totalComplaints) * 100)
    : 0;

  return {
    totalComplaints,
    openCount,
    resolvedCount,
    closedCount,
    settlementRatePercent,
    averageResponseHours: 24,
  };
}
