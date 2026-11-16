import {
  CaseStatus,
  ComplaintRoute,
  ConversationKind,
  OfferStatus,
  OfficeLevel,
  ParticipantRole,
  TransferDirection,
  TransferStatus,
  Prisma,
} from '@prisma/client';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { EscalateCaseDto } from './dto/escalate-case.dto';

export const CLOSED_STATUSES: CaseStatus[] = [
  CaseStatus.RESOLVED_MUTUALLY,
  CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
  CaseStatus.COURT_REFERRAL_ISSUED,
  CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
  CaseStatus.CLOSED_WITHDRAWN,
];

export const CONSUMER_CASE_DETAIL_INCLUDE = {
  category: { select: { id: true, code: true, nameEn: true, nameAm: true, defaultSlaDays: true } },
  merchant: { select: { id: true, tradeName: true, legalName: true, woredaOfficeId: true } },
  currentOffice: { select: { id: true, code: true, nameEn: true, nameAm: true, level: true } },
  evidenceFiles: { where: { isOfficerOnly: false }, select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, createdAt: true } },
  history: { orderBy: { createdAt: 'desc' as const }, select: { id: true, fromStatus: true, toStatus: true, handlingLevel: true, publicNote: true, createdAt: true } },
  transfers: { orderBy: { transferredAt: 'desc' as const }, include: { fromOffice: { select: { id: true, nameEn: true } }, toOffice: { select: { id: true, nameEn: true } } } },
  conversations: {
    include: {
      messages: { orderBy: { sentAt: 'asc' as const }, include: { sender: { select: { id: true, fullName: true } } } },
      offers: { orderBy: { createdAt: 'desc' as const } },
    },
  },
};

export function mapStatus(status: string): { label: string; tone: 'info' | 'ok' | 'warn' | 'bad' | 'grey' } {
  const map: Record<string, { label: string; tone: 'info' | 'ok' | 'warn' | 'bad' | 'grey' }> = {
    SUBMITTED_TO_BUSINESS: { label: 'Sent to business', tone: 'info' },
    BUSINESS_OFFER_PENDING: { label: 'The business made you an offer', tone: 'warn' },
    ESCALATED_TO_GOVERNMENT: { label: 'Moved to government office', tone: 'info' },
    RECEIVED_BY_OFFICE: { label: 'Received by office', tone: 'info' },
    UNDER_INITIAL_REVIEW: { label: 'Being checked', tone: 'info' },
    OFFICER_ASSIGNED: { label: 'Officer assigned', tone: 'info' },
    INSPECTION_PENDING: { label: 'Inspection planned', tone: 'info' },
    INSPECTION_ACTIVE: { label: 'Inspection in progress', tone: 'info' },
    INSPECTION_COMPLETED: { label: 'Inspection completed', tone: 'ok' },
    CONCILIATION_SCHEDULED: { label: 'Meeting to agree a solution', tone: 'info' },
    SETTLEMENT_OFFERED: { label: 'Solution proposed', tone: 'warn' },
    RESOLVED_MUTUALLY: { label: 'Resolved', tone: 'ok' },
    RESOLVED_ADMINISTRATIVE_ORDER: { label: 'Resolved by order', tone: 'ok' },
    COURT_REFERRAL_ISSUED: { label: 'Referred to court', tone: 'bad' },
    CLOSED_OUTSIDE_JURISDICTION: { label: 'Not handled by this office', tone: 'grey' },
    CLOSED_WITHDRAWN: { label: 'Withdrawn', tone: 'grey' },
  };
  return map[status] ?? { label: status.replace(/_/g, ' ').toLowerCase(), tone: 'grey' };
}

