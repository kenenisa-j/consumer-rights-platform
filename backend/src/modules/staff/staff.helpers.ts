import {
  OfficeLevel,
  RoleCode,
} from '@prisma/client';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';

export const ROLE_LEVEL_COMPATIBILITY: Record<string, OfficeLevel[]> = {
  [RoleCode.WOREDA_OFFICER]: [OfficeLevel.WOREDA],
  [RoleCode.WOREDA_ADMIN]: [OfficeLevel.WOREDA],
  [RoleCode.SUBCITY_COORDINATOR]: [OfficeLevel.SUBCITY],
  [RoleCode.BUREAU_OFFICER]: [OfficeLevel.CITY_BUREAU],
  [RoleCode.BUREAU_ADMIN]: [OfficeLevel.CITY_BUREAU],
  [RoleCode.CONTENT_ADMIN]: [OfficeLevel.CITY_BUREAU],
  [RoleCode.SYSTEM_SUPERADMIN]: [OfficeLevel.CITY_BUREAU, OfficeLevel.SUBCITY, OfficeLevel.WOREDA],
};

export const ROLE_RANK: Record<RoleCode, number> = {
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

export interface StaffActorContext {
  userId: string;
  highestRole: RoleCode;
  officeId: string | null;
  level: OfficeLevel | null;
  subcityCode: string | null;
}

export function getHighestRole(roles: RoleCode[]): RoleCode {
  return roles.reduce((highest, current) => {
    return (ROLE_RANK[current] || 0) > (ROLE_RANK[highest] || 0) ? current : highest;
  }, RoleCode.CONSUMER);
}

export function assertCanManageRole(actor: { highestRole: RoleCode }, targetRole: RoleCode): void {
  if ((ROLE_RANK[actor.highestRole] || 0) <= (ROLE_RANK[targetRole] || 0)) {
    throw new ForbiddenException({
      code: 'PRIVILEGE_ESCALATION_PROHIBITED',
      message: 'Cannot create or grant a role equal to or higher than your own authorization rank.',
    });
  }
}

export function assertOfficeLevelCompatibility(roleCodes: RoleCode[], officeLevel: OfficeLevel): void {
  const isGovStaff = roleCodes.some((code) => ROLE_LEVEL_COMPATIBILITY[code]);
  if (!isGovStaff) {
    throw new BadRequestException({
      code: 'USER_NOT_GOVERNMENT_STAFF',
      message: 'User does not possess a valid government staff role.',
    });
  }

  const isCompatible = roleCodes.some((code) => {
    const allowedLevels = ROLE_LEVEL_COMPATIBILITY[code] || [];
    return allowedLevels.includes(officeLevel);
  });

  if (!isCompatible) {
    throw new BadRequestException({
      code: 'ROLE_OFFICE_LEVEL_INCOMPATIBLE',
      message: `Staff role is incompatible with office level ${officeLevel}.`,
    });
  }
}

export function assertStaffJurisdiction(
  actor: { highestRole: RoleCode; officeId: string | null; level: OfficeLevel | null },
  targetOffice: { id: string; level: OfficeLevel; parentOfficeId?: string | null },
): void {
  if (actor.highestRole === RoleCode.SYSTEM_SUPERADMIN || actor.highestRole === RoleCode.BUREAU_ADMIN) {
    return; // Full city-wide jurisdiction
  }

  if (actor.level === OfficeLevel.SUBCITY) {
    if (targetOffice.id === actor.officeId || targetOffice.parentOfficeId === actor.officeId) {
      return; // Sub-City manages itself and its subordinate Woredas
    }
    throw new ForbiddenException({
      code: 'OUTSIDE_JURISDICTION',
      message: 'Sub-City administrators can only manage staff within their Sub-City and subordinate Woredas.',
    });
  }

  if (actor.level === OfficeLevel.WOREDA) {
    if (targetOffice.id === actor.officeId) {
      return; // Woreda manages only its own office
    }
    throw new ForbiddenException({
      code: 'OUTSIDE_JURISDICTION',
      message: 'Woreda administrators can only manage staff within their specific Woreda office.',
    });
  }

  throw new ForbiddenException({
    code: 'UNAUTHORIZED_ADMIN_LEVEL',
    message: 'User does not possess administrative staff management jurisdiction.',
  });
}

export async function resolveStaffActorContext(
  prisma: PrismaService,
  actorUserId: string,
): Promise<StaffActorContext> {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: {
      roles: { include: { role: true } },
      offices: { where: { isActive: true }, include: { office: true }, take: 1 },
    },
  });

  if (!actor) throw new ForbiddenException({ code: 'ACTOR_NOT_FOUND', message: 'Authenticated user not found.' });
  const highestRole = getHighestRole(actor.roles.map((r: any) => r.role.code as RoleCode));
  const activeOffice = actor.offices[0]?.office || null;

  return {
    userId: actor.id,
    highestRole,
    officeId: activeOffice?.id || null,
    level: activeOffice?.level || null,
    subcityCode: activeOffice?.subcityCode || null,
  };
}

export async function validateStaffUserAndOffice(
  prisma: PrismaService,
  userId: string,
  officeId: string,
) {
  const office = await prisma.administrativeOffice.findUnique({ where: { id: officeId } });
  if (!office) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'Office not found.' });
  if (!office.isActive) throw new BadRequestException({ code: 'OFFICE_INACTIVE', message: 'Office is inactive.' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
  if (user.status !== 'ACTIVE') throw new BadRequestException({ code: 'USER_INACTIVE', message: 'User is inactive.' });

  assertOfficeLevelCompatibility(user.roles.map((r: any) => r.role.code), office.level);
  return { user, office };
}
