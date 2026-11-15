import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OfficeLevel, RoleCode } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { AuthService } from '../../lib/auth/auth.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { TransferStaffDto } from './dto/transfer-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import {
  assertCanManageRole,
  assertOfficeLevelCompatibility,
  assertStaffJurisdiction,
  resolveStaffActorContext,
  validateStaffUserAndOffice,
  getHighestRole,
} from './staff.helpers';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createStaff(actorUserId: string, dto: CreateStaffDto) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    assertCanManageRole(actor, dto.roleCode);

    if (dto.officeId) {
      const office = await this.prisma.administrativeOffice.findUnique({
        where: { id: dto.officeId },
      });
      if (!office) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Office not found.' });
      if (!office.isActive) throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Office is inactive.' });

      assertOfficeLevelCompatibility([dto.roleCode], office.level);
      assertStaffJurisdiction(actor, office);
    }

    const phone = dto.phoneNumber.startsWith('+') ? dto.phoneNumber : `+251${dto.phoneNumber.replace(/^0/, '')}`;
    const [existingPhone, existingEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { phoneNumber: phone } }),
      this.prisma.user.findFirst({ where: { email: dto.email } }),
    ]);

    if (existingPhone) {
      throw new ConflictException({
        code: 'PHONE_ALREADY_EXISTS',
        message: 'A user with this phone number already exists.',
      });
    }
    if (existingEmail) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email address already exists.',
      });
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    const roleRecord = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
    if (!roleRecord) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found.' });

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phoneNumber: phone,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          emailVerified: true,
          phoneNumberVerified: true,
          status: 'ACTIVE',
          preferredLanguage: 'en',
        },
      });

      await tx.account.create({
        data: {
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: roleRecord.id,
        },
      });

      let deployment = null;
      if (dto.officeId) {
        deployment = await tx.userOffice.create({
          data: {
            userId: user.id,
            officeId: dto.officeId,
            roleInOffice: dto.roleInOffice || 'OFFICER',
            isPrimary: true,
            isActive: true,
          },
        });
      }

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
        role: dto.roleCode,
        deployment,
      };
    });
  }

  async listStaff(actorUserId: string, query: QueryStaffDto) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    const where: any = {
      roles: {
        some: {
          role: {
            code: {
              in: [
                RoleCode.WOREDA_OFFICER,
                RoleCode.WOREDA_ADMIN,
                RoleCode.SUBCITY_COORDINATOR,
                RoleCode.BUREAU_OFFICER,
                RoleCode.BUREAU_ADMIN,
                RoleCode.CONTENT_ADMIN,
                RoleCode.SYSTEM_SUPERADMIN,
              ],
            },
          },
        },
      },
    };

    if (query.roleInOffice) {
      where.offices = { some: { roleInOffice: query.roleInOffice, isActive: true } };
    }

    if (query.officeId) {
      const office = await this.prisma.administrativeOffice.findUnique({ where: { id: query.officeId } });
      if (!office) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Office not found.' });
      assertStaffJurisdiction(actor, office);
      where.offices = { some: { officeId: query.officeId, ...(query.isActive !== undefined ? { isActive: query.isActive } : {}) } };
    } else if (actor.level === OfficeLevel.WOREDA) {
      where.offices = { some: { officeId: actor.officeId, isActive: true } };
    } else if (actor.level === OfficeLevel.SUBCITY) {
      where.offices = {
        some: {
          office: {
            OR: [
              { id: actor.officeId },
              { parentOfficeId: actor.officeId },
            ],
          },
          isActive: true,
        },
      };
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        status: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
        offices: {
          where: { isActive: true },
          select: {
            id: true,
            roleInOffice: true,
            isPrimary: true,
            office: { select: { id: true, code: true, nameEn: true, level: true } },
          },
        },
      },
    });
  }

  async getStaffById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        status: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
        offices: {
          orderBy: [{ isActive: 'desc' }, { assignedAt: 'desc' }],
          select: {
            id: true,
            roleInOffice: true,
            isPrimary: true,
            isActive: true,
            assignedAt: true,
            unassignedAt: true,
            office: { select: { id: true, code: true, nameEn: true, nameAm: true, level: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Staff user not found.' });
    }
    return user;
  }

  async updateStaff(actorUserId: string, targetUserId: string, dto: UpdateStaffDto) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    const target = await this.getStaffById(targetUserId);

    if (dto.roleCode) {
      assertCanManageRole(actor, dto.roleCode);
      const targetHighestRole = getHighestRole(target.roles.map((r) => r.role.code as RoleCode));
      assertCanManageRole(actor, targetHighestRole);
    }

    if (dto.email && dto.email !== target.email) {
      const emailDup = await this.prisma.user.findFirst({ where: { email: dto.email } });
      if (emailDup) throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email already exists.' });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.roleCode) {
        const newRole = await tx.role.findUnique({ where: { code: dto.roleCode } });
        if (!newRole) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found.' });
        await tx.userRole.deleteMany({ where: { userId: targetUserId } });
        await tx.userRole.create({ data: { userId: targetUserId, roleId: newRole.id } });
      }

      return tx.user.update({
        where: { id: targetUserId },
        data: {
          ...(dto.fullName ? { fullName: dto.fullName } : {}),
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          status: true,
          roles: { select: { role: { select: { code: true } } } },
        },
      });
    });
  }

  async assignStaff(actorUserId: string, dto: AssignStaffDto) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    const { office } = await validateStaffUserAndOffice(this.prisma, dto.userId, dto.officeId);
    assertStaffJurisdiction(actor, office);

    const activeDeployment = await this.prisma.userOffice.findFirst({
      where: { userId: dto.userId, isActive: true },
    });
    if (activeDeployment) {
      throw new ConflictException({
        code: 'USER_ALREADY_DEPLOYED',
        message: 'Staff member already has an active office deployment. Transfer or unassign first.',
      });
    }

    return this.prisma.userOffice.create({
      data: {
        userId: dto.userId,
        officeId: dto.officeId,
        roleInOffice: dto.roleInOffice || 'OFFICER',
        isPrimary: dto.isPrimary !== undefined ? dto.isPrimary : true,
        isActive: true,
      },
      include: {
        office: { select: { id: true, code: true, nameEn: true, level: true } },
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
    });
  }

  async transferStaff(actorUserId: string, userId: string, dto: TransferStaffDto) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    return this.prisma.$transaction(async (tx) => {
      const activeDeployment = await tx.userOffice.findFirst({
        where: { userId, isActive: true },
        include: { office: true },
      });
      if (!activeDeployment) {
        throw new NotFoundException({
          code: 'NO_ACTIVE_DEPLOYMENT',
          message: 'Staff member does not have an active deployment to transfer.',
        });
      }

      if (activeDeployment.officeId === dto.newOfficeId) {
        throw new BadRequestException({
          code: 'CANNOT_TRANSFER_TO_SAME_OFFICE',
          message: 'Target office is identical to current deployed office.',
        });
      }

      const targetOffice = await tx.administrativeOffice.findUnique({
        where: { id: dto.newOfficeId },
      });
      if (!targetOffice) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Target office not found.' });
      if (!targetOffice.isActive) throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Target office is inactive.' });

      assertStaffJurisdiction(actor, activeDeployment.office);
      assertStaffJurisdiction(actor, targetOffice);

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });

      assertOfficeLevelCompatibility(user.roles.map((r) => r.role.code), targetOffice.level);

      const now = new Date();
      await tx.userOffice.update({
        where: { id: activeDeployment.id },
        data: { isActive: false, unassignedAt: now },
      });

      return tx.userOffice.create({
        data: {
          userId,
          officeId: dto.newOfficeId,
          roleInOffice: dto.roleInOffice || activeDeployment.roleInOffice,
          isPrimary: true,
          isActive: true,
          assignedAt: now,
        },
        include: {
          office: { select: { id: true, code: true, nameEn: true, level: true } },
          user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        },
      });
    });
  }

  async deactivateAssignment(actorUserId: string, assignmentId: string) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    const deployment = await this.prisma.userOffice.findUnique({
      where: { id: assignmentId },
      include: { office: true },
    });
    if (!deployment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment not found.' });

    assertStaffJurisdiction(actor, deployment.office);
    if (!deployment.isActive) return deployment;

    return this.prisma.userOffice.update({
      where: { id: assignmentId },
      data: { isActive: false, unassignedAt: new Date() },
    });
  }

  async unassignStaff(actorUserId: string, userId: string) {
    const actor = await resolveStaffActorContext(this.prisma, actorUserId);
    const active = await this.prisma.userOffice.findFirst({
      where: { userId, isActive: true },
      include: { office: true },
    });
    if (!active) throw new NotFoundException({ code: 'NO_ACTIVE_DEPLOYMENT', message: 'No active deployment found.' });

    assertStaffJurisdiction(actor, active.office);

    return this.prisma.userOffice.update({
      where: { id: active.id },
      data: { isActive: false, unassignedAt: new Date() },
    });
  }
}
