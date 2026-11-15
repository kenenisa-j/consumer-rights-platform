import { CaseStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export const CASE_TRANSITION_MATRIX: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.SUBMITTED_TO_BUSINESS]: [
    CaseStatus.BUSINESS_OFFER_PENDING,
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.ESCALATED_TO_GOVERNMENT,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.BUSINESS_OFFER_PENDING]: [
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.SUBMITTED_TO_BUSINESS,
    CaseStatus.ESCALATED_TO_GOVERNMENT,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.ESCALATED_TO_GOVERNMENT]: [
    CaseStatus.RECEIVED_BY_OFFICE,
    CaseStatus.UNDER_INITIAL_REVIEW,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.RECEIVED_BY_OFFICE]: [
    CaseStatus.UNDER_INITIAL_REVIEW,
    CaseStatus.OFFICER_ASSIGNED,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.UNDER_INITIAL_REVIEW]: [
    CaseStatus.OFFICER_ASSIGNED,
    CaseStatus.INSPECTION_PENDING,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.OFFICER_ASSIGNED]: [
    CaseStatus.INSPECTION_PENDING,
    CaseStatus.INSPECTION_ACTIVE,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.INSPECTION_PENDING]: [
    CaseStatus.INSPECTION_ACTIVE,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.INSPECTION_ACTIVE]: [
    CaseStatus.INSPECTION_COMPLETED,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.INSPECTION_COMPLETED]: [
    CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.CONCILIATION_SCHEDULED,
    CaseStatus.COURT_REFERRAL_ISSUED,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.CONCILIATION_SCHEDULED]: [
    CaseStatus.SETTLEMENT_OFFERED,
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
    CaseStatus.COURT_REFERRAL_ISSUED,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.SETTLEMENT_OFFERED]: [
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
    CaseStatus.COURT_REFERRAL_ISSUED,
    CaseStatus.CLOSED_WITHDRAWN,
  ],
  [CaseStatus.RESOLVED_MUTUALLY]: [
    CaseStatus.UNDER_INITIAL_REVIEW, // Only via administrative reopen
  ],
  [CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER]: [
    CaseStatus.UNDER_INITIAL_REVIEW, // Only via administrative reopen
  ],
  [CaseStatus.COURT_REFERRAL_ISSUED]: [
    CaseStatus.UNDER_INITIAL_REVIEW, // Only via administrative reopen
  ],
  [CaseStatus.CLOSED_OUTSIDE_JURISDICTION]: [
    CaseStatus.UNDER_INITIAL_REVIEW, // Only via administrative reopen
  ],
  [CaseStatus.CLOSED_WITHDRAWN]: [
    CaseStatus.UNDER_INITIAL_REVIEW, // Only via administrative reopen
  ],
};

export function isValidTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return true;
  const allowed = CASE_TRANSITION_MATRIX[from] || [];
  return allowed.includes(to);
}

export function assertValidTransition(from: CaseStatus, to: CaseStatus): void {
  if (!isValidTransition(from, to)) {
    throw new BadRequestException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Invalid state transition from '${from}' to '${to}'.`,
    });
  }
}

