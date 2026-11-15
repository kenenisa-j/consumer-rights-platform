import { CaseStatus } from '@prisma/client';
import { SlaUrgency } from './sla.types';

export const RESOLVED_OR_CLOSED_STATUSES: CaseStatus[] = [
  CaseStatus.RESOLVED_MUTUALLY,
  CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
  CaseStatus.COURT_REFERRAL_ISSUED,
  CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
  CaseStatus.CLOSED_WITHDRAWN,
];

export function evaluateCaseSla(c: {
  status: CaseStatus;
  slaDeadline?: Date | null;
  createdAt: Date;
  slaPauses?: Array<{ pausedAt: Date; resumedAt?: Date | null }>;
}, now = new Date()): {
  urgency: SlaUrgency;
  isOverdue: boolean;
  hoursRemaining: number;
  totalAllowedHours: number;
  isPaused: boolean;
} {
  const isTerminal = RESOLVED_OR_CLOSED_STATUSES.includes(c.status);
  const activePause = c.slaPauses?.find((p) => !p.resumedAt);
  const isPaused = Boolean(activePause) && !isTerminal;

  if (isTerminal) {
    return {
      urgency: SlaUrgency.NORMAL,
      isOverdue: false,
      hoursRemaining: 0,
      totalAllowedHours: 0,
      isPaused: false,
    };
  }

  if (isPaused) {
    return {
      urgency: SlaUrgency.PAUSED,
      isOverdue: false,
      hoursRemaining: 0,
      totalAllowedHours: 0,
      isPaused: true,
    };
  }

  if (!c.slaDeadline) {
    return {
      urgency: SlaUrgency.NORMAL,
      isOverdue: false,
      hoursRemaining: 999,
      totalAllowedHours: 0,
      isPaused: false,
    };
  }

  const deadlineMs = new Date(c.slaDeadline).getTime();
  const createdMs = new Date(c.createdAt).getTime();
  const nowMs = now.getTime();

  const totalAllowedHours = Math.max(0, Math.round((deadlineMs - createdMs) / (1000 * 60 * 60)));
  const diffHours = Math.round((deadlineMs - nowMs) / (1000 * 60 * 60));

  if (diffHours < 0) {
    return {
      urgency: SlaUrgency.OVERDUE,
      isOverdue: true,
      hoursRemaining: diffHours,
      totalAllowedHours,
      isPaused: false,
    };
  }

  // Approaching if 24 hours or less remain
  if (diffHours <= 24) {
    return {
      urgency: SlaUrgency.APPROACHING,
      isOverdue: false,
      hoursRemaining: diffHours,
      totalAllowedHours,
      isPaused: false,
    };
  }

  return {
    urgency: SlaUrgency.NORMAL,
    isOverdue: false,
    hoursRemaining: diffHours,
    totalAllowedHours,
    isPaused: false,
  };
}

export function formatSlaCaseRow(c: any, now = new Date()) {
  const sla = evaluateCaseSla(c, now);
  return {
    reference: c.referenceNumber,
    route: c.route,
    status: c.status,
    category: c.category?.nameEn || 'General',
    complainantAlias: c.complainantAlias,
    merchantName: c.merchant?.tradeName || c.unregisteredMerchantName || null,
    officeName: c.currentOffice?.nameEn || null,
    assignedOfficer: c.assignments?.[0]?.assignedTo?.fullName || null,
    urgency: sla.urgency,
    isOverdue: sla.isOverdue,
    hoursRemaining: sla.hoursRemaining,
    slaDeadline: c.slaDeadline ? new Date(c.slaDeadline).toISOString() : null,
    submittedAt: new Date(c.createdAt).toISOString(),
  };
}

