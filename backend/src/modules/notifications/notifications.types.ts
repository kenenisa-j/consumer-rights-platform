export enum NotificationType {
  COMPLAINT_SUBMITTED = 'COMPLAINT_SUBMITTED',
  NEW_COMPLAINT_FILED = 'NEW_COMPLAINT_FILED',
  BUSINESS_RESPONSE = 'BUSINESS_RESPONSE',
  SETTLEMENT_OFFERED = 'SETTLEMENT_OFFERED',
  SETTLEMENT_ACCEPTED = 'SETTLEMENT_ACCEPTED',
  SETTLEMENT_REJECTED = 'SETTLEMENT_REJECTED',
  CASE_ESCALATED = 'CASE_ESCALATED',
  OFFICER_ASSIGNED = 'OFFICER_ASSIGNED',
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  DECISION_ISSUED = 'DECISION_ISSUED',
  RESOLUTION_UPDATED = 'RESOLUTION_UPDATED',
  COMPLIANCE_VERIFIED = 'COMPLIANCE_VERIFIED',
  CASE_CLOSED = 'CASE_CLOSED',
  CASE_REOPENED = 'CASE_REOPENED',
  TRANSFER_INITIATED = 'TRANSFER_INITIATED',
  TRANSFER_ACCEPTED = 'TRANSFER_ACCEPTED',
  TRANSFER_RETURNED = 'TRANSFER_RETURNED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
}

export interface CaseLifecycleEvent {
  type: NotificationType;
  caseId: string;
  referenceNumber: string;
  actorUserId?: string;
  complainantId?: string;
  complainantAlias?: string;
  merchantId?: string;
  officeId?: string;
  targetOfficerId?: string;
  targetOfficeId?: string;
  details?: {
    customTitle?: string;
    customMessage?: string;
    offerAmount?: number;
    decisionOutcome?: string;
    reason?: string;
    deadline?: string;
  };
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  persisted: boolean;
  note?: string;
}

