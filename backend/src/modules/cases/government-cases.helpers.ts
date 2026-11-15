import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CaseStatus,
  OfficeLevel,
  Prisma,
  RoleCode,
  TransferStatus,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { TriageCaseDto } from './dto/triage-case.dto';
import { AssignOfficerDto } from './dto/assign-officer.dto';

export const GOV_ROLES: RoleCode[] = [
  RoleCode.SYSTEM_SUPERADMIN,
  RoleCode.BUREAU_ADMIN,
  RoleCode.BUREAU_OFFICER,
  RoleCode.SUBCITY_COORDINATOR,
  RoleCode.WOREDA_ADMIN,
  RoleCode.WOREDA_OFFICER,
];

export interface OfficerContext {
  userId: string;
  govRole: RoleCode | null;
  officeId: string | null;
  level: OfficeLevel | null;
  subcityCode: string | null;
  office: any;
}

export async function resolveOfficerContext(
  prisma: PrismaService,
  actorUserId: string,
): Promise<OfficerContext> {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: {
      roles: { include: { role: true } },
      offices: { where: { isActive: true }, include: { office: true }, take: 1 },
    },
  });

  if (!actor) {
    throw new ForbiddenException({ code: 'ACTOR_NOT_FOUND', message: 'User not found.' });
  }

  const userRoles = actor.roles.map((r: any) => r.role.code as RoleCode);
  const govRole = userRoles.find((code: RoleCode) => GOV_ROLES.includes(code)) || null;

  if (!govRole) {
    throw new ForbiddenException({
      code: 'NOT_GOVERNMENT_OFFICER',
      message: 'User does not possess a government staff role.',
    });
  }

  const activeOffice = actor.offices[0]?.office || null;
  if (!activeOffice && govRole !== RoleCode.SYSTEM_SUPERADMIN) {
    throw new ForbiddenException({
      code: 'NO_ACTIVE_OFFICE_DEPLOYMENT',
      message: 'Government staff must have an active office deployment.',
    });
  }

  return {
    userId: actor.id,
    govRole,
    officeId: activeOffice?.id || null,
    level: activeOffice?.level || null,
    subcityCode: activeOffice?.subcityCode || null,
    office: activeOffice,
  };
}

export function assertOfficerJurisdiction(
  actor: OfficerContext,
  office: { id: string; subcityCode?: string | null } | null,
): void {
  if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
    return;
  }

  if (!office) {
    throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found in jurisdiction.' });
  }

  if (actor.level === OfficeLevel.SUBCITY) {
    if (office.subcityCode && office.subcityCode === actor.subcityCode) return;
    throw new NotFoundException({
      code: 'CASE_NOT_FOUND',
      message: 'Case not found within your Sub-City jurisdiction.',
    });
  }

  if (actor.level === OfficeLevel.WOREDA) {
    if (office.id === actor.officeId) return;
    throw new NotFoundException({
      code: 'CASE_NOT_FOUND',
      message: 'Case not found within your Woreda jurisdiction.',
    });
  }

  throw new NotFoundException({
    code: 'CASE_NOT_FOUND',
    message: 'Case not found within your administrative jurisdiction.',
  });
}

