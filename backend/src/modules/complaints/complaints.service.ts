import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { consumerAlias, officeBelongsToLevel, validateRouteA, validateRouteB } from '@consumer-rights/contracts';
import type { GovernmentLevel } from '@consumer-rights/contracts';
import { PrismaService } from '../../lib/database/prisma.service';
import { readComplaint, type ComplaintInput } from './complaint-input';

const LEVEL_OF = { CITY_BUREAU: 'bureau', SUBCITY: 'subcity', WOREDA: 'woreda' } as const;
const OFFICE_LEVEL = { woreda: 'WOREDA', subcity: 'SUBCITY', bureau: 'CITY_BUREAU' } as const;

const row = {
  referenceNumber: true, subject: true, status: true, createdAt: true, updatedAt: true, urgent: true, route: true, slaDeadline: true,
  category: { select: { code: true, nameEn: true, nameAm: true } },
  merchant: { select: { tradeName: true } }, unregisteredMerchantName: true,
  currentOffice: { select: { nameEn: true, nameAm: true, level: true } },
} as const;

type Row = { referenceNumber: string; subject: string; status: string; createdAt: Date; updatedAt: Date; urgent: boolean; route: string; slaDeadline: Date | null;
  category: { code: string; nameEn: string; nameAm: string }; merchant: { tradeName: string } | null; unregisteredMerchantName: string | null;
  currentOffice: { nameEn: string; nameAm: string; level: keyof typeof LEVEL_OF } | null };

