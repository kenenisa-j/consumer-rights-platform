import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OfficeLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { QueryOfficeDto } from './dto/query-office.dto';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new administrative office adhering to the government hierarchy.
   */
  async create(dto: CreateOfficeDto) {
    const existing = await this.prisma.administrativeOffice.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'OFFICE_CODE_EXISTS',
        message: `Office code ${dto.code} already exists.`,
      });
    }

    await this.validateHierarchy(dto.level, dto.parentOfficeId);

    return this.prisma.administrativeOffice.create({
      data: {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAm: dto.nameAm,
        level: dto.level,
        parentOfficeId: dto.parentOfficeId || null,
        subcityCode: dto.subcityCode || null,
        woredaCode: dto.woredaCode || null,
        address: dto.address,
        phone: dto.phone,
        email: dto.email || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        parentOffice: {
          select: { id: true, code: true, nameEn: true, level: true },
        },
      },
    });
  }

  /**
   * Retrieves an office by ID with its parent and child offices.
   */
  async findById(id: string) {
    const office = await this.prisma.administrativeOffice.findUnique({
      where: { id },
      include: {
        parentOffice: {
          select: { id: true, code: true, nameEn: true, nameAm: true, level: true },
        },
        childOffices: {
          select: { id: true, code: true, nameEn: true, nameAm: true, level: true, isActive: true },
        },
      },
    });

    if (!office) {
      throw new NotFoundException({
        code: 'OFFICE_NOT_FOUND',
        message: 'Administrative office not found.',
      });
    }

    return office;
  }

  /**
   * Lists administrative offices matching optional query filters.
   */
  async findAll(query: QueryOfficeDto) {
    const where: Prisma.AdministrativeOfficeWhereInput = {};

    if (query.level) where.level = query.level;
    if (query.parentOfficeId) where.parentOfficeId = query.parentOfficeId;
    if (query.subcityCode) where.subcityCode = query.subcityCode;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.administrativeOffice.findMany({
      where,
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
      include: {
        parentOffice: {
          select: { id: true, code: true, nameEn: true, level: true },
        },
      },
    });
  }

  /**
   * Updates office details and revalidates hierarchy relationships.
   */
  async update(id: string, dto: UpdateOfficeDto) {
    const office = await this.prisma.administrativeOffice.findUnique({
      where: { id },
    });
    if (!office) {
      throw new NotFoundException({
        code: 'OFFICE_NOT_FOUND',
        message: 'Administrative office not found.',
      });
    }

    if (dto.parentOfficeId !== undefined) {
      if (dto.parentOfficeId === id) {
        throw new BadRequestException({
          code: 'OFFICE_CANNOT_BE_OWN_PARENT',
          message: 'An office cannot be its own parent.',
        });
      }

      await this.validateHierarchy(office.level, dto.parentOfficeId || undefined);

      if (dto.parentOfficeId) {
        await this.assertNoCircularDependency(id, dto.parentOfficeId);
      }
    }

    return this.prisma.administrativeOffice.update({
      where: { id },
      data: {
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.nameAm !== undefined ? { nameAm: dto.nameAm } : {}),
        ...(dto.parentOfficeId !== undefined ? { parentOfficeId: dto.parentOfficeId || null } : {}),
        ...(dto.subcityCode !== undefined ? { subcityCode: dto.subcityCode } : {}),
        ...(dto.woredaCode !== undefined ? { woredaCode: dto.woredaCode } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        parentOffice: {
          select: { id: true, code: true, nameEn: true, level: true },
        },
      },
    });
  }

  /**
   * Deactivates an office. Refuses if there are active child offices.
   */
  async deactivate(id: string) {
    const office = await this.prisma.administrativeOffice.findUnique({
      where: { id },
      include: {
        childOffices: { where: { isActive: true } },
      },
    });

    if (!office) {
      throw new NotFoundException({
        code: 'OFFICE_NOT_FOUND',
        message: 'Administrative office not found.',
      });
    }

    if (office.childOffices.length > 0) {
      throw new BadRequestException({
        code: 'OFFICE_HAS_ACTIVE_CHILDREN',
        message: 'Cannot deactivate an office with active subordinate child offices.',
      });
    }

    return this.prisma.administrativeOffice.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Safely deletes an office only if zero related records exist.
   */
  async delete(id: string) {
    const office = await this.prisma.administrativeOffice.findUnique({
      where: { id },
      include: {
        childOffices: { select: { id: true } },
        staffDeployments: { select: { id: true } },
        merchants: { select: { id: true } },
        markets: { select: { id: true } },
        casesCurrentlyHeld: { select: { id: true } },
      },
    });

    if (!office) {
      throw new NotFoundException({
        code: 'OFFICE_NOT_FOUND',
        message: 'Administrative office not found.',
      });
    }

    const hasDependencies =
      office.childOffices.length > 0 ||
      office.staffDeployments.length > 0 ||
      office.merchants.length > 0 ||
      office.markets.length > 0 ||
      office.casesCurrentlyHeld.length > 0;

    if (hasDependencies) {
      throw new BadRequestException({
        code: 'OFFICE_HAS_DEPENDENCIES',
        message: 'Cannot delete office referenced by existing records. Deactivate it instead.',
      });
    }

    return this.prisma.administrativeOffice.delete({
      where: { id },
    });
  }

  /**
   * Validates level compatibility and strict parent level relationships.
   */
  private async validateHierarchy(level: OfficeLevel, parentOfficeId?: string) {
    if (level === OfficeLevel.CITY_BUREAU) {
      if (parentOfficeId) {
        throw new BadRequestException({
          code: 'BUREAU_CANNOT_HAVE_PARENT',
          message: 'A City Bureau office is the top level and cannot have a parent office.',
        });
      }
      return;
    }

    if (!parentOfficeId) {
      throw new BadRequestException({
        code: 'PARENT_OFFICE_REQUIRED',
        message: `Office level ${level} requires a parentOfficeId.`,
      });
    }

    const parent = await this.prisma.administrativeOffice.findUnique({
      where: { id: parentOfficeId },
    });

    if (!parent) {
      throw new NotFoundException({
        code: 'PARENT_OFFICE_NOT_FOUND',
        message: 'Parent administrative office not found.',
      });
    }

    if (!parent.isActive) {
      throw new BadRequestException({
        code: 'PARENT_OFFICE_INACTIVE',
        message: 'Parent administrative office must be active.',
      });
    }

    if (level === OfficeLevel.SUBCITY && parent.level !== OfficeLevel.CITY_BUREAU) {
      throw new BadRequestException({
        code: 'SUBCITY_MUST_BELONG_TO_BUREAU',
        message: 'A Sub-City office must belong directly to a City Bureau office.',
      });
    }

    if (level === OfficeLevel.WOREDA && parent.level !== OfficeLevel.SUBCITY) {
      throw new BadRequestException({
        code: 'WOREDA_MUST_BELONG_TO_SUBCITY',
        message: 'A Woreda office must belong directly to a Sub-City office.',
      });
    }
  }

  /**
   * Ascends the ancestor tree to ensure `targetParentId` does not originate from `officeId`.
   */
  private async assertNoCircularDependency(officeId: string, targetParentId: string) {
    let currentId: string | null = targetParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === officeId) {
        throw new BadRequestException({
          code: 'CIRCULAR_PARENT_RELATIONSHIP',
          message: 'Circular hierarchy detected: cannot set a descendant office as parent.',
        });
      }

      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const parent: { parentOfficeId: string | null } | null = await this.prisma.administrativeOffice.findUnique({
        where: { id: currentId },
        select: { parentOfficeId: true },
      });

      currentId = parent?.parentOfficeId ?? null;
    }
  }
}

