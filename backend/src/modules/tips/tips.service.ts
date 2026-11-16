import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CaseStatus,
  ComplaintRoute,
  OfficeLevel,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { TrackTipDto } from './dto/track-tip.dto';
import { PlanVisitDto } from './dto/plan-visit.dto';
import { ForwardTipDto } from './dto/forward-tip.dto';
import { ConvertTipDto } from './dto/convert-tip.dto';
import { CloseTipDto } from './dto/close-tip.dto';
import { resolveOfficerContext } from '../cases/government-cases.helpers';
import {
  generateFollowUpToken,
  hashFollowUpToken,
  verifyFollowUpToken,
  generateTipReference,
  resolveTipOffice,
  assertOfficerTipJurisdiction,
  buildOfficerTipWhere,
  formatGovTipSummary,
  resolveTipCategory,
  formatPublicTipTracking,
  formatGovTip,
} from './tips.helpers';

@Injectable()
export class TipsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: Submit an anonymous tip without an account. Generates token and stores only hash. */
  async submitTip(dto: CreateTipDto) {
    const office = await resolveTipOffice(this.prisma, dto.subcity, dto.woreda);
    const reference = await generateTipReference(this.prisma);
    const token = generateFollowUpToken();
    const tokenHash = hashFollowUpToken(token);

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.anonymousReport.create({
        data: {
          id: reference,
          category: dto.category.trim(),
          marketLocation: dto.marketLocation.trim(),
          targetBusinessName: dto.targetBusinessName?.trim() || null,
          marketId: dto.marketId || null,
          description: dto.description.trim(),
          destinationOfficeId: office.id,
          trackingTokenHash: tokenHash,
          status: 'received',
        },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: reference,
          actionCode: 'SUBMITTED',
          previousStatus: null,
          newStatus: 'received',
          internalNotes: 'Anonymous report submitted via Tikoma portal',
        },
      });

      return created;
    });

    return {
      reference: report.id,
      trackingCode: token,
      receivedAt: report.createdAt,
      destinationOffice: office.nameEn,
    };
  }

  /** Public: Track an anonymous tip by reference and token. Fails closed with 404 on mismatch. */
  async trackTip(dto: TrackTipDto) {
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: dto.reference },
      include: {
        destinationOffice: true,
        convertedCase: true,
      },
    });

    if (!report || !verifyFollowUpToken(dto.code, report.trackingTokenHash)) {
      throw new NotFoundException({
        code: 'TIP_NOT_FOUND',
        message: 'No matching anonymous report found for the provided reference and tracking code.',
      });
    }

    return formatPublicTipTracking(report);
  }

  /** Government: List tips within the officer's administrative jurisdiction. */
  async listGovernmentTips(actorUserId: string, query?: any) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where = buildOfficerTipWhere(actor, query);

    const reports = await this.prisma.anonymousReport.findMany({
      where,
      include: {
        destinationOffice: true,
        convertedCase: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tips: reports.map(formatGovTipSummary) };
  }

  /** Government: Get full tip details scoped to officer's jurisdiction; fails closed with 404. */
  async getGovernmentTip(actorUserId: string, reference: string) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: reference },
      include: {
        destinationOffice: true,
        convertedCase: true,
        auditLogs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!report) {
      throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    }

    assertOfficerTipJurisdiction(actor, report.destinationOffice);

    return { tip: formatGovTip(report, actor.level || OfficeLevel.WOREDA) };
  }

  /** Government: Woreda officer plans an on-site inspection/visit. */
  async planVisit(actorUserId: string, reference: string, dto: PlanVisitDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: reference },
      include: { destinationOffice: true },
    });

    if (!report) {
      throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    }

    assertOfficerTipJurisdiction(actor, report.destinationOffice);

    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Cannot plan visit for a closed tip.' });
    }

    const nextStatus = 'follow_up_planned';
    const notesText = `Visit scheduled: ${dto.scheduledDate}. Officer: ${dto.assignedOfficer}. Notes: ${dto.notes}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.anonymousReport.update({
        where: { id: reference },
        data: { status: nextStatus },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: reference,
          actionCode: 'VISIT_PLANNED',
          previousStatus: report.status,
          newStatus: nextStatus,
          internalNotes: `[Officer: ${actor.userId}] ${notesText}`,
        },
      });
    });

    return { success: true, status: nextStatus, message: 'Visit planned successfully.' };
  }

  /** Government: Sub-City or Bureau forwards tip to subordinate Woreda office. */
  async forwardTip(actorUserId: string, reference: string, dto: ForwardTipDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: reference },
      include: { destinationOffice: true },
    });

    if (!report) {
      throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    }

    assertOfficerTipJurisdiction(actor, report.destinationOffice);

    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Cannot forward a closed tip.' });
    }

    let targetOffice = null;
    if (dto.destinationOfficeId) {
      targetOffice = await this.prisma.administrativeOffice.findUnique({
        where: { id: dto.destinationOfficeId },
      });
    } else if (dto.woredaCode) {
      targetOffice = await this.prisma.administrativeOffice.findFirst({
        where: {
          level: OfficeLevel.WOREDA,
          isActive: true,
          OR: [
            { woredaCode: dto.woredaCode },
            { nameEn: { contains: dto.woredaCode, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!targetOffice) {
      throw new NotFoundException({ code: 'TARGET_OFFICE_NOT_FOUND', message: 'Target Woreda office not found.' });
    }

    const nextStatus = 'under_review';
    const notesText = dto.notes ? `Forwarded to ${targetOffice.nameEn}: ${dto.notes}` : `Forwarded to ${targetOffice.nameEn}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.anonymousReport.update({
        where: { id: reference },
        data: {
          destinationOfficeId: targetOffice.id,
          status: nextStatus,
        },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: reference,
          actionCode: 'FORWARDED_TO_WOREDA',
          previousStatus: report.status,
          newStatus: nextStatus,
          internalNotes: `[Officer: ${actor.userId}] ${notesText}`,
        },
      });
    });

    return { success: true, forwardedTo: targetOffice.nameEn, status: nextStatus };
  }

  /** Government: Convert an anonymous tip into a formal Direct Government complaint. */
  async convertToCase(actorUserId: string, reference: string, dto: ConvertTipDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: reference },
      include: { destinationOffice: true },
    });

    if (!report) {
      throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    }

    assertOfficerTipJurisdiction(actor, report.destinationOffice);

    if (report.convertedCaseId) {
      throw new BadRequestException({
        code: 'TIP_ALREADY_CONVERTED',
        message: 'This anonymous tip has already been converted to an official case.',
      });
    }

    const category = await resolveTipCategory(this.prisma, dto.categoryId, report.category);

    const year = new Date().getFullYear();
    const caseCount = await this.prisma.case.count();
    const caseReference = `CC-${year}-${String(caseCount + 1).padStart(5, '0')}`;

    const createdCase = await this.prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          referenceNumber: caseReference,
          route: ComplaintRoute.DIRECT_GOVERNMENT,
          complainantId: actor.userId,
          complainantAlias: 'Anonymous Reporter',
          unregisteredMerchantLocation: report.marketLocation,
          itemDescription: `[Converted from Anonymous Tip ${report.id}] ${report.description}`,
          disputedAmount: 0,
          currency: 'ETB',
          desiredRemedy: 'Government inspection and regulatory enforcement.',
          status: CaseStatus.RECEIVED_BY_OFFICE,
          categoryId: category.id,
          currentOfficeId: report.destinationOfficeId,
          incidentDate: report.createdAt,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: newCase.id,
          fromStatus: null,
          toStatus: CaseStatus.RECEIVED_BY_OFFICE,
          handlingLevel: report.destinationOffice?.level ? report.destinationOffice.level.toLowerCase() : 'woreda',
          officeId: report.destinationOfficeId,
          actorUserId: actor.userId,
          publicNote: `Converted from anonymous report ${report.id}.`,
        },
      });

      await tx.anonymousReport.update({
        where: { id: reference },
        data: {
          convertedCaseId: newCase.id,
          status: 'converted_to_case',
        },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: reference,
          actionCode: 'CONVERTED_TO_CASE',
          previousStatus: report.status,
          newStatus: 'converted_to_case',
          internalNotes: `[Officer: ${actor.userId}] ${dto.notes ? `Converted to case ${caseReference}: ${dto.notes}` : `Converted to case ${caseReference}`}`,
        },
      });

      return newCase;
    });

    return {
      success: true,
      caseId: createdCase.id,
      caseReference: createdCase.referenceNumber,
      message: 'Anonymous tip successfully converted to official case.',
    };
  }

  /** Government: Conclude and close an anonymous tip. */
  async closeTip(actorUserId: string, reference: string, dto: CloseTipDto) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findUnique({
      where: { id: reference },
      include: { destinationOffice: true },
    });

    if (!report) {
      throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    }

    assertOfficerTipJurisdiction(actor, report.destinationOffice);

    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Tip is already closed.' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.anonymousReport.update({
        where: { id: reference },
        data: { status: dto.result },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: reference,
          actionCode: 'TIP_CLOSED',
          previousStatus: report.status,
          newStatus: dto.result,
          internalNotes: `[Officer: ${actor.userId}] ${dto.notes ? `Closed (${dto.result}): ${dto.notes}` : `Closed (${dto.result})`}`,
        },
      });
    });

    return { success: true, status: dto.result, message: 'Tip closed successfully.' };
  }
}
