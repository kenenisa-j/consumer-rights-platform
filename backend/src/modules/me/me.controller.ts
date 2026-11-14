import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../lib/database/prisma.service';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

export interface MeResponse {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  preferredLanguage: string;
  /** Role codes in the contracts spelling, for example `woreda_officer`. */
  roles: string[];
  office: { id: string; code: string; nameEn: string; nameAm: string; level: 'bureau' | 'subcity' | 'woreda' } | null;
  business: { id: string; tradeName: string } | null;
}

const LEVEL = { CITY_BUREAU: 'bureau', SUBCITY: 'subcity', WOREDA: 'woreda' } as const;

/** Who am I: the signed-in person's own profile, role, office and business. Never returns another person's data. */
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('profile.read.own')
  async me(@Req() req: Request & { user: { id: string } }): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: {
        id: true, fullName: true, email: true, phoneNumber: true, preferredLanguage: true,
        roles: { select: { role: { select: { code: true } } } },
        offices: { where: { isActive: true }, take: 1, select: { office: { select: { id: true, code: true, nameEn: true, nameAm: true, level: true } } } },
        merchants: { take: 1, select: { merchant: { select: { id: true, tradeName: true } } } },
      },
    });
    const office = user.offices[0]?.office;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      preferredLanguage: user.preferredLanguage,
      roles: user.roles.map(r => r.role.code.toLowerCase()),
      office: office ? { ...office, level: LEVEL[office.level] } : null,
      business: user.merchants[0]?.merchant ?? null,
    };
  }
}
