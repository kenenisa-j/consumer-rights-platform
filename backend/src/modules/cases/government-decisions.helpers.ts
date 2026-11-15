import {
  CaseStatus,
  RoleCode,
} from '@prisma/client';

export const SUPERVISORY_ROLES: RoleCode[] = [
  RoleCode.SYSTEM_SUPERADMIN,
  RoleCode.BUREAU_ADMIN,
  RoleCode.SUBCITY_COORDINATOR,
  RoleCode.WOREDA_ADMIN,
];

export const RESOLVED_STATUSES: CaseStatus[] = [
  CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
  CaseStatus.RESOLVED_MUTUALLY,
  CaseStatus.COURT_REFERRAL_ISSUED,
  CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
  CaseStatus.CLOSED_WITHDRAWN,
];

export function parseDecisionAuditLogs(auditLogs: any[]) {
  const decisionLog = auditLogs.find((l) => l.actionCode === 'GOVERNMENT_DECISION_ISSUED');
  let decisionData: any = null;
  if (decisionLog?.newValue) {
    try {
      decisionData = JSON.parse(decisionLog.newValue);
    } catch {
      decisionData = { raw: decisionLog.newValue };
    }
  }

  const complianceLog = auditLogs.find((l) => l.actionCode === 'COMPLIANCE_VERIFIED');
  let complianceData: any = null;
  if (complianceLog?.newValue) {
    try {
      complianceData = JSON.parse(complianceLog.newValue);
    } catch {
      complianceData = { raw: complianceLog.newValue };
    }
  }

  return { decisionData, complianceData };
}

export function formatDecisionViewForParty(
  c: any,
  party: 'CONSUMER' | 'BUSINESS' | 'GOVERNMENT',
  decisionData: any,
  complianceData: any,
) {
  if (party === 'BUSINESS') {
    return {
      reference: c.referenceNumber,
      status: c.status,
      decision: decisionData
        ? {
            outcome: decisionData.outcome,
            correctiveAction: decisionData.correctiveAction,
            remedyInstruction: decisionData.remedyInstruction,
            complianceDeadline: decisionData.complianceDeadline,
            decisionDate: decisionData.decisionDate,
          }
        : null,
      compliance: complianceData,
    };
  }

  return {
    reference: c.referenceNumber,
    status: c.status,
    holdingOffice: c.currentOffice?.nameEn || null,
    complainantAlias: c.complainantAlias,
    decision: decisionData,
    compliance: complianceData,
    timeline: (c.history || []).map((h: any) => ({
      status: h.toStatus,
      note: h.publicNote,
      date: new Date(h.createdAt).toISOString(),
    })),
  };
}

