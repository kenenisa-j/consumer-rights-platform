import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  CaseStatus,
  ComplaintRoute,
  ConversationKind,
  OfferStatus,
  ParticipantRole,
  Prisma,
  SettlementType,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { QueryBusinessCasesDto } from './dto/query-business-cases.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { BusinessOfferDto } from './dto/business-offer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import {
  assertBusinessCanRespond,
  validateRefundOffer,
  mapBusinessComplaintSummary,
  mapBusinessComplaintDetails,
} from './business-cases.helpers';

@Injectable()
export class BusinessCasesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async resolveUserMerchant(userId: string) {
    const mu = await this.prisma.merchantUser.findFirst({
      where: { userId },
      include: {
        merchant: {
          select: { id: true, registrationNumber: true, tradeName: true, isActive: true },
        },
      },
    });

    if (!mu || !mu.merchant) {
      throw new ForbiddenException({
        code: 'NOT_A_BUSINESS_USER',
        message: 'Authenticated user is not linked to any registered business.',
      });
    }

    if (!mu.merchant.isActive) {
      throw new ForbiddenException({
        code: 'MERCHANT_INACTIVE',
        message: 'The associated business account is currently inactive.',
      });
    }

    return {
      merchantId: mu.merchant.id,
      tradeName: mu.merchant.tradeName,
      roleInBusiness: mu.roleInBusiness,
    };
  }

  async listBusinessComplaints(userId: string, query: QueryBusinessCasesDto) {
    const { merchantId } = await this.resolveUserMerchant(userId);

    const where: Prisma.CaseWhereInput = {
      merchantId,
      route: ComplaintRoute.REGISTERED_BUSINESS,
    };

    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { itemDescription: { contains: query.search, mode: 'insensitive' } },
        { complainantAlias: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const cases = await this.prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        route: true,
        complainantAlias: true,
        itemDescription: true,
        disputedAmount: true,
        currency: true,
        incidentDate: true,
        desiredRemedy: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        slaDeadline: true,
        category: {
          select: { id: true, code: true, nameEn: true, nameAm: true },
        },
        settlementOffers: {
          where: { status: OfferStatus.PENDING },
          take: 1,
          select: { id: true, offerType: true, refundAmount: true, expiresAt: true },
        },
      },
    });

    return cases.map(mapBusinessComplaintSummary);
  }

  async getBusinessComplaint(userId: string, reference: string) {
    const { merchantId, tradeName } = await this.resolveUserMerchant(userId);

    const c = await this.prisma.case.findFirst({
      where: {
        referenceNumber: reference,
        merchantId,
        route: ComplaintRoute.REGISTERED_BUSINESS,
      },
      include: {
        category: { select: { id: true, code: true, nameEn: true, nameAm: true } },
        market: { select: { id: true, code: true, nameEn: true, nameAm: true } },
        evidenceFiles: {
          where: { isOfficerOnly: false },
          select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, createdAt: true },
        },
        history: {
          where: { handlingLevel: 'business' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, fromStatus: true, toStatus: true, handlingLevel: true, publicNote: true, createdAt: true },
        },
        conversations: {
          where: { kind: ConversationKind.CONSUMER_BUSINESS },
          include: {
            messages: {
              orderBy: { sentAt: 'asc' },
              include: { sender: { select: { id: true, fullName: true } } },
            },
            offers: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                offerType: true,
                refundAmount: true,
                termsDescription: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                respondedAt: true,
              },
            },
          },
        },
      },
    });

    if (!c) {
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Complaint not found or not assigned to your business.',
      });
    }

    return mapBusinessComplaintDetails(c, tradeName);
  }

  async submitBusinessResponse(userId: string, reference: string, dto: BusinessResponseDto) {
    const { merchantId } = await this.resolveUserMerchant(userId);

    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, merchantId, route: ComplaintRoute.REGISTERED_BUSINESS },
    });

    if (!c) {
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Complaint not found or not assigned to your business.',
      });
    }

    assertBusinessCanRespond(c.status);

    const result = await this.prisma.$transaction(async (tx) => {
      let conv = await tx.conversation.findFirst({
        where: { caseId: c.id, kind: ConversationKind.CONSUMER_BUSINESS },
      });

      if (!conv) {
        conv = await tx.conversation.create({
          data: { caseId: c.id, kind: ConversationKind.CONSUMER_BUSINESS },
        });
      }

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        update: {},
        create: { conversationId: conv.id, userId, role: ParticipantRole.MERCHANT },
      });

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: c.complainantId } },
        update: {},
        create: { conversationId: conv.id, userId: c.complainantId, role: ParticipantRole.CONSUMER },
      });

      const message = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderUserId: userId,
          content: dto.message.trim(),
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: 'business',
          actorUserId: userId,
          publicNote: 'Business submitted response.',
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: userId,
          actionCode: 'BUSINESS_RESPONSE_POSTED',
          newValue: 'Message added',
        },
      });

      return { success: true, messageId: message.id };
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.BUSINESS_RESPONSE,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        complainantId: c.complainantId,
      }).catch(() => {});
    }

    return result;
  }

  async submitSettlementOffer(userId: string, reference: string, dto: BusinessOfferDto) {
    const { merchantId } = await this.resolveUserMerchant(userId);

    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, merchantId, route: ComplaintRoute.REGISTERED_BUSINESS },
    });

    if (!c) {
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Complaint not found or not assigned to your business.',
      });
    }

    assertBusinessCanRespond(c.status);
    validateRefundOffer(dto, c.disputedAmount);

    const expiresInDays = dto.expiresInDays || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      let conv = await tx.conversation.findFirst({
        where: { caseId: c.id, kind: ConversationKind.CONSUMER_BUSINESS },
      });

      if (!conv) {
        conv = await tx.conversation.create({
          data: { caseId: c.id, kind: ConversationKind.CONSUMER_BUSINESS },
        });
      }

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        update: {},
        create: { conversationId: conv.id, userId, role: ParticipantRole.MERCHANT },
      });

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: c.complainantId } },
        update: {},
        create: { conversationId: conv.id, userId: c.complainantId, role: ParticipantRole.CONSUMER },
      });

      await tx.settlementOffer.updateMany({
        where: { caseId: c.id, status: OfferStatus.PENDING },
        data: { status: OfferStatus.EXPIRED },
      });

      const offer = await tx.settlementOffer.create({
        data: {
          caseId: c.id,
          conversationId: conv.id,
          offeredByUserId: userId,
          offerType: dto.offerType,
          refundAmount: dto.refundAmount ? new Prisma.Decimal(dto.refundAmount) : null,
          termsDescription: dto.termsDescription.trim(),
          status: OfferStatus.PENDING,
          expiresAt,
        },
      });

      const offerSummary =
        dto.offerType === SettlementType.FULL_REFUND || dto.offerType === SettlementType.PARTIAL_REFUND
          ? `Settlement offer (${dto.offerType.replace(/_/g, ' ')}: ${dto.refundAmount} ${c.currency}): ${dto.termsDescription}`
          : `Settlement offer (${dto.offerType.replace(/_/g, ' ')}): ${dto.termsDescription}`;

      await tx.message.create({
        data: {
          conversationId: conv.id,
          senderUserId: userId,
          content: offerSummary,
        },
      });

      const nextStatus = CaseStatus.BUSINESS_OFFER_PENDING;

      await tx.case.update({
        where: { id: c.id },
        data: { status: nextStatus },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: nextStatus,
          handlingLevel: 'business',
          actorUserId: userId,
          publicNote: 'Business proposed settlement offer.',
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: userId,
          actionCode: 'BUSINESS_OFFER_CREATED',
          oldValue: c.status,
          newValue: nextStatus,
        },
      });

      return {
        success: true,
        offerId: offer.id,
        status: nextStatus,
        expiresAt: expiresAt.toISOString(),
      };
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.SETTLEMENT_OFFERED,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        complainantId: c.complainantId,
      }).catch(() => {});
    }

    return result;
  }
}
