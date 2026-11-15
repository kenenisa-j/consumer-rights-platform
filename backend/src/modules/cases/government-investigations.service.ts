import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { resolveOfficerContext, assertOfficerJurisdiction } from './government-cases.helpers';
import {
  SUPERVISORY_ROLES,
  validateInspectionCompletion,
  formatInvestigationOverview,
  executeBusinessInvestigationResponse,
} from './government-investigations.helpers';
import { StartInvestigationDto } from './dto/start-investigation.dto';
import { ScheduleInspectionDto } from './dto/schedule-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { SubmitInvestigationDto } from './dto/submit-investigation.dto';
import { BusinessInvestigationResponseDto } from './dto/business-investigation-response.dto';

@Injectable()
export class GovernmentInvestigationsService {
  constructor(private readonly prisma: PrismaService) {}

  async startInvestigation(actorUserId: string, reference: string, dto: StartInvestigationDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true, assignments: { where: { isActive: true } } },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    const activeAssignment = c.assignments.find((a) => a.isActive);
    if (!activeAssignment) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_ASSIGNMENT',
        message: 'An active officer assignment is required before starting an investigation.',
      });
    }

    const isAssigned = activeAssignment.assignedToUserId === actorUserId;
    const isSupervisor = actor.govRole && SUPERVISORY_ROLES.includes(actor.govRole);
    if (!isAssigned && !isSupervisor) {
      throw new ForbiddenException({
        code: 'NOT_ASSIGNED_OFFICER',
        message: 'Only the assigned officer or an office administrator may start this investigation.',
      });
    }

    if (
      c.status === CaseStatus.INSPECTION_PENDING ||
      c.status === CaseStatus.INSPECTION_ACTIVE ||
      c.status === CaseStatus.INSPECTION_COMPLETED
    ) {
      throw new BadRequestException({
        code: 'DUPLICATE_INVESTIGATION',
        message: 'Investigation is already in progress or completed for this case.',
      });
    }

    if (c.status !== CaseStatus.OFFICER_ASSIGNED) {
      throw new BadRequestException({
        code: 'INVALID_INVESTIGATION_STATE',
        message: `Cannot start investigation for case in status '${c.status}'.`,
      });
    }

    const nextStatus = CaseStatus.INSPECTION_PENDING;
    const handlingLevel = c.currentOffice?.level.toLowerCase() || 'woreda';

    return this.prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: c.id }, data: { status: nextStatus } });
      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel,
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: dto.notes?.trim() || 'Investigation initiated by government officer.',
        },
      });
      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'INVESTIGATION_STARTED',
          fieldName: 'status',
          oldValue: c.status,
          newValue: nextStatus,
        },
      });
      return {
        success: true,
        reference: c.referenceNumber,
        status: nextStatus,
        startedBy: actorUserId,
        startedAt: new Date().toISOString(),
      };
    });
  }

  async scheduleInspection(actorUserId: string, reference: string, dto: ScheduleInspectionDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    const allowedStatuses: CaseStatus[] = [
      CaseStatus.OFFICER_ASSIGNED,
      CaseStatus.INSPECTION_PENDING,
      CaseStatus.INSPECTION_ACTIVE,
    ];
    if (!allowedStatuses.includes(c.status)) {
      throw new BadRequestException({
        code: 'INVALID_INSPECTION_STATE',
        message: `Cannot schedule inspection for case in status '${c.status}'.`,
      });
    }

    const leadInspectorId = dto.leadInspectorId || actorUserId;
    const leadInspector = await this.prisma.user.findUnique({
      where: { id: leadInspectorId },
      include: { offices: { where: { isActive: true } } },
    });
    if (!leadInspector || leadInspector.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'INVALID_LEAD_INSPECTOR',
        message: 'Lead inspector does not exist or is inactive.',
      });
    }
    const deployedHere = leadInspector.offices.some((o) => o.officeId === c.currentOfficeId);
    if (!deployedHere) {
      throw new BadRequestException({
        code: 'INSPECTOR_NOT_IN_OFFICE',
        message: 'Lead inspector must be deployed to the holding office.',
      });
    }

    const nextCaseStatus = CaseStatus.INSPECTION_ACTIVE;
    const handlingLevel = c.currentOffice?.level.toLowerCase() || 'woreda';

    return this.prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          caseId: c.id,
          officeId: c.currentOfficeId!,
          leadInspectorId,
          inspectionDate: new Date(dto.inspectionDate),
          locationName: dto.locationName.trim(),
          inspectionType: dto.inspectionType.trim(),
          summary: dto.summary.trim(),
          actionTaken: dto.actionTaken?.trim() || null,
        },
      });

      if (c.status !== nextCaseStatus) {
        await tx.case.update({ where: { id: c.id }, data: { status: nextCaseStatus } });
        await tx.caseHistory.create({
          data: {
            caseId: c.id,
            fromStatus: c.status,
            toStatus: nextCaseStatus,
            handlingLevel,
            officeId: c.currentOfficeId,
            actorUserId,
            publicNote: `Inspection scheduled: ${dto.inspectionType} at ${dto.locationName}.`,
          },
        });
      }

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'INSPECTION_SCHEDULED',
          fieldName: 'inspectionId',
          newValue: inspection.id,
        },
      });
      return inspection;
    });
  }

  async getInspection(actorUserId: string, inspectionId: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        office: true,
        leadInspector: { select: { id: true, fullName: true, phoneNumber: true } },
        case: { select: { id: true, referenceNumber: true, status: true, currentOfficeId: true } },
        findings: true,
      },
    });
    if (!inspection) throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection not found.' });
    assertOfficerJurisdiction(actor, inspection.office);
    return inspection;
  }

  async updateInspection(actorUserId: string, inspectionId: string, dto: UpdateInspectionDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { office: true, case: true, findings: true },
    });
    if (!inspection) throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection not found.' });
    assertOfficerJurisdiction(actor, inspection.office);
    validateInspectionCompletion(dto, inspection);

    const data: Prisma.InspectionUpdateInput = {};
    if (dto.summary !== undefined) data.summary = dto.summary.trim();
    if (dto.actionTaken !== undefined) data.actionTaken = dto.actionTaken.trim();
    if (dto.locationName !== undefined) data.locationName = dto.locationName.trim();
    if (dto.inspectionDate) data.inspectionDate = new Date(dto.inspectionDate);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inspection.update({
        where: { id: inspectionId },
        data,
        include: { findings: true, leadInspector: { select: { id: true, fullName: true } } },
      });

      if (dto.isCompleted && inspection.case) {
        const nextCaseStatus = CaseStatus.INSPECTION_COMPLETED;
        await tx.case.update({ where: { id: inspection.case.id }, data: { status: nextCaseStatus } });
        await tx.caseHistory.create({
          data: {
            caseId: inspection.case.id,
            fromStatus: inspection.case.status,
            toStatus: nextCaseStatus,
            handlingLevel: inspection.office.level.toLowerCase(),
            officeId: inspection.officeId,
            actorUserId,
            publicNote: `Inspection completed: ${dto.actionTaken || updated.actionTaken}`,
          },
        });
        await tx.caseAuditLog.create({
          data: {
            caseId: inspection.case.id,
            actorId: actorUserId,
            actionCode: 'INSPECTION_COMPLETED',
            fieldName: 'inspectionId',
            newValue: inspectionId,
          },
        });
      }
      return updated;
    });
  }

  async recordFinding(actorUserId: string, inspectionId: string, dto: CreateFindingDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { office: true, case: true },
    });
    if (!inspection) throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection not found.' });
    assertOfficerJurisdiction(actor, inspection.office);

    return this.prisma.$transaction(async (tx) => {
      const finding = await tx.inspectionFinding.create({
        data: {
          inspectionId,
          metricName: dto.metricName.trim(),
          nominalValue: dto.nominalValue !== undefined ? new Prisma.Decimal(dto.nominalValue) : null,
          measuredValue: new Prisma.Decimal(dto.measuredValue),
          unit: dto.unit.trim(),
          isViolation: dto.isViolation,
          notes: dto.notes?.trim() || null,
        },
      });

      if (inspection.caseId) {
        await tx.caseAuditLog.create({
          data: {
            caseId: inspection.caseId,
            actorId: actorUserId,
            actionCode: 'INSPECTION_FINDING_RECORDED',
            fieldName: 'findingId',
            newValue: finding.id,
          },
        });
      }
      return finding;
    });
  }

  async getInvestigationDetails(actorUserId: string, reference: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        currentOffice: true,
        assignments: {
          where: { isActive: true },
          include: { assignedTo: { select: { id: true, fullName: true, phoneNumber: true } } },
        },
        inspections: {
          orderBy: { createdAt: 'desc' },
          include: { leadInspector: { select: { id: true, fullName: true } }, findings: true },
        },
        conversations: {
          where: { kind: 'BUSINESS_GOVERNMENT' as any },
          include: {
            messages: {
              orderBy: { sentAt: 'asc' },
              include: { sender: { select: { id: true, fullName: true } } },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          where: {
            toStatus: {
              in: [
                CaseStatus.INSPECTION_PENDING,
                CaseStatus.INSPECTION_ACTIVE,
                CaseStatus.INSPECTION_COMPLETED,
              ],
            },
          },
        },
      },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);
    return formatInvestigationOverview(c);
  }

  async submitInvestigation(actorUserId: string, reference: string, dto: SubmitInvestigationDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true, inspections: { include: { findings: true } } },
    });

    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    const hasCompletedInspection = c.inspections.some((i) => i.actionTaken && i.findings.length > 0);
    if (!hasCompletedInspection) {
      throw new BadRequestException({
        code: 'INCOMPLETE_INVESTIGATION',
        message: 'Investigation cannot be submitted without at least one completed inspection with findings.',
      });
    }

    const nextStatus = CaseStatus.INSPECTION_COMPLETED;
    const handlingLevel = c.currentOffice?.level.toLowerCase() || 'woreda';

    return this.prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: c.id }, data: { status: nextStatus } });
      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel,
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: dto.notes?.trim() || 'Investigation submitted for administrative review.',
        },
      });
      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'INVESTIGATION_SUBMITTED',
          fieldName: 'recommendation',
          newValue: dto.recommendation?.trim() || 'REVIEW_PENDING',
        },
      });
      return { success: true, reference: c.referenceNumber, status: nextStatus };
    });
  }

  async submitBusinessInvestigationResponse(
    userId: string,
    reference: string,
    dto: BusinessInvestigationResponseDto,
  ) {
    return executeBusinessInvestigationResponse(this.prisma, userId, reference, dto);
  }
}
