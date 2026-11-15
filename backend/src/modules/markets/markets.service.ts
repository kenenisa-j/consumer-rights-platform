import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { OfficeLevel, RoleCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { QueryMarketDto } from './dto/query-market.dto';

@Injectable()
export class MarketsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a new public market assigned to a Woreda office.
   */
  async createMarket(actorUserId: string, dto: CreateMarketDto) {
    const existing = await this.prisma.market.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'MARKET_CODE_EXISTS',
        message: `Market code ${dto.code} already exists.`,
      });
    }

    const woredaOffice = await this.validateWoredaAndSubcity(dto.woredaOfficeId, dto.subcityCode);

    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, woredaOffice);

    return this.prisma.market.create({
      data: {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAm: dto.nameAm,
        subcityCode: dto.subcityCode,
        woredaOfficeId: dto.woredaOfficeId,
        locationDescription: dto.locationDescription,
        gpsCoordinates: dto.gpsCoordinates || null,
        totalStalls: dto.totalStalls !== undefined ? dto.totalStalls : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        woredaOffice: {
          select: { id: true, code: true, nameEn: true, level: true, subcityCode: true },
        },
      },
    });
  }

  /**
   * Lists markets with optional filters and search.
   */
  async findAll(query: QueryMarketDto) {
    const where: Prisma.MarketWhereInput = {};

    if (query.subcityCode) where.subcityCode = query.subcityCode;
    if (query.woredaOfficeId) where.woredaOfficeId = query.woredaOfficeId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { nameAm: { contains: query.search } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.market.findMany({
      where,
      orderBy: [{ subcityCode: 'asc' }, { nameEn: 'asc' }],
      include: {
        woredaOffice: {
          select: { id: true, code: true, nameEn: true, level: true, subcityCode: true },
        },
      },
    });
  }

  /**
   * Retrieves single market by ID.
   */
  async findById(id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        woredaOffice: {
          select: { id: true, code: true, nameEn: true, nameAm: true, level: true, subcityCode: true },
        },
      },
    });

    if (!market) {
      throw new NotFoundException({
        code: 'MARKET_NOT_FOUND',
        message: 'Market not found.',
      });
    }

    return market;
  }

  /**
   * Updates market details and revalidates Woreda/Sub-City consistency.
   */
  async updateMarket(actorUserId: string, id: string, dto: UpdateMarketDto) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: { woredaOffice: true },
    });
    if (!market) {
      throw new NotFoundException({ code: 'MARKET_NOT_FOUND', message: 'Market not found.' });
    }

    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, market.woredaOffice);

    let targetWoredaId = market.woredaOfficeId;
    let targetSubcityCode = market.subcityCode;

    if (dto.woredaOfficeId || dto.subcityCode) {
      targetWoredaId = dto.woredaOfficeId || market.woredaOfficeId;
      targetSubcityCode = dto.subcityCode || market.subcityCode;

      const newWoredaOffice = await this.validateWoredaAndSubcity(targetWoredaId, targetSubcityCode);
      this.assertJurisdiction(actor, newWoredaOffice);
    }

    return this.prisma.market.update({
      where: { id },
      data: {
        ...(dto.nameEn ? { nameEn: dto.nameEn } : {}),
        ...(dto.nameAm ? { nameAm: dto.nameAm } : {}),
        ...(dto.subcityCode ? { subcityCode: targetSubcityCode } : {}),
        ...(dto.woredaOfficeId ? { woredaOfficeId: targetWoredaId } : {}),
        ...(dto.locationDescription ? { locationDescription: dto.locationDescription } : {}),
        ...(dto.gpsCoordinates !== undefined ? { gpsCoordinates: dto.gpsCoordinates || null } : {}),
        ...(dto.totalStalls !== undefined ? { totalStalls: dto.totalStalls } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        woredaOffice: {
          select: { id: true, code: true, nameEn: true, level: true, subcityCode: true },
        },
      },
    });
  }

  /**
   * Deactivates a market.
   */
  async deactivateMarket(actorUserId: string, id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: { woredaOffice: true },
    });
    if (!market) throw new NotFoundException({ code: 'MARKET_NOT_FOUND', message: 'Market not found.' });

    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, market.woredaOffice);

    return this.prisma.market.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Deletes a market if no related records exist.
   */
  async deleteMarket(actorUserId: string, id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        woredaOffice: true,
        merchants: { select: { id: true }, take: 1 },
        cases: { select: { id: true }, take: 1 },
        anonymousReports: { select: { id: true }, take: 1 },
      },
    });
    if (!market) throw new NotFoundException({ code: 'MARKET_NOT_FOUND', message: 'Market not found.' });

    const actor = await this.getActorContext(actorUserId);
    this.assertJurisdiction(actor, market.woredaOffice);

    const hasDependencies =
      market.merchants.length > 0 ||
      market.cases.length > 0 ||
      market.anonymousReports.length > 0;

    if (hasDependencies) {
      throw new BadRequestException({
        code: 'MARKET_HAS_DEPENDENCIES',
        message: 'Cannot delete market referenced by merchants or cases. Deactivate instead.',
      });
    }

    return this.prisma.market.delete({
      where: { id },
    });
  }

  private async validateWoredaAndSubcity(woredaOfficeId: string, subcityCode: string) {
    const office = await this.prisma.administrativeOffice.findUnique({
      where: { id: woredaOfficeId },
    });
    if (!office) {
      throw new NotFoundException({
        code: 'WOREDA_OFFICE_NOT_FOUND',
        message: 'Assigned Woreda office not found.',
      });
    }
    if (!office.isActive) {
      throw new BadRequestException({
        code: 'OFFICE_INACTIVE',
        message: 'Assigned Woreda office is inactive.',
      });
    }
    if (office.level !== OfficeLevel.WOREDA) {
      throw new BadRequestException({
        code: 'OFFICE_MUST_BE_WOREDA',
        message: 'A market must be directly assigned to a Woreda office.',
      });
    }
    if (office.subcityCode && office.subcityCode !== subcityCode) {
      throw new BadRequestException({
        code: 'SUBCITY_MISMATCH',
        message: `Woreda office belongs to Sub-City ${office.subcityCode}, not ${subcityCode}.`,
      });
    }

    return office;
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
    const isSuperOrBureau = actor.roles.some(
      (r) => r.role.code === RoleCode.SYSTEM_SUPERADMIN || r.role.code === RoleCode.BUREAU_ADMIN,
    );
    const activeOffice = actor.offices[0]?.office || null;

    return {
      userId: actor.id,
      isSuperOrBureau,
      officeId: activeOffice?.id || null,
      level: activeOffice?.level || null,
      subcityCode: activeOffice?.subcityCode || null,
    };
  }

  private assertJurisdiction(
    actor: { isSuperOrBureau: boolean; officeId: string | null; level: OfficeLevel | null; subcityCode: string | null },
    marketOffice: { id: string; subcityCode?: string | null },
  ) {
    if (actor.isSuperOrBureau) return; // City-wide authority

    if (actor.level === OfficeLevel.SUBCITY) {
      if (actor.subcityCode && marketOffice.subcityCode === actor.subcityCode) return;
      throw new ForbiddenException({
        code: 'OUTSIDE_SUBCITY_JURISDICTION',
        message: 'Sub-City coordinators can only manage markets within their Sub-City.',
      });
    }

    if (actor.level === OfficeLevel.WOREDA) {
      if (actor.officeId === marketOffice.id) return;
      throw new ForbiddenException({
        code: 'OUTSIDE_WOREDA_JURISDICTION',
        message: 'Woreda administrators can only manage markets within their specific Woreda.',
      });
    }

    throw new ForbiddenException({
      code: 'UNAUTHORIZED_MARKET_MANAGEMENT',
      message: 'You do not have administrative jurisdiction to manage markets.',
    });
  }
}

