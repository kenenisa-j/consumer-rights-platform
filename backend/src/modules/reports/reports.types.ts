export interface ReportDateRange {
  startDate?: string;
  endDate?: string;
}

export interface GovernmentOverviewReport {
  totalComplaints: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  overdueCount: number;
  averageResolutionDays: number;
  slaComplianceRatePercent: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

export interface CategoryDistributionItem {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  count: number;
  totalDisputedAmount: number;
}

export interface TimeSeriesItem {
  date: string;
  count: number;
}

export interface BusinessOverviewReport {
  totalComplaints: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  settlementRatePercent: number;
  averageResponseHours: number;
}

