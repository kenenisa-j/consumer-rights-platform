import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  CaseStatus,
  ComplaintRoute,
  ConversationKind,
  OfferStatus,
  OfficeLevel,
} from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { ConsumerMessageDto } from './dto/consumer-message.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { EscalateCaseDto } from './dto/escalate-case.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import {
  CLOSED_STATUSES,
  CONSUMER_CASE_DETAIL_INCLUDE,
  mapConsumerCaseDetails,
  executeSendMessageTx,
  executeAcceptOfferTx,
  executeRejectOfferTx,
  executeEscalateTx,
} from './consumer-cases.helpers';

@Injectable()
export class ConsumerCasesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async getByReference(userId: string, reference: string) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
      include: CONSUMER_CASE_DETAIL_INCLUDE,
    });

    if (!c) return null;
    return mapConsumerCaseDetails(c, userId);
  }

  async sendMessage(userId: string, reference: string, dto: ConsumerMessageDto) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Complaint not found.' });

    if (CLOSED_STATUSES.includes(c.status)) {
      throw new BadRequestException({ code: 'CASE_CLOSED', message: 'Cannot send messages on a closed complaint.' });
    }

    const kind =
      c.status === CaseStatus.SUBMITTED_TO_BUSINESS || c.status === CaseStatus.BUSINESS_OFFER_PENDING
        ? ConversationKind.CONSUMER_BUSINESS
        : ConversationKind.CONSUMER_GOVERNMENT;

    const result = await this.prisma.$transaction(async (tx) => {
      return executeSendMessageTx(tx, c, userId, dto.message.trim(), kind);
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.NEW_MESSAGE,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        merchantId: c.merchantId || undefined,
        complainantAlias: c.complainantAlias,
      }).catch(() => {});
    }

    return result;
  }

  async acceptOffer(userId: string, reference: string, offerId: string) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Complaint not found.' });

    if (CLOSED_STATUSES.includes(c.status)) {
      throw new BadRequestException({ code: 'CASE_CLOSED', message: 'Complaint is already closed.' });
    }

    const offer = await this.prisma.settlementOffer.findFirst({
      where: { id: offerId, caseId: c.id },
    });
    if (!offer) throw new NotFoundException({ code: 'OFFER_NOT_FOUND', message: 'Settlement offer not found.' });

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException({
        code: 'OFFER_NOT_PENDING',
        message: `Cannot accept offer with status '${offer.status}'.`,
      });
    }

    if (offer.expiresAt && offer.expiresAt <= new Date()) {
      await this.prisma.settlementOffer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.EXPIRED },
      });
      throw new BadRequestException({ code: 'OFFER_EXPIRED', message: 'This settlement offer has expired.' });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return executeAcceptOfferTx(tx, c, userId, offer);
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.SETTLEMENT_ACCEPTED,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        merchantId: c.merchantId || undefined,
        complainantAlias: c.complainantAlias,
      }).catch(() => {});
    }

    return result;
  }

  async rejectOffer(userId: string, reference: string, offerId: string, dto: RejectOfferDto) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Complaint not found.' });

    const offer = await this.prisma.settlementOffer.findFirst({
      where: { id: offerId, caseId: c.id },
    });
    if (!offer) throw new NotFoundException({ code: 'OFFER_NOT_FOUND', message: 'Settlement offer not found.' });

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException({
        code: 'OFFER_NOT_PENDING',
        message: `Cannot reject offer with status '${offer.status}'.`,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return executeRejectOfferTx(tx, c, userId, offer, dto);
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.SETTLEMENT_REJECTED,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        merchantId: c.merchantId || undefined,
        complainantAlias: c.complainantAlias,
      }).catch(() => {});
    }

    return result;
  }

  async escalateToGovernment(userId: string, reference: string, dto: EscalateCaseDto) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
      include: { category: true, merchant: true },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Complaint not found.' });

    if (c.route === ComplaintRoute.DIRECT_GOVERNMENT) {
      throw new BadRequestException({
        code: 'ALREADY_GOVERNMENT_ROUTE',
        message: 'Direct to government complaints are already handled by government offices.',
      });
    }

    if (CLOSED_STATUSES.includes(c.status)) {
      throw new BadRequestException({ code: 'CASE_CLOSED', message: 'Cannot escalate a closed complaint.' });
    }

    if (
      c.escalatedToGovAt !== null ||
      c.currentOfficeId !== null ||
      (c.status !== CaseStatus.SUBMITTED_TO_BUSINESS && c.status !== CaseStatus.BUSINESS_OFFER_PENDING)
    ) {
      throw new BadRequestException({
        code: 'ALREADY_ESCALATED',
        message: 'This complaint has already been escalated to government.',
      });
    }

    const officeId = dto.targetOfficeId || c.merchant?.woredaOfficeId;
    if (!officeId) {
      throw new BadRequestException({
        code: 'OFFICE_REQUIRED',
        message: 'No associated Woreda office found for this merchant. Target office must be specified.',
      });
    }

    const office = await this.prisma.administrativeOffice.findUnique({ where: { id: officeId } });
    if (!office || !office.isActive) {
      throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Target Woreda office not found or inactive.' });
    }

    if (office.level !== OfficeLevel.WOREDA) {
      throw new BadRequestException({
        code: 'INVALID_ESCALATION_LEVEL',
        message: 'Escalations from business must climb to a Woreda office first.',
      });
    }

    const defaultSlaDays = c.category?.defaultSlaDays || 5;
    const slaDeadline = new Date(Date.now() + defaultSlaDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      return executeEscalateTx(tx, c, userId, office, slaDeadline, dto);
    });

    const notif = this.notificationsService;
    if (notif) {
      notif.dispatchCaseEvent({
        type: NotificationType.CASE_ESCALATED,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        complainantId: c.complainantId,
        officeId: office.id,
      }).catch(() => {});
    }

    return result;
  }
}
