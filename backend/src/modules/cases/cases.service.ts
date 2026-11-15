import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ComplaintRoute, CaseStatus, OfficeLevel, Prisma } from '@prisma/client';
import { officeBelongsToLevel, consumerAlias } from '@consumer-rights/contracts';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';

/**
 * CasesService queries and manages complaints for authenticated users.
 * Scoping is always by the authenticated membership (never from the browser).
 */
@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /** Create a new complaint via validated Route A or Route B intake. */
  async createCase(userId: string, dto: CreateCaseDto) {
    const createdCase = await this.prisma.$transaction(async (tx) => {
      // 1. Verify category exists and is active
      const category = await tx.complaintCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Complaint category not found.' });
      }
      if (!category.isActive) {
        throw new BadRequestException({ code: 'CATEGORY_INACTIVE', message: 'Complaint category is inactive.' });
      }

      // 2. Validate incident date (not in future)
      const incidentDate = new Date(dto.incidentDate);
      if (isNaN(incidentDate.getTime())) {
        throw new BadRequestException({ code: 'INVALID_INCIDENT_DATE', message: 'Invalid incident date format.' });
      }
      if (incidentDate > new Date()) {
        throw new BadRequestException({ code: 'FUTURE_INCIDENT_DATE', message: 'Incident date cannot be in the future.' });
      }

      if (dto.marketId) {
        const market = await tx.market.findUnique({ where: { id: dto.marketId } });
        if (!market || !market.isActive) {
          throw new BadRequestException({ code: 'MARKET_INVALID', message: 'Specified market not found or inactive.' });
        }
      }

      const verifyMerchant = async (id: string) => {
        const m = await tx.merchant.findUnique({ where: { id } });
        if (!m) throw new NotFoundException({ code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found.' });
        if (!m.isActive || m.verificationStatus !== 'VERIFIED') {
          throw new BadRequestException({
            code: 'MERCHANT_INACTIVE_OR_UNVERIFIED',
            message: 'Merchant is inactive or unverified.',
          });
        }
        return m.id;
      };

      let initialStatus: CaseStatus;
      let initialHandlingLevel: string;
      let resolvedOfficeId: string | null = null;
      let resolvedMerchantId: string | null = null;
      let unregName: string | null = null;
      let unregLoc: string | null = null;
      let unregPhone: string | null = null;

      const officeInput = dto.officeId || dto.targetOfficeId;

      if (dto.route === ComplaintRoute.DIRECT_GOVERNMENT) {
        if (!officeInput) {
          throw new BadRequestException({
            code: 'OFFICE_REQUIRED',
            message: 'Direct to government complaints require a government office.',
          });
        }

        const office = await tx.administrativeOffice.findUnique({ where: { id: officeInput } });
        if (!office) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Government office not found.' });
        if (!office.isActive) {
          throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Government office is not active.' });
        }

        const supportedLevels: OfficeLevel[] = [OfficeLevel.WOREDA, OfficeLevel.SUBCITY, OfficeLevel.CITY_BUREAU];
        if (!supportedLevels.includes(office.level)) {
          throw new BadRequestException({
            code: 'UNSUPPORTED_OFFICE_LEVEL',
            message: 'Selected office is not a supported government office level.',
          });
        }

        if (dto.targetLevel) {
          const normOffice = office.level === OfficeLevel.CITY_BUREAU ? 'bureau' : office.level.toLowerCase();
          const normTarget = dto.targetLevel.toLowerCase() === 'city_bureau' ? 'bureau' : dto.targetLevel.toLowerCase();
          if (!officeBelongsToLevel(normOffice, normTarget)) {
            throw new BadRequestException({
              code: 'OFFICE_LEVEL_MISMATCH',
              message: `Office level (${office.level}) does not match requested level (${dto.targetLevel}).`,
            });
          }
        }

        resolvedOfficeId = office.id;
        initialStatus = CaseStatus.RECEIVED_BY_OFFICE;
        initialHandlingLevel = office.level === OfficeLevel.CITY_BUREAU ? 'bureau' : office.level.toLowerCase();

        const hasRegMerchant = Boolean(dto.merchantId);
        const hasUnregName = Boolean(dto.unregisteredMerchantName?.trim());
        const hasUnregLoc = Boolean(dto.unregisteredMerchantLocation?.trim());
        const hasUnregPhone = Boolean(dto.unregisteredMerchantPhone?.trim());
        const hasAnyUnreg = hasUnregName || hasUnregLoc || hasUnregPhone;

        if (hasRegMerchant && hasAnyUnreg) {
          throw new BadRequestException({
            code: 'INVALID_ROUTING',
            message: 'Cannot provide both registered merchant and unregistered merchant details.',
          });
        }

        if (hasRegMerchant) {
          resolvedMerchantId = await verifyMerchant(dto.merchantId!);
        } else if (hasAnyUnreg) {
          if (!hasUnregName) {
            throw new BadRequestException({
              code: 'UNREGISTERED_MERCHANT_NAME_REQUIRED',
              message: 'Unregistered merchant name is required when unregistered merchant details are provided.',
            });
          }
          unregName = dto.unregisteredMerchantName!.trim();
          unregLoc = dto.unregisteredMerchantLocation?.trim() || null;
          unregPhone = dto.unregisteredMerchantPhone?.trim() || null;
        }
      } else if (dto.route === ComplaintRoute.REGISTERED_BUSINESS) {
        if (!dto.merchantId) {
          throw new BadRequestException({
            code: 'MERCHANT_REQUIRED',
            message: 'Registered business complaints require a registered merchantId.',
          });
        }
        if (officeInput) {
          throw new BadRequestException({
            code: 'INVALID_ROUTING',
            message: 'Government office cannot be specified at submission for Registered Business complaints.',
          });
        }
        if (dto.unregisteredMerchantName || dto.unregisteredMerchantLocation || dto.unregisteredMerchantPhone) {
          throw new BadRequestException({
            code: 'INVALID_ROUTING',
            message: 'Unregistered merchant details are not permitted for Registered Business complaints.',
          });
        }

        resolvedMerchantId = await verifyMerchant(dto.merchantId);
        resolvedOfficeId = null;
        initialStatus = CaseStatus.SUBMITTED_TO_BUSINESS;
        initialHandlingLevel = 'business';
      } else {
        throw new BadRequestException({ code: 'INVALID_ROUTE', message: 'Unsupported complaint route.' });
      }

      const alias = await this.resolveConsumerAlias(tx, userId);
      const slaDeadline = dto.route === ComplaintRoute.DIRECT_GOVERNMENT && category.defaultSlaDays > 0
        ? new Date(Date.now() + category.defaultSlaDays * 24 * 60 * 60 * 1000)
        : null;

      const createdCase = await tx.case.create({
        data: {
          route: dto.route,
          complainantId: userId,
          complainantAlias: alias,
          merchantId: resolvedMerchantId,
          unregisteredMerchantName: unregName,
          unregisteredMerchantLocation: unregLoc,
          unregisteredMerchantPhone: unregPhone,
          marketId: dto.marketId ?? null,
          categoryId: category.id,
          incidentDate,
          itemDescription: dto.itemDescription.trim(),
          disputedAmount: dto.disputedAmount,
          currency: dto.currency?.trim() || 'ETB',
          paymentMethod: dto.paymentMethod?.trim() || null,
          receiptAvailable: dto.receiptAvailable ?? true,
          desiredRemedy: dto.desiredRemedy.trim(),
          status: initialStatus,
          currentOfficeId: resolvedOfficeId,
          escalatedToGovAt: null,
          slaDeadline,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: createdCase.id,
          fromStatus: null,
          toStatus: initialStatus,
          handlingLevel: initialHandlingLevel,
          officeId: resolvedOfficeId,
          actorUserId: userId,
          publicNote: 'Complaint submitted by consumer.',
        },
      });

      return createdCase;
    });

    if (this.notificationsService) {
      this.notificationsService.dispatchCaseEvent({
        type: createdCase.route === ComplaintRoute.REGISTERED_BUSINESS
          ? NotificationType.NEW_COMPLAINT_FILED
          : NotificationType.COMPLAINT_SUBMITTED,
        caseId: createdCase.id,
        referenceNumber: createdCase.referenceNumber,
        complainantId: userId,
        complainantAlias: createdCase.complainantAlias,
        merchantId: createdCase.merchantId || undefined,
        officeId: createdCase.currentOfficeId || undefined,
      }).catch(() => {});
    }

    return createdCase;
  }

  /**
   * Resolve a stable pseudonym for this consumer across all their complaints.
   *
   * Limitation: under concurrent first-time submissions by different consumers,
   * two transactions may read the same highest alias and produce the same nextSeq.
   * The database does not have a unique constraint on complainantAlias, so this would
   * silently create a duplicate alias. A proper fix requires a schema change (a
   * dedicated sequence table or a unique partial index). This is documented as a
   * known limitation until the schema can be updated.
   */
  private async resolveConsumerAlias(tx: Prisma.TransactionClient, userId: string): Promise<string> {
    const existing = await tx.case.findFirst({
      where: { complainantId: userId },
      select: { complainantAlias: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing?.complainantAlias) return existing.complainantAlias;

    const latestCase = await tx.case.findFirst({
      where: { complainantAlias: { startsWith: 'Consumer ' } },
      orderBy: { complainantAlias: 'desc' },
      select: { complainantAlias: true },
    });

    let nextSeq = 1;
    if (latestCase?.complainantAlias) {
      const match = latestCase.complainantAlias.match(/^Consumer\s+(\d+)$/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed >= 1) {
          nextSeq = parsed + 1;
        }
      }
    }

    if (nextSeq > 99999) {
      throw new BadRequestException({
        code: 'ALIAS_SEQUENCE_EXHAUSTED',
        message: 'Consumer alias sequence has been exhausted. Contact an administrator.',
      });
    }

    return consumerAlias(nextSeq);
  }


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

    const stage = c.currentOffice?.level === 'CITY_BUREAU' ? 'bureau'
      : c.currentOffice?.level === 'SUBCITY' ? 'subcity'
      : c.currentOffice?.level === 'WOREDA' ? 'woreda'
      : c.status === 'RESOLVED_MUTUALLY' || c.status === 'RESOLVED_ADMINISTRATIVE_ORDER' ? 'resolved'
      : 'business';

    const pending = c.status === 'BUSINESS_OFFER_PENDING' ? 'business_offer'
      : c.status === 'SETTLEMENT_OFFERED' ? 'settlement'
      : c.status === 'CONCILIATION_SCHEDULED' ? 'meeting'
      : c.status === 'CLOSED_OUTSIDE_JURISDICTION' ? 'outside'
      : 'none';

    return {
      reference: c.referenceNumber,
      title: c.itemDescription,
      stage,
      status: this.mapStatus(c.status),
      official: c.status.replace(/_/g, ' '),
      pending,
      banner: c.route === 'DIRECT_GOVERNMENT' ? {
        tone: 'plain' as const,
        title: 'Direct Government Complaint',
        text: 'This complaint was submitted directly to your local trade office.',
      } : undefined,
      details: {
        problem: c.category.nameEn,
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
      thread: [],
      evidence: [],
      updates: (c.history.length > 0 ? c.history : [{ toStatus: 'Case received', createdAt: c.createdAt } as any]).map((h) => ({
        title: h.toStatus.replace(/_/g, ' ').toLowerCase(),
        when: h.createdAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        iso: h.createdAt.toISOString(),
      })),
      closed: c.status === 'RESOLVED_MUTUALLY' || c.status === 'RESOLVED_ADMINISTRATIVE_ORDER' || c.status.startsWith('CLOSED'),
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

  private mapStatus(status: string): { label: string; tone: "info" | "ok" | "warn" | "bad" | "grey" } {
    const map: Record<string, { label: string; tone: "info" | "ok" | "warn" | "bad" | "grey" }> = {
      SUBMITTED_TO_BUSINESS: { label: 'Sent to business', tone: 'info' }, BUSINESS_OFFER_PENDING: { label: 'The business made you an offer', tone: 'warn' },
      ESCALATED_TO_GOVERNMENT: { label: 'Moved to government office', tone: 'info' }, RECEIVED_BY_OFFICE: { label: 'Received by office', tone: 'info' },
      UNDER_INITIAL_REVIEW: { label: 'Being checked', tone: 'info' }, OFFICER_ASSIGNED: { label: 'Officer assigned', tone: 'info' },
      INSPECTION_PENDING: { label: 'Inspection planned', tone: 'info' }, INSPECTION_ACTIVE: { label: 'Inspection in progress', tone: 'info' },
      INSPECTION_COMPLETED: { label: 'Inspection completed', tone: 'ok' }, CONCILIATION_SCHEDULED: { label: 'Meeting to agree a solution', tone: 'info' },
      SETTLEMENT_OFFERED: { label: 'Solution proposed', tone: 'warn' }, RESOLVED_MUTUALLY: { label: 'Resolved', tone: 'ok' },
      RESOLVED_ADMINISTRATIVE_ORDER: { label: 'Resolved by order', tone: 'ok' }, COURT_REFERRAL_ISSUED: { label: 'Referred to court', tone: 'bad' },
      CLOSED_OUTSIDE_JURISDICTION: { label: 'Not handled by this office', tone: 'grey' }, CLOSED_WITHDRAWN: { label: 'Withdrawn', tone: 'grey' },
    };
    return map[status] ?? { label: status.replace(/_/g, ' ').toLowerCase(), tone: 'grey' };
  }
}
