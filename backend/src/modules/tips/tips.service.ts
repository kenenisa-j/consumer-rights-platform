import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CaseStatus, ComplaintRoute, OfficeLevel } from '@prisma/client';
import { formatReference } from '@consumer-rights/contracts';
import { PrismaService } from '../../lib/database/prisma.service';
import { officeScopeOf } from '../../lib/common/office-scope';
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
  resolveTipOffice,
  assertOfficerTipJurisdiction,
  buildOfficerTipWhere,
  formatGovTipSummary,
  resolveTipCategory,
  formatPublicTipTracking,
  formatGovTip,
  ScopedTipReport,
} from './tips.helpers';

@Injectable()
export class TipsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves and verifies officer jurisdiction on a tip; fails closed with 404. */
  private async findOfficerTip(actorUserId: string, reference: string, includeLogs = false) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const report = await this.prisma.anonymousReport.findFirst({
      where: { OR: [{ referenceNumber: reference }, { id: reference }] },
      include: {
        destinationOffice: true,
        convertedCase: true,
        ...(includeLogs ? { auditLogs: { orderBy: { timestamp: 'desc' } } } : {}),
      },
    });
    if (!report) throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found.' });
    assertOfficerTipJurisdiction(actor, report.destinationOffice);
    return { actor, report };
  }

  /** Public: Submit an anonymous tip without an account. Generates token and stores only hash. */
  async submitTip(dto: CreateTipDto) {
    const category = (dto.category || dto.kind || 'Something else').trim();
    const marketLocation = (dto.marketLocation || dto.place || '').trim();
    const description = (dto.description || dto.text || '').trim();
    const subcity = (dto.subcity || '').trim();
    const woreda = dto.woreda !== undefined && dto.woreda !== '' ? String(dto.woreda).trim() : undefined;
    const targetBusinessName = (dto.targetBusinessName || dto.business || '').trim() || null;
    const product = (dto.product || '').trim() || null;
    const isAnonymous = dto.anonymous !== false && !dto.name && !dto.contactName;
    const contactName = isAnonymous ? null : (dto.contactName || dto.name || '').trim() || null;
    const contactPhone = isAnonymous ? null : (dto.contactPhone || dto.phone || '').trim() || null;

    if (marketLocation.length < 3) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'Tell us where.', fields: { place: 'Tell us where.' } });
    }
    if (description.length < 10) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'Describe what you saw in a few words.', fields: { text: 'Describe what you saw in a few words.' } });
    }
    if (!isAnonymous && (!contactName || !contactPhone)) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'Write your name and phone, or stay anonymous.', fields: { name: 'Write your name and phone, or stay anonymous.' } });
    }

    let seenOn: Date | null = null;
    const rawWhen = dto.seenOn || dto.when;
    if (rawWhen !== undefined && rawWhen !== null && rawWhen !== '') {
      const d = new Date(rawWhen);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException({ code: 'INVALID_DATE', message: 'The submitted date is invalid.', fields: { when: 'The submitted date is invalid.' } });
      }
      if (d.getTime() > Date.now() + 60_000) {
        throw new BadRequestException({ code: 'FUTURE_DATE', message: 'The incident date cannot be in the future.', fields: { when: 'The incident date cannot be in the future.' } });
      }
      seenOn = d;
    }

    const office = await resolveTipOffice(this.prisma, subcity, woreda);
    const token = generateFollowUpToken();
    const tokenHash = hashFollowUpToken(token);

    const report = await this.prisma.$transaction(async (tx) => {
      const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(new Date()));
      let sequenceNum: number;
      try {
        const rawRes = await tx.$queryRaw<{ last_val: number }[]>`
          INSERT INTO annual_tip_sequences (year, last_val) VALUES (${year}, 1)
          ON CONFLICT (year) DO UPDATE SET last_val = annual_tip_sequences.last_val + 1 RETURNING last_val`;
        sequenceNum = Number(rawRes[0].last_val);
      } catch (rawErr: any) {
        if ((tx as any).annualTipSequence) {
          const seq = await (tx as any).annualTipSequence.upsert({
            where: { year },
            update: { lastVal: { increment: 1 } },
            create: { year, lastVal: 1 },
          });
          sequenceNum = seq.lastVal;
        } else {
          throw rawErr;
        }
      }

      const referenceNumber = formatReference('tip', year, sequenceNum);
      const created = await tx.anonymousReport.create({
        data: {
          referenceNumber,
          trackingTokenHash: tokenHash,
          category,
          marketLocation,
          targetBusinessName,
          product,
          description,
          seenOn,
          subcityCode: office.subcityCode || subcity || null,
          woredaCode: office.woredaCode || (woreda ? String(woreda).padStart(2, '0') : null),
          destinationOfficeId: office.id,
          contactName,
          contactPhone,
          status: 'received',
          marketId: dto.marketId || null,
        },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: created.id,
          actionCode: 'SUBMITTED',
          previousStatus: null,
          newStatus: 'received',
          internalNotes: 'Anonymous report submitted via Tikoma portal',
        },
      });

      return created;
    });

    return {
      reference: report.referenceNumber || report.id,
      code: token,
      trackingCode: token,
      receivedAt: report.createdAt.toISOString(),
      destinationOffice: office.nameEn,
      anonymous: isAnonymous,
    };
  }

  /** Public: Track an anonymous tip by reference and token. Fails closed with 404 on mismatch. */
  async trackTip(dto: TrackTipDto) {
    const report = await this.prisma.anonymousReport.findFirst({
      where: {
        OR: [
          { referenceNumber: dto.reference.trim().toUpperCase() },
          { referenceNumber: dto.reference.trim() },
          { id: dto.reference.trim() },
        ],
      },
      include: { destinationOffice: true, convertedCase: true },
    });

    if (!report || !verifyFollowUpToken(dto.code, report.trackingTokenHash)) {
      throw new NotFoundException({
        code: 'TIP_NOT_FOUND',
        message: 'No matching anonymous report found for the provided reference and tracking code.',
      });
    }

    return formatPublicTipTracking(report);
  }

  /** Officer: List tips scoped to the officer's administrative office and subordinate offices. */
  async listOfficeTips(actorUserId: string) {
    const scope = await officeScopeOf(this.prisma, actorUserId);
    const rows: ScopedTipReport[] = await this.prisma.anonymousReport.findMany({
      where: { destinationOfficeId: { in: scope.officeIds } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { destinationOffice: true },
    });
    return rows.map((t) => ({
      reference: t.referenceNumber || t.id,
      kind: t.category,
      place: t.marketLocation,
      business: t.targetBusinessName,
      product: t.product,
      text: t.description,
      status: t.status,
      receivedAt: t.createdAt.toISOString(),
      subcity: t.subcityCode,
      woreda: t.woredaCode,
      office: t.destinationOffice?.nameEn || 'Government Office',
      contact: t.contactName ? { name: t.contactName, phone: t.contactPhone } : null,
    }));
  }

  /** Government: List tips within the officer's administrative jurisdiction. */
  async listGovernmentTips(actorUserId: string, query?: any) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const where = buildOfficerTipWhere(actor, query);
    const reports = await this.prisma.anonymousReport.findMany({
      where,
      include: { destinationOffice: true, convertedCase: true },
      orderBy: { createdAt: 'desc' },
    });
    return { tips: reports.map(formatGovTipSummary) };
  }

  /** Government: Get full tip details scoped to officer's jurisdiction; fails closed with 404. */
  async getGovernmentTip(actorUserId: string, reference: string) {
    const { actor, report } = await this.findOfficerTip(actorUserId, reference, true);
    return { tip: formatGovTip(report, actor.level || OfficeLevel.WOREDA) };
  }

  /** Government: Woreda officer plans an on-site inspection/visit. */
  async planVisit(actorUserId: string, reference: string, dto: PlanVisitDto) {
    const { actor, report } = await this.findOfficerTip(actorUserId, reference);
    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Cannot plan visit for a closed tip.' });
    }

    const nextStatus = 'follow_up_planned';
    const notesText = `Visit scheduled: ${dto.scheduledDate}. Officer: ${dto.assignedOfficer}. Notes: ${dto.notes}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.anonymousReport.update({ where: { id: report.id }, data: { status: nextStatus } });
      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: report.id,
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
    const { actor, report } = await this.findOfficerTip(actorUserId, reference);
    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Cannot forward a closed tip.' });
    }

    let targetOffice = null;
    if (dto.destinationOfficeId) {
      targetOffice = await this.prisma.administrativeOffice.findUnique({ where: { id: dto.destinationOfficeId } });
    } else if (dto.woredaCode) {
      targetOffice = await this.prisma.administrativeOffice.findFirst({
        where: {
          level: OfficeLevel.WOREDA,
          isActive: true,
          OR: [{ woredaCode: dto.woredaCode }, { nameEn: { contains: dto.woredaCode, mode: 'insensitive' } }],
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
        where: { id: report.id },
        data: { destinationOfficeId: targetOffice.id, status: nextStatus },
      });
      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: report.id,
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
    const { actor, report } = await this.findOfficerTip(actorUserId, reference);
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
          itemDescription: `[Converted from Anonymous Tip ${report.referenceNumber || report.id}] ${report.description}`,
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
          publicNote: `Converted from anonymous report ${report.referenceNumber || report.id}.`,
        },
      });

      await tx.anonymousReport.update({
        where: { id: report.id },
        data: { convertedCaseId: newCase.id, status: 'converted_to_case' },
      });

      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: report.id,
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
    const { actor, report } = await this.findOfficerTip(actorUserId, reference);
    if (report.status === 'closed_action_taken' || report.status === 'closed_no_action') {
      throw new BadRequestException({ code: 'TIP_ALREADY_CLOSED', message: 'Tip is already closed.' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.anonymousReport.update({ where: { id: report.id }, data: { status: dto.result } });
      await tx.anonymousReportAuditLog.create({
        data: {
          reportId: report.id,
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
