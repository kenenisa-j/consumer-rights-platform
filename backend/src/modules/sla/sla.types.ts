export enum SlaUrgency {
  NORMAL = 'NORMAL',
  APPROACHING = 'APPROACHING',
  OVERDUE = 'OVERDUE',
  PAUSED = 'PAUSED',
}

export enum SlaMilestoneType {
  BUSINESS_RESPONSE = 'BUSINESS_RESPONSE',
  GOVERNMENT_TRIAGE = 'GOVERNMENT_TRIAGE',
  OFFICER_ASSIGNMENT = 'OFFICER_ASSIGNMENT',
  INSPECTION = 'INSPECTION',
  COMPLIANCE = 'COMPLIANCE',
  OVERALL_RESOLUTION = 'OVERALL_RESOLUTION',
}

export interface SlaOverviewMetrics {
  totalMonitored: number;
  onTrackCount: number;
  approachingCount: number;
  overdueCount: number;
  pausedCount: number;
  complianceRatePercent: number;
  averageRemainingHours: number;
}
