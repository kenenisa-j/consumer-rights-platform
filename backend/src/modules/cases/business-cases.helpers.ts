import { CaseStatus, SettlementType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export function assertBusinessCanRespond(status: CaseStatus): void {
  const closedStatuses: CaseStatus[] = [
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
    CaseStatus.COURT_REFERRAL_ISSUED,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ];

  if (closedStatuses.includes(status)) {
    throw new BadRequestException({
      code: 'CASE_ALREADY_CLOSED',
      message: 'Cannot respond or propose offers on a closed or resolved complaint.',
    });
  }

  if (status === CaseStatus.ESCALATED_TO_GOVERNMENT) {
    throw new BadRequestException({
      code: 'CASE_ESCALATED',
      message: 'This complaint has been escalated to government. Direct business settlement is no longer permitted.',
    });
  }
}

export function validateRefundOffer(dto: { offerType: SettlementType; refundAmount?: number }, disputedAmount: any): void {
  if (dto.offerType === SettlementType.FULL_REFUND || dto.offerType === SettlementType.PARTIAL_REFUND) {
    if (dto.refundAmount === undefined || dto.refundAmount === null || dto.refundAmount <= 0) {
      throw new BadRequestException({
        code: 'REFUND_AMOUNT_REQUIRED',
        message: 'A positive refund amount is required for refund offers.',
      });
    }
    if (dto.refundAmount > Number(disputedAmount)) {
      throw new BadRequestException({
        code: 'REFUND_EXCEEDS_DISPUTED',
        message: `Refund amount (${dto.refundAmount}) cannot exceed disputed amount (${disputedAmount}).`,
      });
    }
  }
}

export function mapBusinessComplaintSummary(c: any) {
  return {
    reference: c.referenceNumber,
    title: c.itemDescription,
    complainant: c.complainantAlias,
    category: c.category.nameEn,
    categoryCode: c.category.code,
    disputedAmount: Number(c.disputedAmount),
    currency: c.currency,
    incidentDate: c.incidentDate.toISOString(),
    desiredRemedy: c.desiredRemedy,
    status: c.status,
    activeOffer: c.settlementOffers[0] || null,
    submittedAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    slaDeadline: c.slaDeadline?.toISOString() || null,
  };
}

export function mapBusinessComplaintDetails(c: any, tradeName: string) {
  const conversation = c.conversations?.[0] || null;
  const messages = conversation
    ? conversation.messages.map((m: any) => {
        const isConsumer = m.senderUserId === c.complainantId;
        return {
          id: m.id,
          from: isConsumer ? 'consumer' : 'business',
          sender: isConsumer ? c.complainantAlias : tradeName,
          content: m.content,
          sentAt: m.sentAt.toISOString(),
        };
      })
    : [];

  return {
    reference: c.referenceNumber,
    title: c.itemDescription,
    status: c.status,
    complainant: c.complainantAlias,
    category: c.category,
    market: c.market,
    incidentDate: c.incidentDate.toISOString(),
    disputedAmount: Number(c.disputedAmount),
    currency: c.currency,
    paymentMethod: c.paymentMethod,
    receiptAvailable: c.receiptAvailable,
    desiredRemedy: c.desiredRemedy,
    submittedAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    slaDeadline: c.slaDeadline?.toISOString() || null,
    evidence: (c.evidenceFiles || []).map((e: any) => ({
      id: e.id,
      name: e.fileName,
      type: e.fileType,
      sizeBytes: e.fileSizeBytes,
      uploadedAt: e.createdAt.toISOString(),
    })),
    history: (c.history || []).map((h: any) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.publicNote,
      timestamp: h.createdAt.toISOString(),
    })),
    thread: messages,
    offers: conversation ? conversation.offers : [],
    isAwaitingResponse:
      c.status === CaseStatus.SUBMITTED_TO_BUSINESS ||
      c.status === CaseStatus.BUSINESS_OFFER_PENDING,
  };
}