export function mapConsumerCaseDetails(c: any, userId: string) {
  const stage = c.currentOffice?.level === OfficeLevel.CITY_BUREAU ? 'bureau'
    : c.currentOffice?.level === OfficeLevel.SUBCITY ? 'subcity'
      : c.currentOffice?.level === OfficeLevel.WOREDA ? 'woreda'
        : c.status === CaseStatus.RESOLVED_MUTUALLY || c.status === CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER ? 'resolved'
          : 'business';

  const pending = c.status === CaseStatus.BUSINESS_OFFER_PENDING ? 'business_offer'
    : c.status === CaseStatus.SETTLEMENT_OFFERED ? 'settlement'
      : c.status === CaseStatus.CONCILIATION_SCHEDULED ? 'meeting'
        : c.status === CaseStatus.CLOSED_OUTSIDE_JURISDICTION ? 'outside'
          : 'none';

  const messages = (c.conversations || []).flatMap((conv: any) =>
    (conv.messages || []).map((m: any) => {
      const isConsumer = m.senderUserId === userId;
      const fromType = isConsumer ? 'me' : conv.kind === ConversationKind.CONSUMER_BUSINESS ? 'business' : 'office';
      const senderName = isConsumer ? 'You' : c.merchant?.tradeName ?? m.sender?.fullName;
      return {
        id: m.id,
        from: fromType,
        who: senderName,
        when: m.sentAt.toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }),
        text: m.content,
        iso: m.sentAt.toISOString(),
      };
    }),
  );

  const offers = (c.conversations || []).flatMap((conv: any) =>
    (conv.offers || []).map((o: any) => ({
      id: o.id,
      offerType: o.offerType,
      refundAmount: o.refundAmount ? Number(o.refundAmount) : null,
      termsDescription: o.termsDescription,
      status: o.status,
      expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
      respondedAt: o.respondedAt ? o.respondedAt.toISOString() : null,
      createdAt: o.createdAt.toISOString(),
      isPending: o.status === OfferStatus.PENDING && (!o.expiresAt || o.expiresAt > new Date()),
    })),
  );

  const activeOffer = offers.find((o: any) => o.isPending);
  const offer = activeOffer ? {
    id: activeOffer.id,
    title: `${c.merchant?.tradeName || 'Business'} made an offer`,
    text: activeOffer.termsDescription || (activeOffer.refundAmount ? `Refund: ${activeOffer.refundAmount} ${c.currency}` : 'Settlement offer'),
  } : undefined;

  const isClosed = CLOSED_STATUSES.includes(c.status);
  const canEscalate =
    c.route === ComplaintRoute.REGISTERED_BUSINESS &&
    !isClosed &&
    c.escalatedToGovAt === null &&
    (c.status === CaseStatus.SUBMITTED_TO_BUSINESS || c.status === CaseStatus.BUSINESS_OFFER_PENDING);

  return {
    reference: c.referenceNumber,
    title: c.itemDescription,
    stage,
    status: mapStatus(c.status),
    official: c.status.replace(/_/g, ' '),
    pending,
    banner: c.route === ComplaintRoute.DIRECT_GOVERNMENT ? {
      tone: 'plain' as const,
      title: 'Direct Government Complaint',
      text: 'This complaint was submitted directly to your local trade office.',
    } : undefined,
    details: {
      problem: c.category?.nameEn,
      business: c.merchant?.tradeName ?? c.unregisteredMerchantName ?? 'Unknown',
      bought: c.itemDescription,
      paid: `${c.disputedAmount} ${c.currency}`,
      asked: c.desiredRemedy,
      narrative: c.desiredRemedy,
    },
    handledBy: [
      ['Office', c.currentOffice?.nameEn ?? 'Under Business Review'],
      ['Route', c.route.replace(/_/g, ' ')],
    ],
    counterpart: c.merchant?.tradeName ?? c.currentOffice?.nameEn ?? 'the officer',
    thread: messages,
    evidence: (c.evidenceFiles || []).map((e: any) => ({
      id: e.id,
      name: e.fileName,
      size: `${Math.round(e.fileSizeBytes / 1024)} KB`,
      shared: true,
    })),
    offer,
    offers,
    updates: (c.history || []).map((h: any) => ({
      title: h.toStatus.replace(/_/g, ' ').toLowerCase(),
      when: h.createdAt.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }),
      iso: h.createdAt.toISOString(),
      note: h.publicNote,
    })),
    transfers: (c.transfers || []).map((t: any) => ({
      from: t.fromOffice?.nameEn,
      to: t.toOffice?.nameEn,
      direction: t.direction,
      status: t.status,
      transferredAt: t.transferredAt.toISOString(),
    })),
    slaDeadline: c.slaDeadline?.toISOString() || null,
    canEscalate,
    closed: isClosed,
  };
}

export async function executeSendMessageTx(
  tx: Prisma.TransactionClient,
  c: any,
  userId: string,
  messageContent: string,
  kind: ConversationKind,
) {
  let conv = await tx.conversation.findFirst({
    where: { caseId: c.id, kind },
  });
  if (!conv) {
    conv = await tx.conversation.create({
      data: { caseId: c.id, kind },
    });
  }

  await tx.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conv.id, userId } },
    update: {},
    create: { conversationId: conv.id, userId, role: ParticipantRole.CONSUMER },
  });

  const message = await tx.message.create({
    data: {
      conversationId: conv.id,
      senderUserId: userId,
      content: messageContent,
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: userId,
      actionCode: 'CONSUMER_MESSAGE_SENT',
      newValue: 'Message added',
    },
  });

  return { success: true, messageId: message.id };
}