export function formatCaseSummary(c: any) {
  return {
    id: c.id,
    referenceNumber: c.referenceNumber,
    route: c.route,
    complainantAlias: c.complainantAlias,
    category: c.category?.nameEn || '',
    itemDescription: c.itemDescription,
    disputedAmount: Number(c.disputedAmount),
    currency: c.currency,
    status: c.status,
    merchantName: c.merchant?.tradeName || c.unregisteredMerchantName || null,
    officeName: c.currentOffice?.nameEn || null,
    officeLevel: c.currentOffice?.level || null,
    assignedOfficer: c.assignments?.[0]?.assignedTo?.fullName || null,
    isPendingAcceptance: (c.transfers?.length || 0) > 0,
    slaDeadline: c.slaDeadline ? new Date(c.slaDeadline).toISOString() : null,
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

export function formatCaseDetails(c: any) {
  return {
    reference: c.referenceNumber,
    route: c.route,
    status: c.status,
    complainantAlias: c.complainantAlias,
    category: c.category,
    itemDescription: c.itemDescription,
    disputedAmount: Number(c.disputedAmount),
    currency: c.currency,
    incidentDate: new Date(c.incidentDate).toISOString(),
    desiredRemedy: c.desiredRemedy,
    paymentMethod: c.paymentMethod,
    receiptAvailable: c.receiptAvailable,
    merchant: c.merchant,
    market: c.market,
    office: c.currentOffice,
    activeAssignment: c.assignments?.find((a: any) => a.isActive) || null,
    assignmentHistory: c.assignments || [],
    transfers: c.transfers || [],
    evidence: c.evidenceFiles || [],
    history: (c.history || []).map((h: any) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      handlingLevel: h.handlingLevel,
      actor: h.actor?.fullName || '',
      note: h.publicNote,
      createdAt: new Date(h.createdAt).toISOString(),
    })),
    slaDeadline: c.slaDeadline ? new Date(c.slaDeadline).toISOString() : null,
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

export async function executeAcceptTransferTx(
  tx: Prisma.TransactionClient,
  transfer: any,
  targetOffice: any,
  nextStatus: CaseStatus,
  handlingLevel: string,
  actorUserId: string,
  notes?: string,
) {
  await tx.caseAssignment.updateMany({
    where: { caseId: transfer.caseId, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });

  await tx.caseTransfer.update({
    where: { id: transfer.id },
    data: {
      status: TransferStatus.ACCEPTED,
      respondedByUserId: actorUserId,
      respondedAt: new Date(),
      responseNotes: notes?.trim() || 'Transfer accepted by receiving office.',
    },
  });

  await tx.case.update({
    where: { id: transfer.caseId },
    data: {
      currentOfficeId: targetOffice.id,
      status: nextStatus,
    },
  });

  await tx.caseHistory.create({
    data: {
      caseId: transfer.caseId,
      fromStatus: transfer.case.status,
      toStatus: nextStatus,
      handlingLevel,
      officeId: targetOffice.id,
      actorUserId,
      publicNote: notes?.trim() || `Accepted by ${targetOffice.nameEn}.`,
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: transfer.caseId,
      actorId: actorUserId,
      actionCode: 'TRANSFER_ACCEPTED',
      oldValue: transfer.fromOfficeId,
      newValue: targetOffice.id,
    },
  });

  return {
    success: true,
    status: nextStatus,
    newStatus: nextStatus,
    reference: transfer.case.referenceNumber,
    office: targetOffice.nameEn,
  };
}

export async function executeTriageCaseTx(
  tx: Prisma.TransactionClient,
  c: any,
  nextStatus: CaseStatus,
  handlingLevel: string,
  actorUserId: string,
  dto: TriageCaseDto,
) {
  await tx.case.update({
    where: { id: c.id },
    data: { status: nextStatus },
  });

  await tx.caseHistory.create({
    data: {
      caseId: c.id,
      fromStatus: c.status,
      toStatus: nextStatus,
      handlingLevel,
      officeId: c.currentOfficeId,
      actorUserId,
      publicNote: dto.notes?.trim() || 'Triage completed. Case placed under initial review.',
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: actorUserId,
      actionCode: 'CASE_TRIAGED',
      fieldName: 'priority',
      newValue: dto.priority || 'NORMAL',
    },
  });

  return {
    success: true,
    reference: c.referenceNumber,
    status: nextStatus,
  };
}

export async function executeAssignOfficerTx(
  tx: Prisma.TransactionClient,
  c: any,
  nextStatus: CaseStatus,
  handlingLevel: string,
  actorUserId: string,
  targetOfficer: any,
  dto: AssignOfficerDto,
  isReassignment: boolean,
) {
  await tx.caseAssignment.updateMany({
    where: { caseId: c.id, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });

  const assignment = await tx.caseAssignment.create({
    data: {
      caseId: c.id,
      assignedToUserId: dto.officerId,
      assignedByUserId: actorUserId,
      officeId: c.currentOfficeId!,
      isActive: true,
    },
  });

  await tx.case.update({
    where: { id: c.id },
    data: { status: nextStatus },
  });

  const note = isReassignment
    ? `Case reassigned to officer ${targetOfficer.fullName}.${dto.notes ? ` Notes: ${dto.notes.trim()}` : ''}`
    : `Case assigned to officer ${targetOfficer.fullName}.${dto.notes ? ` Notes: ${dto.notes.trim()}` : ''}`;

  await tx.caseHistory.create({
    data: {
      caseId: c.id,
      fromStatus: c.status,
      toStatus: nextStatus,
      handlingLevel,
      officeId: c.currentOfficeId,
      actorUserId,
      publicNote: note,
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: actorUserId,
      actionCode: isReassignment ? 'OFFICER_REASSIGNED' : 'OFFICER_ASSIGNED',
      fieldName: 'assignedToUserId',
      newValue: dto.officerId,
    },
  });

  return {
    success: true,
    assignmentId: assignment.id,
    reference: c.referenceNumber,
    assignedOfficer: targetOfficer.fullName,
    status: nextStatus,
  };
}

export const GOVERNMENT_CASE_SUMMARY_INCLUDE = {
  category: { select: { id: true, code: true, nameEn: true, nameAm: true } },
  merchant: { select: { id: true, tradeName: true } },
  currentOffice: { select: { id: true, code: true, nameEn: true, nameAm: true, level: true } },
  assignments: {
    where: { isActive: true },
    take: 1,
    include: { assignedTo: { select: { id: true, fullName: true } } },
  },
  transfers: {
    where: { status: TransferStatus.PENDING_ACCEPTANCE },
    take: 1,
  },
};

export const GOVERNMENT_CASE_DETAIL_INCLUDE = {
  category: true,
  merchant: true,
  market: true,
  currentOffice: true,
  assignments: {
    orderBy: { assignedAt: 'desc' as const },
    include: {
      assignedTo: { select: { id: true, fullName: true, phoneNumber: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
  },
  transfers: {
    orderBy: { transferredAt: 'desc' as const },
    include: {
      fromOffice: { select: { id: true, code: true, nameEn: true, level: true } },
      toOffice: { select: { id: true, code: true, nameEn: true, level: true } },
      initiatedBy: { select: { id: true, fullName: true } },
      respondedBy: { select: { id: true, fullName: true } },
    },
  },
  evidenceFiles: {
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, isOfficerOnly: true, createdAt: true },
  },
  history: {
    orderBy: { createdAt: 'desc' as const },
    include: { actor: { select: { id: true, fullName: true } } },
  },
};
