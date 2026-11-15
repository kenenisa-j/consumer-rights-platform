import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { Public } from '../../lib/common/decorators/public.decorator';

/** Lists the forms need: categories, offices by Sub-City and Woreda, registered businesses. Public: no personal data. */
@Controller('reference')
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async all() {
    const [categories, offices] = await Promise.all([
      this.prisma.complaintCategory.findMany({
        where: { isActive: true }, orderBy: { code: 'asc' },
        select: { code: true, nameEn: true, nameAm: true, defaultSlaDays: true },
      }),
      this.prisma.administrativeOffice.findMany({
        where: { isActive: true }, orderBy: [{ subcityCode: 'asc' }, { woredaCode: 'asc' }],
        select: { id: true, code: true, level: true, nameEn: true, nameAm: true, subcityCode: true, woredaCode: true },
      }),
    ]);
    const bureau = offices.find(o => o.level === 'CITY_BUREAU') ?? null;
    const subcities = offices.filter(o => o.level === 'SUBCITY').map(s => ({
      code: s.subcityCode as string,
      name: s.nameEn.replace(/ Sub-City Trade Office$/, ''),
      nameAm: s.nameAm,
      officeId: s.id,
      woredas: offices.filter(w => w.level === 'WOREDA' && w.subcityCode === s.subcityCode)
        .map(w => ({ number: Number(w.woredaCode), officeId: w.id })),
    }));
    return { categories, subcities, bureau: bureau && { officeId: bureau.id, nameEn: bureau.nameEn, nameAm: bureau.nameAm } };
  }

  /** Registered businesses by trade name. Needs at least 2 letters; returns at most 8. */
  @Public()
  @Get('businesses')
  async businesses(@Query('q') q?: string) {
    const term = (q ?? '').trim().slice(0, 60);
    const rows = await this.prisma.merchant.findMany({
      where: { isActive: true, ...(term.length >= 2 ? { tradeName: { contains: term, mode: 'insensitive' } } : {}) },
      orderBy: { tradeName: 'asc' }, take: term.length >= 2 ? 8 : 4,
      select: { id: true, tradeName: true, businessType: true, businessCategory: true, stallNumber: true,
        market: { select: { nameEn: true } }, woredaOffice: { select: { nameEn: true, subcityCode: true, woredaCode: true } } },
    });
    return rows.map(m => ({
      id: m.id, name: m.tradeName, kind: m.businessType,
      place: [m.market?.nameEn, m.woredaOffice.nameEn].filter(Boolean).join(' · '),
    }));
  }
}
