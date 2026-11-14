import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';

/**
 * CasesService queries complaints for authenticated users.
 * Scoping is always by the authenticated membership (never from the browser).
 */
@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all cases filed by a consumer, newest first. */
  async listByConsumer(userId: string) {
    const cases = await this.prisma.case.findMany({
      where: { complainantId: userId },
      include: {
        category: { select: { nameEn: true } },
        merchant: { select: { tradeName: true } },
        currentOffice: { select: { nameEn: true, level: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map((c) => ({
      reference: c.referenceNumber,
      title: c.itemDescription,
      business: c.merchant?.tradeName ?? c.unregisteredMerchantName ?? 'Unknown',
      status: this.mapStatus(c.status),
      updated: c.updatedAt.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      href: `/cases/${c.referenceNumber}`,
      route: c.route,
      office: c.currentOffice?.nameEn ?? null,
    }));
  }

  /** Get a single case by reference for the authenticated consumer. */
  async getByReference(userId: string, reference: string) {
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference, complainantId: userId },
      include: {
        category: { select: { nameEn: true } },
        merchant: { select: { tradeName: true } },
        currentOffice: { select: { nameEn: true, level: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!c) return null;

    return {
      reference: c.referenceNumber,
      title: c.itemDescription,
      business: c.merchant?.tradeName ?? c.unregisteredMerchantName ?? 'Unknown',
      status: this.mapStatus(c.status),
      route: c.route,
      office: c.currentOffice?.nameEn ?? null,
      details: {
        problem: c.category.nameEn,
        bought: c.itemDescription,
        paid: `${c.disputedAmount} ${c.currency}`,
        asked: c.desiredRemedy,
      },
      updates: c.history.map((h) => ({
        title: h.toStatus.replace(/_/g, ' ').toLowerCase(),
        when: h.createdAt.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        iso: h.createdAt.toISOString(),
      })),
    };
  }

  /** Get the consumer's profile data. */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        phoneNumber: true,
        email: true,
        phoneNumberVerified: true,
      },
    });
    return user;
  }

  private mapStatus(status: string): { label: string; tone: string } {
    const map: Record<string, { label: string; tone: string }> = {
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
}