/** What the API says about a case in a list. The business column is the trade name or the name the person typed. */
export const summarize = (c: Row) => ({
  reference: c.referenceNumber, title: c.subject, status: c.status, urgent: c.urgent,
  route: c.route === 'REGISTERED_BUSINESS' ? 'business' : 'direct', dueBy: c.slaDeadline?.toISOString() ?? null,
  category: c.category, business: c.merchant?.tradeName ?? c.unregisteredMerchantName ?? 'Not named',
  registeredBusiness: !!c.merchant,
  handledBy: c.currentOffice ? { name: c.currentOffice.nameEn, nameAm: c.currentOffice.nameAm, level: LEVEL_OF[c.currentOffice.level] } : null,
  createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
});

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Finds the office a complaint goes to, from the level the person chose. The check that the office really is at that level is made here, on the server. */
  private async resolveOffice(input: ComplaintInput) {
    if (input.destination === 'business') return null;
    const level = OFFICE_LEVEL[input.destination];
    const office = await this.prisma.administrativeOffice.findFirst({
      where: {
        level, isActive: true,
        ...(input.destination === 'woreda' ? { subcityCode: input.subcityCode, woredaCode: String(input.woredaNumber).padStart(2, '0') } : {}),
        ...(input.destination === 'subcity' ? { subcityCode: input.subcityCode } : {}),
      },
      select: { id: true, level: true, nameEn: true },
    });
    if (!office) throw new BadRequestException({ code: 'NO_OFFICE', message: 'We could not find that office. Choose another Sub-City or Woreda, or send it to the City Bureau.' });
    if (!officeBelongsToLevel(LEVEL_OF[office.level], input.destination)) throw new BadRequestException({ code: 'VALIDATION', message: 'The office does not match the level you chose.' });
    return office;
  }

  async create(userId: string, body: Record<string, unknown>) {
    const input = readComplaint(body);
    const category = await this.prisma.complaintCategory.findUnique({ where: { code: input.category } });
    if (!category || !category.isActive) throw new BadRequestException({ code: 'VALIDATION', message: 'That kind of problem is not available.', fields: { category: 'Choose another kind of problem.' } });
    const merchant = input.merchantId ? await this.prisma.merchant.findFirst({ where: { id: input.merchantId, isActive: true }, select: { id: true } }) : null;
    if (input.merchantId && !merchant) throw new BadRequestException({ code: 'VALIDATION', message: 'That business is not registered.', fields: { business: 'Choose a business from the list.' } });
    const office = await this.resolveOffice(input);

    const check = input.destination === 'business'
      ? validateRouteB({ route: 'registered_business', merchantId: merchant?.id })
      : validateRouteA({ route: 'direct_government', targetLevel: input.destination as GovernmentLevel, targetOfficeId: office?.id,
        merchantId: merchant?.id, unregisteredMerchantName: input.otherBusiness?.name });
    if (check) throw new BadRequestException({ code: 'VALIDATION', message: check });

    const toBusiness = input.destination === 'business';
    const status = toBusiness ? 'SUBMITTED_TO_BUSINESS' : 'RECEIVED_BY_OFFICE';
    const handlingLevel = toBusiness ? 'business' : input.destination;
    const note = toBusiness ? 'Your complaint was sent to the business.' : `Your complaint was received by ${office?.nameEn}.`;

    return this.prisma.$transaction(async tx => {
      const made = await tx.case.create({
        data: {
          route: toBusiness ? 'REGISTERED_BUSINESS' : 'DIRECT_GOVERNMENT', complainantId: userId, complainantAlias: 'Consumer',
          merchantId: merchant?.id ?? null, unregisteredMerchantName: input.otherBusiness?.name ?? null,
          unregisteredMerchantLocation: input.otherBusiness?.location ?? null, unregisteredMerchantPhone: input.otherBusiness?.phone ?? null,
          categoryId: category.id, incidentDate: input.purchasedOn, itemDescription: input.item, disputedAmount: input.loss ?? input.paid,
          paymentMethod: input.paymentMethod, receiptAvailable: input.receipt,
          desiredRemedy: input.wantAmount ? `${input.want}:${input.wantAmount}` : input.want,
          subject: input.subject, narrative: input.narrative, urgent: input.urgent, contactPhone: input.contactPhone,
          status, currentOfficeId: office?.id ?? null, escalatedToGovAt: null, // Route A keeps this empty by database rule; it is set only when a business case is escalated
          slaDeadline: new Date(Date.now() + category.defaultSlaDays * 86_400_000),
        } as never,
        select: { id: true, referenceNumber: true, createdAt: true },
      });
      const sequence = Number(made.referenceNumber.split('-')[2]);
      await tx.case.update({ where: { id: made.id }, data: { complainantAlias: consumerAlias(sequence) } });
      await tx.caseHistory.create({ data: { caseId: made.id, toStatus: status, handlingLevel, officeId: office?.id ?? null, actorUserId: userId, publicNote: note } });
      await tx.conversation.create({ data: { caseId: made.id, kind: toBusiness ? 'CONSUMER_BUSINESS' : 'CONSUMER_GOVERNMENT', participants: { create: { userId, role: 'CONSUMER' } } } });
      await tx.notification.create({ data: { recipientUserId: userId, caseId: made.id, type: 'COMPLAINT_RECEIVED', title: `Complaint ${made.referenceNumber} received`, messageBody: note } });
      return {
        reference: made.referenceNumber, sentAt: made.createdAt.toISOString(), toBusiness,
        handledBy: toBusiness ? 'the business' : (office?.nameEn ?? ''), status,
      };
    });
  }

  async listMine(userId: string) {
    const rows = await this.prisma.case.findMany({ where: { complainantId: userId }, orderBy: { updatedAt: 'desc' }, select: row, take: 100 });
    return rows.map(r => summarize(r as unknown as Row));
  }

  async getMine(userId: string, reference: string) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference.toUpperCase(), complainantId: userId },
      select: {
        ...row, narrative: true, itemDescription: true, incidentDate: true, disputedAmount: true, desiredRemedy: true, receiptAvailable: true,
        unregisteredMerchantLocation: true,
        evidenceFiles: { orderBy: { createdAt: 'asc' as const }, select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, isOfficerOnly: true } },
        history: { orderBy: { createdAt: 'desc' }, select: { toStatus: true, publicNote: true, createdAt: true, handlingLevel: true } },
      },
    });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'We could not find that complaint in your account.' });
    return {
      ...summarize(c as unknown as Row),
      narrative: c.narrative, item: c.itemDescription, boughtOn: c.incidentDate.toISOString().slice(0, 10), amount: Number(c.disputedAmount),
      want: c.desiredRemedy, receipt: c.receiptAvailable, businessPlace: c.unregisteredMerchantLocation,
      evidence: c.evidenceFiles.map(e => ({ id: e.id, name: e.fileName, type: e.fileType, size: e.fileSizeBytes, shared: !e.isOfficerOnly })),
      history: c.history.map(h => ({ status: h.toStatus, note: h.publicNote, at: h.createdAt.toISOString(), level: h.handlingLevel })),
    };
  }

  /** Public status check. The last 4 digits of the phone stop strangers reading a status by guessing numbers; every failure looks the same. */
  async track(reference: string, phone4: string) {
    const c = /^CC-\d{4}-\d{5}$/i.test(reference) && /^\d{4}$/.test(phone4)
      ? await this.prisma.case.findFirst({
        where: { referenceNumber: reference.toUpperCase(), complainant: { phoneNumber: { endsWith: phone4 } } },
        select: { ...row, history: { orderBy: { createdAt: 'desc' }, take: 1, select: { publicNote: true, createdAt: true } } },
      })
      : null;
    if (!c) return { found: false as const };
    return { found: true as const, ...summarize(c as unknown as Row), lastNote: c.history[0]?.publicNote ?? null };
  }
}
