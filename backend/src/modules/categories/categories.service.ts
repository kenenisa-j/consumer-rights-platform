import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public list of active categories for complaint intake dropdowns.
   */
  async findPublicActive() {
    return this.prisma.complaintCategory.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameAm: true,
        nameOm: true,
        nameTi: true,
        nameSo: true,
        defaultSlaDays: true,
        defaultRemitLevel: true,
      },
    });
  }

  /**
   * Admin list of categories with filtering.
   */
  async findAll(query: QueryCategoryDto) {
    const where: Prisma.ComplaintCategoryWhereInput = {};

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.remitLevel) where.defaultRemitLevel = query.remitLevel;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { nameAm: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.complaintCategory.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      include: {
        _count: { select: { cases: true } },
      },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.complaintCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { cases: true } },
      },
    });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: `Complaint category ${id} not found.`,
      });
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.complaintCategory.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CATEGORY_CODE_EXISTS',
        message: `Complaint category with code '${normalizedCode}' already exists.`,
      });
    }

    return this.prisma.complaintCategory.create({
      data: {
        code: normalizedCode,
        nameEn: dto.nameEn,
        nameAm: dto.nameAm,
        nameOm: dto.nameOm || null,
        nameTi: dto.nameTi || null,
        nameSo: dto.nameSo || null,
        defaultSlaDays: dto.defaultSlaDays || 5,
        defaultRemitLevel: dto.defaultRemitLevel || 'WOREDA',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);

    return this.prisma.complaintCategory.update({
      where: { id },
      data: {
        ...(dto.nameEn ? { nameEn: dto.nameEn } : {}),
        ...(dto.nameAm ? { nameAm: dto.nameAm } : {}),
        ...(dto.nameOm !== undefined ? { nameOm: dto.nameOm || null } : {}),
        ...(dto.nameTi !== undefined ? { nameTi: dto.nameTi || null } : {}),
        ...(dto.nameSo !== undefined ? { nameSo: dto.nameSo || null } : {}),
        ...(dto.defaultSlaDays ? { defaultSlaDays: dto.defaultSlaDays } : {}),
        ...(dto.defaultRemitLevel ? { defaultRemitLevel: dto.defaultRemitLevel } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    const category = await this.findById(id);
    const caseCount = await this.prisma.case.count({ where: { categoryId: id } });

    if (caseCount > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_IN_USE',
        message: `Cannot delete category '${category.nameEn}' because ${caseCount} cases reference it. Deactivate it instead.`,
      });
    }

    return this.prisma.complaintCategory.delete({
      where: { id },
    });
  }
}