export async function executeAcceptOfferTx(
  tx: Prisma.TransactionClient,
  c: any,
  userId: string,
  offer: any,
) {
  await tx.settlementOffer.update({
    where: { id: offer.id },
    data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
  });

  const nextStatus = CaseStatus.RESOLVED_MUTUALLY;

  await tx.case.update({
    where: { id: c.id },
    data: { status: nextStatus },
  });

  await tx.message.create({
    data: {
      conversationId: offer.conversationId,
      senderUserId: userId,
      content: `Consumer accepted the settlement offer: ${offer.termsDescription}`,
    },
  });

  await tx.caseHistory.create({
    data: {
      caseId: c.id,
      fromStatus: c.status,
      toStatus: nextStatus,
      handlingLevel: 'business',
      actorUserId: userId,
      publicNote: 'Consumer accepted business settlement offer. Case resolved mutually.',
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: userId,
      actionCode: 'SETTLEMENT_OFFER_ACCEPTED',
      oldValue: c.status,
      newValue: nextStatus,
    },
  });

  return {
    success: true,
    offerId: offer.id,
    status: nextStatus,
    message: 'Settlement offer accepted. Dispute marked as mutually resolved.',
  };
}

export async function executeRejectOfferTx(
  tx: Prisma.TransactionClient,
  c: any,
  userId: string,
  offer: any,
  dto?: RejectOfferDto,
) {
  await tx.settlementOffer.update({
    where: { id: offer.id },
    data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
  });

  const nextStatus = CaseStatus.SUBMITTED_TO_BUSINESS;

  await tx.case.update({
    where: { id: c.id },
    data: { status: nextStatus },
  });

  const rejectText = dto?.reason?.trim()
    ? `Consumer rejected the settlement offer. Reason: ${dto.reason.trim()}`
    : 'Consumer rejected the settlement offer.';

  await tx.message.create({
    data: {
      conversationId: offer.conversationId,
      senderUserId: userId,
      content: rejectText,
    },
  });

  await tx.caseHistory.create({
    data: {
      caseId: c.id,
      fromStatus: c.status,
      toStatus: nextStatus,
      handlingLevel: 'business',
      actorUserId: userId,
      publicNote: 'Consumer rejected business settlement offer.',
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: userId,
      actionCode: 'SETTLEMENT_OFFER_REJECTED',
      oldValue: c.status,
      newValue: nextStatus,
    },
  });

  return {
    success: true,
    offerId: offer.id,
    status: nextStatus,
    message: 'Settlement offer rejected.',
  };
}

export async function executeEscalateTx(
  tx: Prisma.TransactionClient,
  c: any,
  userId: string,
  office: any,
  slaDeadline: Date,
  dto: EscalateCaseDto,
) {
  const nextStatus = CaseStatus.ESCALATED_TO_GOVERNMENT;

  await tx.settlementOffer.updateMany({
    where: { caseId: c.id, status: OfferStatus.PENDING },
    data: { status: OfferStatus.EXPIRED },
  });

  await tx.case.update({
    where: { id: c.id },
    data: {
      status: nextStatus,
      currentOfficeId: office.id,
      escalatedToGovAt: new Date(),
      slaDeadline,
    },
  });

  await tx.caseTransfer.create({
    data: {
      caseId: c.id,
      fromOfficeId: office.id,
      toOfficeId: office.id,
      direction: TransferDirection.UPWARD_ESCALATION,
      status: TransferStatus.PENDING_ACCEPTANCE,
      handoverNote: dto.reason?.trim() || 'Consumer escalated complaint from business to Woreda Trade Office.',
      initiatedByUserId: userId,
    },
  });

  await tx.caseHistory.create({
    data: {
      caseId: c.id,
      fromStatus: c.status,
      toStatus: nextStatus,
      handlingLevel: 'woreda',
      officeId: office.id,
      actorUserId: userId,
      publicNote: dto.reason?.trim() || 'Escalated to Woreda Trade Office by consumer.',
    },
  });

  await tx.caseAuditLog.create({
    data: {
      caseId: c.id,
      actorId: userId,
      actionCode: 'CONSUMER_ESCALATED_TO_GOV',
      oldValue: c.status,
      newValue: nextStatus,
    },
  });

  return {
    success: true,
    status: nextStatus,
    holdingOffice: office.nameEn,
    officeId: office.id,
    slaDeadline: slaDeadline.toISOString(),
  };
}
