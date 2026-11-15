import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CaseStatus,
  Prisma,
  RoleCode,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import {
  resolveOfficerContext,
  assertOfficerJurisdiction,
} from './government-cases.helpers';
import {
  SUPERVISORY_ROLES,
  RESOLVED_STATUSES,
  parseDecisionAuditLogs,
  formatDecisionViewForParty,
} from './government-decisions.helpers';
import {
  IssueDecisionDto,
  DecisionOutcome,
  FinalStatusTarget,
} from './dto/issue-decision.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';
import { VerifyComplianceDto } from './dto/verify-compliance.dto';
import { CloseCaseDto, CaseClosureReason } from './dto/close-case.dto';
import { ReopenCaseDto } from './dto/reopen-case.dto';

@Injectable()
export class GovernmentDecisionsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueDecision(actorUserId: string, reference: string, dto: IssueDecisionDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        currentOffice: true,
        inspections: { include: { findings: true } },
        assignments: { where: { isActive: true } },
      },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (RESOLVED_STATUSES.includes(c.status)) {
      throw new BadRequestException({
        code: 'DECISION_ALREADY_ISSUED',
        message: 'A final decision has already been issued for this case.',
      });
    }

    if (
      c.status !== CaseStatus.INSPECTION_COMPLETED &&
      c.status !== CaseStatus.UNDER_INITIAL_REVIEW
    ) {
      throw new BadRequestException({
        code: 'INVESTIGATION_NOT_READY',
        message: `Case in status '${c.status}' is not ready for decision. Investigation must be completed.`,
      });
    }

    const nextStatus = dto.statusTarget as unknown as CaseStatus;
    const handlingLevel = c.currentOffice?.level.toLowerCase() || 'woreda';

    return this.prisma.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: c.id },
        data: { status: nextStatus },
      });

      const publicNote = `Decision: ${dto.outcome}. ${dto.reasoning}${
        dto.remedyInstruction ? ` Remedy: ${dto.remedyInstruction}` : ''
      }${dto.correctiveAction ? ` Corrective action: ${dto.correctiveAction}` : ''}`;

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel,
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'GOVERNMENT_DECISION_ISSUED',
          fieldName: 'decisionData',
          newValue: JSON.stringify({
            outcome: dto.outcome,
            statusTarget: dto.statusTarget,
            reasoning: dto.reasoning,
            correctiveAction: dto.correctiveAction || null,
            remedyInstruction: dto.remedyInstruction || null,
            complianceDeadline: dto.complianceDeadline || null,
            decisionDate: new Date().toISOString(),
          }),
        },
      });

      return {
        success: true,
        reference: c.referenceNumber,
        status: nextStatus,
        outcome: dto.outcome,
        decisionDate: new Date().toISOString(),
      };
    });
  }

  async updateResolution(actorUserId: string, reference: string, dto: UpdateResolutionDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (
      c.status !== CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER &&
      c.status !== CaseStatus.CONCILIATION_SCHEDULED
    ) {
      throw new BadRequestException({
        code: 'INVALID_RESOLUTION_STATE',
        message: 'Resolution instructions can only be updated for active orders or conciliations.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'RESOLUTION_UPDATED',
          fieldName: 'resolutionTerms',
          newValue: JSON.stringify(dto),
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Resolution terms updated. Remedy: ${dto.remedyInstruction || 'Unchanged'}. Deadline: ${
            dto.complianceDeadline || 'Unchanged'
          }`,
        },
      });

      return { success: true, reference: c.referenceNumber };
    });
  }

  async verifyCompliance(actorUserId: string, reference: string, dto: VerifyComplianceDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (c.status !== CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER) {
      throw new BadRequestException({
        code: 'INVALID_COMPLIANCE_STATE',
        message: 'Compliance verification requires an active administrative order.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'COMPLIANCE_VERIFIED',
          fieldName: 'complianceResult',
          newValue: JSON.stringify({
            isComplied: dto.isComplied,
            verificationNotes: dto.verificationNotes,
            penaltyNotice: dto.penaltyNotice || null,
            verifiedAt: new Date().toISOString(),
          }),
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Compliance verification: ${dto.isComplied ? 'COMPLIED' : 'NON_COMPLIANT'}. ${
            dto.verificationNotes
          }`,
        },
      });

      return {
        success: true,
        reference: c.referenceNumber,
        isComplied: dto.isComplied,
      };
    });
  }

  async closeCase(actorUserId: string, reference: string, dto: CloseCaseDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (c.status === CaseStatus.INSPECTION_PENDING || c.status === CaseStatus.INSPECTION_ACTIVE) {
      throw new BadRequestException({
        code: 'INVESTIGATION_INCOMPLETE',
        message: 'Cannot close a case while an inspection or investigation is active.',
      });
    }

    let nextStatus = c.status;
    if (dto.closureReason === CaseClosureReason.OUTSIDE_JURISDICTION) {
      nextStatus = CaseStatus.CLOSED_OUTSIDE_JURISDICTION;
    } else if (dto.closureReason === CaseClosureReason.WITHDRAWN_BY_CONSUMER) {
      nextStatus = CaseStatus.CLOSED_WITHDRAWN;
    }

    return this.prisma.$transaction(async (tx) => {
      if (nextStatus !== c.status) {
        await tx.case.update({ where: { id: c.id }, data: { status: nextStatus } });
      }

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Case closed. Reason: ${dto.closureReason}. ${dto.closureNotes}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'CASE_CLOSED',
          fieldName: 'closureData',
          newValue: JSON.stringify(dto),
        },
      });

      return {
        success: true,
        reference: c.referenceNumber,
        status: nextStatus,
        isClosed: true,
      };
    });
  }

  async reopenCase(actorUserId: string, reference: string, dto: ReopenCaseDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const isSupervisor = actor.govRole && SUPERVISORY_ROLES.includes(actor.govRole);

    if (!isSupervisor) {
      throw new ForbiddenException({
        code: 'REOPEN_UNAUTHORIZED',
        message: 'Only an office administrator can reopen a closed complaint.',
      });
    }

    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (!RESOLVED_STATUSES.includes(c.status)) {
      throw new BadRequestException({
        code: 'CASE_NOT_CLOSED',
        message: 'Only resolved or closed cases can be reopened.',
      });
    }

    const nextStatus = CaseStatus.UNDER_INITIAL_REVIEW;
    return this.prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: c.id }, data: { status: nextStatus } });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Case reopened: ${dto.reopenReason}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'CASE_REOPENED',
          fieldName: 'reopenReason',
          newValue: dto.reopenReason,
        },
      });

      return { success: true, reference: c.referenceNumber, status: nextStatus };
    });
  }

  async getCaseDecision(actorUserId: string, reference: string, party: 'CONSUMER' | 'BUSINESS' | 'GOVERNMENT') {
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        currentOffice: true,
        auditLogs: {
          where: {
            actionCode: {
              in: [
                'GOVERNMENT_DECISION_ISSUED',
                'RESOLUTION_UPDATED',
                'COMPLIANCE_VERIFIED',
                'CASE_CLOSED',
                'CASE_REOPENED',
              ],
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });

    if (party === 'CONSUMER' && c.complainantId !== actorUserId) {
      throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    }

    if (party === 'BUSINESS') {
      const mu = await this.prisma.merchantUser.findFirst({
        where: { userId: actorUserId, merchantId: c.merchantId || undefined },
      });
      if (!mu || !c.merchantId) {
        throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
      }
    }

    if (party === 'GOVERNMENT') {
      const actor = await resolveOfficerContext(this.prisma, actorUserId);
      assertOfficerJurisdiction(actor, c.currentOffice);
    }

    const { decisionData, complianceData } = parseDecisionAuditLogs(c.auditLogs);
    return formatDecisionViewForParty(c, party, decisionData, complianceData);
  }
}

