import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AddMerchantUserDto } from './dto/add-merchant-user.dto';
import { UpdateMerchantUserDto } from './dto/update-merchant-user.dto';
import { MerchantsService } from './merchants.service';

@Injectable()
export class BusinessDeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantsService: MerchantsService,
  ) {}

  /**
   * Retrieves the merchant linked to the authenticated user.
   */
  async getCallerMerchant(actorUserId: string) {
    const mu = await this.prisma.merchantUser.findFirst({
      where: { userId: actorUserId },
      include: {
        merchant: {
          include: {
            woredaOffice: { select: { id: true, code: true, nameEn: true, subcityCode: true } },
            market: { select: { id: true, code: true, nameEn: true } },
          },
        },
      },
    });
    if (!mu) {
      throw new NotFoundException({
        code: 'NOT_A_BUSINESS_USER',
        message: 'You are not linked to any registered business.',
      });
    }
    return { ...mu.merchant, callerRoleInBusiness: mu.roleInBusiness };
  }

  /**
   * Updates caller's merchant details (owner only).
   */
  async updateCallerMerchant(actorUserId: string, dto: UpdateMerchantDto) {
    const caller = await this.getCallerMerchant(actorUserId);
    if (caller.callerRoleInBusiness !== 'OWNER') {
      throw new ForbiddenException({
        code: 'OWNER_PRIVILEGE_REQUIRED',
        message: 'Only business owners can update business details.',
      });
    }
    return this.merchantsService.updateMerchant(actorUserId, caller.id, dto);
  }

  /**
   * Lists all staff and owners belonging to the caller's business.
   */
  async listMerchantUsers(actorUserId: string) {
    const caller = await this.getCallerMerchant(actorUserId);
    return this.prisma.merchantUser.findMany({
      where: { merchantId: caller.id },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true, email: true, status: true } },
      },
    });
  }

  /**
   * Adds an employee or co-owner to the caller's business (owner only).
   */
  async addMerchantUser(actorUserId: string, dto: AddMerchantUserDto) {
    const caller = await this.getCallerMerchant(actorUserId);
    if (caller.callerRoleInBusiness !== 'OWNER') {
      throw new ForbiddenException({ code: 'OWNER_REQUIRED', message: 'Only owners may add staff.' });
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!targetUser) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Target user not found.' });

    const businessRole = await this.prisma.role.findUnique({ where: { code: RoleCode.BUSINESS_OWNER } });
    if (businessRole) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: dto.userId, roleId: businessRole.id } },
        update: {},
        create: { userId: dto.userId, roleId: businessRole.id },
      });
    }

    return this.prisma.merchantUser.create({
      data: {
        merchantId: caller.id,
        userId: dto.userId,
        roleInBusiness: dto.roleInBusiness || 'EMPLOYEE',
        isPrimaryContact: dto.isPrimaryContact !== undefined ? dto.isPrimaryContact : false,
      },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
      },
    });
  }

  /**
   * Updates an employee or co-owner role (owner only, protects primary contact).
   */
  async updateMerchantUser(actorUserId: string, targetUserId: string, dto: UpdateMerchantUserDto) {
    const caller = await this.getCallerMerchant(actorUserId);
    if (caller.callerRoleInBusiness !== 'OWNER') {
      throw new ForbiddenException({ code: 'OWNER_REQUIRED', message: 'Only owners may update staff roles.' });
    }

    const target = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId: caller.id, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Business user not found.' });

    if (dto.isPrimaryContact === false && target.isPrimaryContact) {
      const otherPrimary = await this.prisma.merchantUser.findFirst({
        where: { merchantId: caller.id, userId: { not: targetUserId }, isPrimaryContact: true },
      });
      if (!otherPrimary) {
        throw new BadRequestException({
          code: 'CANNOT_REMOVE_LAST_PRIMARY',
          message: 'The business must keep at least one primary contact.',
        });
      }
    }

    return this.prisma.merchantUser.update({
      where: { merchantId_userId: { merchantId: caller.id, userId: targetUserId } },
      data: {
        ...(dto.roleInBusiness ? { roleInBusiness: dto.roleInBusiness } : {}),
        ...(dto.isPrimaryContact !== undefined ? { isPrimaryContact: dto.isPrimaryContact } : {}),
      },
    });
  }

  /**
   * Removes an employee or co-owner from the business (prevents removing last owner).
   */
  async removeMerchantUser(actorUserId: string, targetUserId: string) {
    const caller = await this.getCallerMerchant(actorUserId);
    if (caller.callerRoleInBusiness !== 'OWNER') {
      throw new ForbiddenException({ code: 'OWNER_REQUIRED', message: 'Only owners may remove staff.' });
    }

    const target = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId: caller.id, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Business user not found.' });

    if (target.roleInBusiness === 'OWNER') {
      const otherOwners = await this.prisma.merchantUser.findMany({
        where: { merchantId: caller.id, userId: { not: targetUserId }, roleInBusiness: 'OWNER' },
      });
      if (otherOwners.length === 0) {
        throw new BadRequestException({
          code: 'CANNOT_REMOVE_LAST_OWNER',
          message: 'Cannot remove the last business owner.',
        });
      }
    }

    await this.prisma.merchantUser.delete({
      where: { merchantId_userId: { merchantId: caller.id, userId: targetUserId } },
    });
    return { success: true };
  }
}

