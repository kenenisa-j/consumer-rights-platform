import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';

export interface OfficeScope { officeId: string; level: 'CITY_BUREAU' | 'SUBCITY' | 'WOREDA'; officeIds: string[] }

/**
 * The offices a staff member may look at, worked out on the server from their own deployment (never from the request).
 * A Woreda sees its own office. A Sub-City sees itself and its Woredas. The City Bureau sees every office.
 */
export async function officeScopeOf(prisma: PrismaService, userId: string): Promise<OfficeScope> {
  const deployment = await prisma.userOffice.findFirst({
    where: { userId, isActive: true }, select: { office: { select: { id: true, level: true } } },
  });
  if (!deployment) throw new ForbiddenException({ code: 'NO_OFFICE', message: 'Your account is not assigned to an office.' });
  const { id, level } = deployment.office;
  if (level === 'WOREDA') return { officeId: id, level, officeIds: [id] };
  const children = await prisma.administrativeOffice.findMany({
    where: level === 'SUBCITY' ? { parentOfficeId: id } : {}, select: { id: true },
  });
  return { officeId: id, level, officeIds: [...new Set([id, ...children.map(c => c.id)])] };
}
