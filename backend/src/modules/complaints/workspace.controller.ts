import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../lib/database/prisma.service';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { officeScopeOf } from '../../lib/common/office-scope';
import { summarize } from './complaints.service';

type Authed = Request & { user: { id: string } };
const LEVEL = { CITY_BUREAU: 'bureau', SUBCITY: 'subcity', WOREDA: 'woreda' } as const;

const listSelect = {
  referenceNumber: true, subject: true, status: true, createdAt: true, updatedAt: true, urgent: true, route: true, slaDeadline: true, complainantAlias: true,
  category: { select: { code: true, nameEn: true, nameAm: true } },
  merchant: { select: { tradeName: true } }, unregisteredMerchantName: true,
  currentOffice: { select: { nameEn: true, nameAm: true, level: true } },
} as const;

/** What an office or a business sees. Scope comes from the signed-in person's own deployment, never from the request. */
@Controller()
export class WorkspaceController {
  constructor(private readonly prisma: PrismaService) {}

  /** Cases held by the officer's office (and, for a Sub-City or the Bureau, the offices below it). Officers see the complainant. */
  @Get('office/cases')
  @RequirePermission('cases.read.office')
  async officeCases(@Req() req: Authed) {
    const scope = await officeScopeOf(this.prisma, req.user.id);
    const rows = await this.prisma.case.findMany({
      where: { currentOfficeId: { in: scope.officeIds } }, orderBy: { updatedAt: 'desc' }, take: 300,
      select: { ...listSelect, complainant: { select: { fullName: true } } },
    });
    const office = await this.prisma.administrativeOffice.findUniqueOrThrow({ where: { id: scope.officeId }, select: { nameEn: true, nameAm: true } });
    return { level: LEVEL[scope.level], office: { name: office.nameEn, nameAm: office.nameAm }, cases: rows.map(r => ({ ...summarize(r as never), complainant: r.complainant.fullName, alias: r.complainantAlias })) };
  }

  @Get('office/cases/:reference')
  @RequirePermission('cases.read.office')
  async officeCase(@Req() req: Authed, @Param('reference') reference: string) {
    const scope = await officeScopeOf(this.prisma, req.user.id);
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference.toUpperCase(), currentOfficeId: { in: scope.officeIds } },
      select: {
        ...listSelect, narrative: true, itemDescription: true, incidentDate: true, disputedAmount: true, desiredRemedy: true,
        receiptAvailable: true, slaDeadline: true, contactPhone: true,
        evidenceFiles: { orderBy: { createdAt: 'asc' as const }, select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, isOfficerOnly: true } },
        complainant: { select: { fullName: true, phoneNumber: true } },
        history: { orderBy: { createdAt: 'desc' }, select: { toStatus: true, publicNote: true, createdAt: true, handlingLevel: true } },
      },
    });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'That case is not held by your office.' });
    return {
      ...summarize(c as never), alias: c.complainantAlias, complainant: c.complainant.fullName, phone: c.contactPhone ?? c.complainant.phoneNumber,
      narrative: c.narrative, item: c.itemDescription, boughtOn: c.incidentDate.toISOString().slice(0, 10), amount: Number(c.disputedAmount),
      want: c.desiredRemedy, receipt: c.receiptAvailable, dueBy: c.slaDeadline?.toISOString() ?? null,
      evidence: c.evidenceFiles.map(e => ({ id: e.id, name: e.fileName, type: e.fileType, size: e.fileSizeBytes, shared: !e.isOfficerOnly })),
      history: c.history.map(h => ({ status: h.toStatus, note: h.publicNote, at: h.createdAt.toISOString(), level: h.handlingLevel })),
    };
  }

  /** The business's own profile: registration, place and the people who work on its desk. */
  @Get('business/profile')
  @RequirePermission('business.read.own')
  async profile(@Req() req: Authed) {
    const link = await this.prisma.merchantUser.findFirst({
      where: { userId: req.user.id },
      select: { roleInBusiness: true, merchant: { select: { tradeName: true, legalName: true, registrationNumber: true, businessType: true, businessCategory: true,
        phoneNumber: true, stallNumber: true, verificationStatus: true, market: { select: { nameEn: true } }, woredaOffice: { select: { nameEn: true, phone: true } },
        staff: { select: { roleInBusiness: true, isPrimaryContact: true, user: { select: { fullName: true, email: true } } } } } } },
    });
    if (!link) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Your account is not linked to a business.' });
    const m = link.merchant;
    return { ...m, market: m.market?.nameEn ?? null, woredaOffice: m.woredaOffice, myRole: link.roleInBusiness,
      staff: m.staff.map(s => ({ name: s.user.fullName, email: s.user.email, role: s.roleInBusiness, primary: s.isPrimaryContact })) };
  }

  /** A business sees only the pseudonym "Consumer 00123": never a name, phone or address. */
  @Get('business/cases')
  @RequirePermission('cases.read.business')
  async businessCases(@Req() req: Authed) {
    const mine = await this.prisma.merchantUser.findMany({ where: { userId: req.user.id }, select: { merchantId: true } });
    const rows = await this.prisma.case.findMany({
      where: { merchantId: { in: mine.map(m => m.merchantId) } }, orderBy: { updatedAt: 'desc' }, take: 300,
      select: { ...listSelect, narrative: true, itemDescription: true, disputedAmount: true, desiredRemedy: true },
    });
    return rows.map(r => ({
      ...summarize(r as never), consumer: r.complainantAlias, narrative: r.narrative, item: r.itemDescription,
      amount: Number(r.disputedAmount), want: r.desiredRemedy,
    }));
  }

  @Get('business/cases/:reference')
  @RequirePermission('cases.read.business')
  async businessCase(@Req() req: Authed, @Param('reference') reference: string) {
    const mine = await this.prisma.merchantUser.findMany({ where: { userId: req.user.id }, select: { merchantId: true } });
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference.toUpperCase(), merchantId: { in: mine.map(m => m.merchantId) } },
      select: { ...listSelect, narrative: true, itemDescription: true, incidentDate: true, disputedAmount: true, desiredRemedy: true,
        evidenceFiles: { where: { isOfficerOnly: false }, orderBy: { createdAt: 'asc' as const }, select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, isOfficerOnly: true } },
        history: { orderBy: { createdAt: 'desc' }, select: { toStatus: true, publicNote: true, createdAt: true } } },
    });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'We could not find that complaint for your business.' });
    return {
      ...summarize(c as never), consumer: c.complainantAlias, narrative: c.narrative, item: c.itemDescription,
      boughtOn: c.incidentDate.toISOString().slice(0, 10), amount: Number(c.disputedAmount), want: c.desiredRemedy,
      evidence: c.evidenceFiles.map(e => ({ id: e.id, name: e.fileName, type: e.fileType, size: e.fileSizeBytes, shared: true })),
      history: c.history.map(h => ({ status: h.toStatus, note: h.publicNote, at: h.createdAt.toISOString() })),
    };
  }
}
