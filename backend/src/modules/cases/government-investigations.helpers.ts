import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseStatus,
  ConversationKind,
  ParticipantRole,
  RoleCode,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { BusinessInvestigationResponseDto } from './dto/business-investigation-response.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

export const SUPERVISORY_ROLES: RoleCode[] = [
  RoleCode.SYSTEM_SUPERADMIN,
  RoleCode.BUREAU_ADMIN,
  RoleCode.SUBCITY_COORDINATOR,
  RoleCode.WOREDA_ADMIN,
];

export function validateInspectionCompletion(
  dto: UpdateInspectionDto,
  inspection: { summary?: string | null; actionTaken?: string | null; findings: any[] },
): void {
  if (!dto.isCompleted) return;

  const summary = dto.summary?.trim() || inspection.summary;
  const actionTaken = dto.actionTaken?.trim() || inspection.actionTaken;

  if (!summary || summary.length < 5) {
    throw new BadRequestException({
      code: 'COMPLETION_MISSING_SUMMARY',
      message: 'Inspection completion requires a comprehensive summary.',
    });
  }
  if (!actionTaken) {
    throw new BadRequestException({
      code: 'COMPLETION_MISSING_ACTION',
      message: 'Inspection completion requires documented action taken.',
    });
  }
  if (inspection.findings.length === 0) {
    throw new BadRequestException({
      code: 'COMPLETION_MISSING_FINDINGS',
      message: 'Inspection completion requires at least one recorded finding.',
    });
  }
}

export function formatInvestigationOverview(c: any) {
  const totalFindings = c.inspections.flatMap((i: any) => i.findings || []);
  const violationsCount = totalFindings.filter((f: any) => f.isViolation).length;

  return {
    reference: c.referenceNumber,
    status: c.status,
    holdingOffice: c.currentOffice?.nameEn || null,
    complainantAlias: c.complainantAlias,
    activeOfficer: c.assignments[0]?.assignedTo?.fullName || null,
    inspectionsCount: c.inspections.length,
    violationsCount,
    inspections: c.inspections,
    businessResponses: (c.conversations || []).flatMap((conv: any) =>
      (conv.messages || []).map((m: any) => ({
        id: m.id,
        sender: m.sender?.fullName || 'Business Representative',
        content: m.content,
        sentAt: new Date(m.sentAt).toISOString(),
      })),
    ),
    investigationTimeline: (c.history || []).map((h: any) => ({
      status: h.toStatus,
      note: h.publicNote,
      date: new Date(h.createdAt).toISOString(),
    })),
  };
}

export async function executeBusinessInvestigationResponse(
  prisma: PrismaService,
  userId: string,
  reference: string,
  dto: BusinessInvestigationResponseDto,
) {
  const mu = await prisma.merchantUser.findFirst({
    where: { userId },
    include: { merchant: true },
  });

  if (!mu || !mu.merchant || !mu.merchant.isActive) {
    throw new ForbiddenException({
      code: 'NOT_AUTHORIZED_MERCHANT',
      message: 'Authenticated user is not an active merchant member.',
    });
  }

  const c = await prisma.case.findUnique({
    where: { referenceNumber: reference },
    include: { currentOffice: true },
  });

  if (!c || c.merchantId !== mu.merchantId) {
    throw new NotFoundException({
      code: 'CASE_NOT_FOUND',
      message: 'Case not found for your business account.',
    });
  }

  const allowedStatuses: CaseStatus[] = [
    CaseStatus.INSPECTION_PENDING,
    CaseStatus.INSPECTION_ACTIVE,
    CaseStatus.INSPECTION_COMPLETED,
  ];
  if (!allowedStatuses.includes(c.status)) {
    throw new BadRequestException({
      code: 'INVESTIGATION_RESPONSE_NOT_ALLOWED',
      message: `Cannot submit investigation response when case is in status '${c.status}'.`,
    });
  }

  return prisma.$transaction(async (tx) => {
    let conv = await tx.conversation.findFirst({
      where: { caseId: c.id, kind: ConversationKind.BUSINESS_GOVERNMENT },
    });

    if (!conv) {
      conv = await tx.conversation.create({
        data: {
          caseId: c.id,
          kind: ConversationKind.BUSINESS_GOVERNMENT,
          participants: { create: [{ userId, role: ParticipantRole.MERCHANT }] },
        },
      });
    } else {
      const participant = await tx.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
      });
      if (!participant) {
        await tx.conversationParticipant.create({
          data: { conversationId: conv.id, userId, role: ParticipantRole.MERCHANT },
        });
      }
    }

    const msg = await tx.message.create({
      data: { conversationId: conv.id, senderUserId: userId, content: dto.statement.trim() },
    });

    await tx.caseHistory.create({
      data: {
        caseId: c.id,
        fromStatus: c.status,
        toStatus: c.status,
        handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
        officeId: c.currentOfficeId,
        actorUserId: userId,
        publicNote: 'Business submitted formal response to government investigation.',
      },
    });

    await tx.caseAuditLog.create({
      data: {
        caseId: c.id,
        actorId: userId,
        actionCode: 'BUSINESS_INVESTIGATION_RESPONSE',
        fieldName: 'messageId',
        newValue: msg.id,
      },
    });

    return {
      success: true,
      reference: c.referenceNumber,
      messageId: msg.id,
      sentAt: msg.sentAt.toISOString(),
    };
  });
}

