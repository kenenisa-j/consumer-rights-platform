import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { RoleCode, OfficeLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';

const ROLE_RANK: Record<RoleCode, number> = {
  [RoleCode.SYSTEM_SUPERADMIN]: 100,
  [RoleCode.BUREAU_ADMIN]: 80,
  [RoleCode.BUREAU_OFFICER]: 70,
  [RoleCode.CONTENT_ADMIN]: 70,
  [RoleCode.SUBCITY_COORDINATOR]: 60,
  [RoleCode.WOREDA_ADMIN]: 40,
  [RoleCode.WOREDA_OFFICER]: 30,
  [RoleCode.BUSINESS_OWNER]: 10,
  [RoleCode.CONSUMER]: 0,
};

@Injectable()
export class RolesPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    return this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      include: {
        permissions: {
          select: {
            permission: {
              select: { id: true, code: true, module: true, action: true, scope: true, description: true },
            },
          },
        },
      },
    });
  }

  async getRole(code: RoleCode) {
    const role = await this.prisma.role.findUnique({
      where: { code },
      include: {
        permissions: {
          select: {
            permission: {
              select: { id: true, code: true, module: true, action: true, scope: true, description: true },
            },
          },
        },
      },
    });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Role ${code} not found.` });
    return role;
  }

  async listPermissions(query: QueryPermissionDto) {
    const where: Prisma.PermissionWhereInput = {};
    if (query.module) where.module = query.module;
    if (query.scope) where.scope = query.scope;

    return this.prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async createPermission(actorUserId: string, dto: CreatePermissionDto) {
    const actor = await this.getActorContext(actorUserId);
    if (actor.highestRole !== RoleCode.SYSTEM_SUPERADMIN && actor.highestRole !== RoleCode.BUREAU_ADMIN) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Only City Bureau administrators and System administrators can create permissions.',
      });
    }

    const existing = await this.prisma.permission.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException({
        code: 'PERMISSION_EXISTS',
        message: `Permission ${dto.code} already exists.`,
      });
    }

    return this.prisma.permission.create({
      data: {
        code: dto.code,
        module: dto.module,
        action: dto.action,
        scope: dto.scope || 'ALL',
        description: dto.description || null,
      },
    });
  }

  async assignPermissionToRole(actorUserId: string, roleCode: RoleCode, dto: AssignPermissionDto) {
    const actor = await this.getActorContext(actorUserId);
    this.assertCanManageRole(actor, roleCode);

    if (roleCode === RoleCode.CONSUMER || roleCode === RoleCode.BUSINESS_OWNER) {
      if (!dto.permissionCode.endsWith(':own') && !dto.permissionCode.startsWith('profile:')) {
        throw new BadRequestException({
          code: 'INVALID_NON_GOV_PERMISSION',
          message: 'Consumer and business roles may only hold own-scoped permissions.',
        });
      }
    }

    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { code: roleCode } }),
      this.prisma.permission.findUnique({ where: { code: dto.permissionCode } }),
    ]);

    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found.' });
    if (!permission) throw new NotFoundException({ code: 'PERMISSION_NOT_FOUND', message: 'Permission not found.' });

    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
      include: {
        role: { select: { code: true } },
        permission: { select: { code: true, module: true, scope: true } },
      },
    });
  }

  async revokePermissionFromRole(actorUserId: string, roleCode: RoleCode, permissionCode: string) {
    const actor = await this.getActorContext(actorUserId);
    this.assertCanManageRole(actor, roleCode);

    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { code: roleCode } }),
      this.prisma.permission.findUnique({ where: { code: permissionCode } }),
    ]);

    if (!role || !permission) {
      throw new NotFoundException({ code: 'RECORD_NOT_FOUND', message: 'Role or permission not found.' });
    }

    await this.prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });

    return { revoked: true, roleCode, permissionCode };
  }

  async assignRoleToUser(actorUserId: string, targetUserId: string, roleCode: RoleCode) {
    const actor = await this.getActorContext(actorUserId);
    this.assertCanManageRole(actor, roleCode);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: { include: { role: true } },
        offices: { where: { isActive: true }, include: { office: true }, take: 1 },
      },
    });

    if (!targetUser) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Target user not found.' });
    if (targetUser.status !== 'ACTIVE') throw new BadRequestException({ code: 'USER_INACTIVE', message: 'User is inactive.' });

    const targetHighestRole = this.getHighestRole(targetUser.roles.map((r) => r.role.code as RoleCode));
    this.assertCanManageRole(actor, targetHighestRole);

    await this.assertJurisdictionForRole(actor, targetUser.offices[0]?.office || null, roleCode);

    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found.' });

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
      update: {},
      create: { userId: targetUserId, roleId: role.id },
    });

    return this.getUserEffectiveScope(targetUserId);
  }

  async revokeRoleFromUser(actorUserId: string, targetUserId: string, roleCode: RoleCode) {
    const actor = await this.getActorContext(actorUserId);
    this.assertCanManageRole(actor, roleCode);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: { include: { role: true } },
        offices: { where: { isActive: true }, include: { office: true }, take: 1 },
      },
    });

    if (!targetUser) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Target user not found.' });
    if (targetUser.roles.length <= 1) {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_LAST_ROLE',
        message: 'A user must hold at least one role.',
      });
    }

    const targetHighestRole = this.getHighestRole(targetUser.roles.map((r) => r.role.code as RoleCode));
    this.assertCanManageRole(actor, targetHighestRole);

    await this.assertJurisdictionForRole(actor, targetUser.offices[0]?.office || null, roleCode);

    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found.' });

    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId: role.id },
    });

    return this.getUserEffectiveScope(targetUserId);
  }

  async getUserEffectiveScope(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        offices: {
          where: { isActive: true },
          include: { office: true },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });

    const roles = user.roles.map((r) => r.role.code);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    const activeOffice = user.offices[0]?.office || null;
    const level = activeOffice ? (activeOffice.level === OfficeLevel.CITY_BUREAU ? 'bureau' : activeOffice.level.toLowerCase()) : 'none';

    return {
      userId: user.id,
      fullName: user.fullName,
      status: user.status,
      roles,
      permissions,
      activeOffice: activeOffice
        ? {
            id: activeOffice.id,
            code: activeOffice.code,
            nameEn: activeOffice.nameEn,
            level,
            subcityCode: activeOffice.subcityCode,
            woredaCode: activeOffice.woredaCode,
          }
        : null,
      jurisdictionLevel: level,
    };
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
    const highestRole = this.getHighestRole(actor.roles.map((r) => r.role.code as RoleCode));
    const activeOffice = actor.offices[0]?.office || null;

    return {
      userId: actor.id,
      highestRole,
      officeId: activeOffice?.id || null,
      level: activeOffice?.level || null,
    };
  }

  private getHighestRole(roles: RoleCode[]): RoleCode {
    return roles.reduce((highest, current) => {
      return (ROLE_RANK[current] || 0) > (ROLE_RANK[highest] || 0) ? current : highest;
    }, RoleCode.CONSUMER);
  }

  private assertCanManageRole(actor: { highestRole: RoleCode }, targetRole: RoleCode) {
    if ((ROLE_RANK[actor.highestRole] || 0) <= (ROLE_RANK[targetRole] || 0)) {
      throw new ForbiddenException({
        code: 'PRIVILEGE_ESCALATION_PROHIBITED',
        message: 'Cannot assign, modify, or revoke a role equal to or higher than your own authorization rank.',
      });
    }
  }

  private async assertJurisdictionForRole(
    actor: { highestRole: RoleCode; officeId: string | null; level: OfficeLevel | null },
    targetOffice: { id: string; level: OfficeLevel; parentOfficeId?: string | null } | null,
    roleToAssign: RoleCode,
  ) {
    if (actor.highestRole === RoleCode.SYSTEM_SUPERADMIN || actor.highestRole === RoleCode.BUREAU_ADMIN) {
      return;
    }

    if (actor.level === OfficeLevel.WOREDA) {
      if (roleToAssign !== RoleCode.WOREDA_OFFICER) {
        throw new ForbiddenException({
          code: 'OUTSIDE_ROLE_JURISDICTION',
          message: 'Woreda administrators can only manage Woreda officer roles.',
        });
      }
      if (!targetOffice || targetOffice.id !== actor.officeId) {
        throw new ForbiddenException({
          code: 'OUTSIDE_OFFICE_JURISDICTION',
          message: 'Woreda administrators can only manage roles for staff deployed in their own Woreda.',
        });
      }
      return;
    }

    if (actor.level === OfficeLevel.SUBCITY) {
      const allowedRoles: RoleCode[] = [RoleCode.WOREDA_OFFICER, RoleCode.WOREDA_ADMIN, RoleCode.SUBCITY_COORDINATOR];
      if (!allowedRoles.includes(roleToAssign)) {
        throw new ForbiddenException({
          code: 'OUTSIDE_ROLE_JURISDICTION',
          message: 'Sub-City coordinators cannot manage City Bureau or system administrative roles.',
        });
      }
      if (!targetOffice || (targetOffice.id !== actor.officeId && targetOffice.parentOfficeId !== actor.officeId)) {
        throw new ForbiddenException({
          code: 'OUTSIDE_OFFICE_JURISDICTION',
          message: 'Sub-City coordinators can only manage staff within their Sub-City and subordinate Woredas.',
        });
      }
      return;
    }

    throw new ForbiddenException({
      code: 'UNAUTHORIZED_JURISDICTION',
      message: 'You do not have jurisdiction to manage user roles.',
    });
  }
}

