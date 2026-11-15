import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { OfficeLevel, RoleCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { QueryMerchantDto } from './dto/query-merchant.dto';
import { VerifyMerchantDto } from './dto/verify-merchant.dto';

const GOV_ROLES: RoleCode[] = [
  RoleCode.SYSTEM_SUPERADMIN,
  RoleCode.BUREAU_ADMIN,
  RoleCode.BUREAU_OFFICER,
  RoleCode.SUBCITY_COORDINATOR,
  RoleCode.WOREDA_ADMIN,
  RoleCode.WOREDA_OFFICER,
];

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a merchant and validates Woreda and Market consistency.
   */
  async createMerchant(actorUserId: string, dto: CreateMerchantDto) {
    const existing = await this.prisma.merchant.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existing) {
      throw new ConflictException({
        code: 'MERCHANT_REG_EXISTS',
        message: `Registration number ${dto.registrationNumber} already exists.`,
      });
    }

    const woreda = await this.validateWoreda(dto.woredaOfficeId);
    if (dto.marketId) {
      await this.validateMarket(dto.marketId, dto.woredaOfficeId);
    }

    const actor = await this.getActorContext(actorUserId);
    const isGovStaff = Boolean(actor.govRole);
    if (isGovStaff) {
      this.assertJurisdiction(actor, woreda);
    }

    const verificationStatus = isGovStaff ? 'VERIFIED' : 'PENDING';

    return this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          registrationNumber: dto.registrationNumber,
          tradeName: dto.tradeName,
          legalName: dto.legalName,
          businessType: dto.businessType,
          businessCategory: dto.businessCategory,
          phoneNumber: dto.phoneNumber,
          woredaOfficeId: dto.woredaOfficeId,
          marketId: dto.marketId || null,
          stallNumber: dto.stallNumber || null,
          verificationStatus,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
        include: {
          woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
          market: { select: { id: true, code: true, nameEn: true } },
        },
      });

      if (!isGovStaff) {
        const businessRole = await tx.role.findUnique({ where: { code: RoleCode.BUSINESS_OWNER } });
        if (businessRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: actorUserId, roleId: businessRole.id } },
            update: {},
            create: { userId: actorUserId, roleId: businessRole.id },
          });
        }
        await tx.merchantUser.create({
          data: {
            merchantId: merchant.id,
            userId: actorUserId,
            roleInBusiness: 'OWNER',
            isPrimaryContact: true,
          },
        });
      }

      return merchant;
    });
  }

  /**
   * Safe public merchant directory lookup for consumer complaint intake (Route B).
   * Strips all internal and user identifiers.
   */
  async findPublicLookup(query: { search?: string; category?: string }) {
    const where: Prisma.MerchantWhereInput = {
      verificationStatus: 'VERIFIED',
      isActive: true,
    };

    if (query.category) where.businessCategory = query.category;
    if (query.search) {
      where.OR = [
        { tradeName: { contains: query.search, mode: 'insensitive' } },
        { registrationNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.merchant.findMany({
      where,
      orderBy: { tradeName: 'asc' },
      select: {
        id: true,
        registrationNumber: true,
        tradeName: true,
        businessType: true,
        businessCategory: true,
        stallNumber: true,
        market: { select: { id: true, code: true, nameEn: true, nameAm: true } },
        woredaOffice: { select: { id: true, code: true, nameEn: true, nameAm: true, subcityCode: true } },
      },
      take: 50,
    });
  }

  /**
   * Lists merchants with jurisdiction scoping for government staff.
   */
  async findAll(actorUserId: string, query: QueryMerchantDto) {
    const actor = await this.getActorContext(actorUserId);
    const where: Prisma.MerchantWhereInput = {};

    if (query.search) {
      where.OR = [
        { tradeName: { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { registrationNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const category = query.businessCategory || query.category;
    if (category) where.businessCategory = category;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.marketId) where.marketId = query.marketId;

    if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.govRole === RoleCode.BUREAU_ADMIN) {
      if (query.woredaOfficeId) where.woredaOfficeId = query.woredaOfficeId;
      if (query.subcityCode) where.woredaOffice = { subcityCode: query.subcityCode };
    } else if (actor.level === OfficeLevel.SUBCITY) {
      where.woredaOffice = { subcityCode: actor.subcityCode! };
      if (query.woredaOfficeId) where.woredaOfficeId = query.woredaOfficeId;
    } else if (actor.level === OfficeLevel.WOREDA) {
      where.woredaOfficeId = actor.officeId!;
    }

    return this.prisma.merchant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
        staff: {
          select: {
            id: true,
            roleInBusiness: true,
            isPrimaryContact: true,
            user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
        staff: {
          select: {
            id: true,
            roleInBusiness: true,
            isPrimaryContact: true,
            user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
          },
        },
      },
    });
    if (!merchant) {
      throw new NotFoundException({ code: 'MERCHANT_NOT_FOUND', message: `Merchant ${id} not found.` });
    }
    return merchant;
  }

  async updateMerchant(actorUserId: string, id: string, dto: UpdateMerchantDto) {
    const merchant = await this.findById(id);
    const actor = await this.getActorContext(actorUserId);

    if (actor.govRole) {
      this.assertJurisdiction(actor, merchant.woredaOffice);
    } else {
      await this.assertMerchantOwner(actorUserId, id);
    }

    const woredaId = dto.woredaOfficeId || merchant.woredaOfficeId;
    if (dto.woredaOfficeId && dto.woredaOfficeId !== merchant.woredaOfficeId) {
      await this.validateWoreda(dto.woredaOfficeId);
    }
    if (dto.marketId !== undefined) {
      if (dto.marketId) {
        await this.validateMarket(dto.marketId, woredaId);
      }
    }

    return this.prisma.merchant.update({
      where: { id },
      data: {
        ...(dto.tradeName ? { tradeName: dto.tradeName } : {}),
        ...(dto.legalName ? { legalName: dto.legalName } : {}),
        ...(dto.businessType ? { businessType: dto.businessType } : {}),
        ...(dto.businessCategory ? { businessCategory: dto.businessCategory } : {}),
        ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.woredaOfficeId ? { woredaOfficeId: dto.woredaOfficeId } : {}),
        ...(dto.marketId !== undefined ? { marketId: dto.marketId || null } : {}),
        ...(dto.stallNumber !== undefined ? { stallNumber: dto.stallNumber || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
      },
    });
  }

  async verifyMerchant(actorUserId: string, id: string, _dto: VerifyMerchantDto) {
    const merchant = await this.findById(id);
    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, merchant.woredaOffice);

    return this.prisma.merchant.update({
      where: { id },
      data: { verificationStatus: 'VERIFIED', isActive: true },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
      },
    });
  }

  async rejectMerchant(actorUserId: string, id: string, _dto: VerifyMerchantDto) {
    const merchant = await this.findById(id);
    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, merchant.woredaOffice);

    return this.prisma.merchant.update({
      where: { id },
      data: { verificationStatus: 'REJECTED' },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
      },
    });
  }

  async suspendMerchant(actorUserId: string, id: string, _dto: VerifyMerchantDto) {
    const merchant = await this.findById(id);
    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, merchant.woredaOffice);

    return this.prisma.merchant.update({
      where: { id },
      data: { verificationStatus: 'SUSPENDED', isActive: false },
      include: {
        woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
        market: { select: { id: true, code: true, nameEn: true } },
      },
    });
  }

  // --- Private Helpers ---

  private async validateWoreda(woredaOfficeId: string) {
    const office = await this.prisma.administrativeOffice.findUnique({ where: { id: woredaOfficeId } });
    if (!office) throw new NotFoundException({ code: 'WOREDA_OFFICE_NOT_FOUND', message: 'Woreda office not found.' });
    if (!office.isActive) throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Woreda office is inactive.' });
    if (office.level !== OfficeLevel.WOREDA) {
      throw new BadRequestException({ code: 'OFFICE_MUST_BE_WOREDA', message: 'Office must be a Woreda office.' });
    }
    return office;
  }

  private async validateMarket(marketId: string, woredaOfficeId: string) {
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new NotFoundException({ code: 'MARKET_NOT_FOUND', message: 'Market not found.' });
    if (!market.isActive) throw new BadRequestException({ code: 'MARKET_INACTIVE', message: 'Market is inactive.' });
    if (market.woredaOfficeId !== woredaOfficeId) {
      throw new BadRequestException({
        code: 'MARKET_WOREDA_MISMATCH',
        message: 'Selected market does not belong to the selected Woreda office.',
      });
    }
  }

  private async getActorContext(actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: {
        roles: { include: { role: true } },
        offices: { where: { isActive: true }, include: { office: true }, take: 1 },
      },
    });
    if (!actor) throw new ForbiddenException({ code: 'ACTOR_NOT_FOUND', message: 'Actor user not found.' });

    const userRoleCodes = actor.roles.map((r) => r.role.code as RoleCode);
    const govRole = userRoleCodes.find((code) => GOV_ROLES.includes(code)) || null;

    const office = actor.offices[0]?.office || null;
    return {
      userId: actor.id,
      govRole,
      officeId: office?.id || null,
      level: office?.level || null,
      subcityCode: office?.subcityCode || null,
    };
  }

  private assertJurisdiction(
    actor: { govRole: RoleCode | null; officeId: string | null; level: OfficeLevel | null; subcityCode: string | null },
    woredaOffice: { id: string; subcityCode?: string | null },
  ) {
    if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.govRole === RoleCode.BUREAU_ADMIN) return;

    if (actor.level === OfficeLevel.SUBCITY) {
      if (actor.subcityCode && woredaOffice.subcityCode === actor.subcityCode) return;
      throw new ForbiddenException({
        code: 'OUTSIDE_SUBCITY_JURISDICTION',
        message: 'Sub-City coordinators can only manage merchants within their Sub-City.',
      });
    }

    if (actor.level === OfficeLevel.WOREDA) {
      if (actor.officeId === woredaOffice.id) return;
      throw new ForbiddenException({
        code: 'OUTSIDE_WOREDA_JURISDICTION',
        message: 'Woreda administrators can only manage merchants in their specific Woreda.',
      });
    }

    throw new ForbiddenException({
      code: 'UNAUTHORIZED_MERCHANT_MANAGEMENT',
      message: 'You do not have administrative jurisdiction to manage merchants.',
    });
  }

  private async assertMerchantOwner(userId: string, merchantId: string) {
    const mu = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId } },
    });
    if (!mu || mu.roleInBusiness !== 'OWNER') {
      throw new ForbiddenException({
        code: 'MERCHANT_ACCESS_DENIED',
        message: 'You are not authorized to update this merchant.',
      });
    }
  }
}
