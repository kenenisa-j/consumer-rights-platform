import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { officeScopeOf } from '../../lib/common/office-scope';
import { notify, officeStaffIds } from '../../lib/common/notify';

type Level = 'CITY_BUREAU' | 'SUBCITY' | 'WOREDA';
const RANK: Record<Level, number> = { WOREDA: 1, SUBCITY: 2, CITY_BUREAU: 3 };
const OFFICE_LEVEL = { bureau: 'CITY_BUREAU', subcity: 'SUBCITY', woreda: 'WOREDA' } as const;

/**
 * An office hands a complaint to another office: down to a Sub-City or Woreda that should resolve it on the ground, or up to the
 * Sub-City or the City Bureau. Who may send where is decided here from the officer's own office, never from the request:
 *  - City Bureau: any Sub-City or any Woreda.
 *  - Sub-City: the City Bureau, or a Woreda inside its own Sub-City.
 *  - Woreda: the City Bureau, or its own Sub-City.
 * Every redirect keeps a handover note, a transfer row, a history entry, an audit row and a notice to the consumer, in one transaction.
 */
@Injectable()
export class RedirectService {
  constructor(private readonly prisma: PrismaService) {}

  private async me(userId: string) {
    const scope = await officeScopeOf(this.prisma, userId);
    const office = await this.prisma.administrativeOffice.findUniqueOrThrow({ where: { id: scope.officeId }, select: { id: true, level: true, subcityCode: true, nameEn: true } });
    return { scope, office };
  }

  /** The places this officer may send a case to, for the form's dropdowns. */
  async options(userId: string) {
    const { office } = await this.me(userId);
    const offices = await this.prisma.administrativeOffice.findMany({
      where: { isActive: true, level: { in: ['SUBCITY', 'WOREDA', 'CITY_BUREAU'] }, ...(office.level === 'SUBCITY' ? { OR: [{ level: 'CITY_BUREAU' }, { level: 'WOREDA', subcityCode: office.subcityCode }] } : {}),
        ...(office.level === 'WOREDA' ? { OR: [{ level: 'CITY_BUREAU' }, { level: 'SUBCITY', subcityCode: office.subcityCode }] } : {}) },
      orderBy: [{ subcityCode: 'asc' }, { woredaCode: 'asc' }],
      select: { id: true, level: true, nameEn: true, subcityCode: true, woredaCode: true },
    });
    const subs = offices.filter(o => o.level === 'SUBCITY');
    const woredas = offices.filter(o => o.level === 'WOREDA');
    const bureau = offices.find(o => o.level === 'CITY_BUREAU');
    const subcityList = (office.level === 'SUBCITY' ? [] : subs).map(s => ({ code: s.subcityCode as string, name: s.nameEn.replace(/ Sub-City Trade Office$/, '') }));
    // For a Woreda target the Sub-City list is the Sub-Cities that have Woredas this officer may use.
    const woredaSubs = office.level === 'WOREDA' ? [] : [...new Set(woredas.map(w => w.subcityCode as string))].map(code => ({
      code, name: (subs.find(s => s.subcityCode === code)?.nameEn ?? '').replace(/ Sub-City Trade Office$/, '') || code,
      woredas: woredas.filter(w => w.subcityCode === code).map(w => Number(w.woredaCode)),
    }));
    return {
      level: office.level === 'CITY_BUREAU' ? 'bureau' : office.level === 'SUBCITY' ? 'subcity' : 'woreda',
      bureau: !!bureau && office.level !== 'CITY_BUREAU',
      subcity: office.level !== 'SUBCITY',
      woreda: office.level !== 'WOREDA',
      subcities: subcityList,
      woredaSubcities: woredaSubs,
    };
  }

  async redirect(userId: string, reference: string, body: Record<string, unknown>) {
    const level = String(body.level ?? '') as keyof typeof OFFICE_LEVEL;
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!(level in OFFICE_LEVEL)) throw new BadRequestException({ code: 'VALIDATION', message: 'Choose where to send it.', fields: { level: 'Choose City Bureau, Sub-City or Woreda.' } });
    if (note.length < 10 || note.length > 1000) throw new BadRequestException({ code: 'VALIDATION', message: 'Write a handover note of 10 to 1000 characters.', fields: { note: 'Tell the next office why it is being sent.' } });
    const subcityCode = typeof body.subcityCode === 'string' ? body.subcityCode : null;
    const woredaCode = body.woreda === null || body.woreda === undefined || body.woreda === '' ? null : String(Number(body.woreda)).padStart(2, '0');
    if ((level === 'subcity' || level === 'woreda') && !subcityCode) throw new BadRequestException({ code: 'VALIDATION', message: 'Choose the Sub-City.', fields: { subcityCode: 'Choose the Sub-City.' } });
    if (level === 'woreda' && (!woredaCode || woredaCode === 'NaN')) throw new BadRequestException({ code: 'VALIDATION', message: 'Choose the Woreda.', fields: { woreda: 'Choose the Woreda.' } });

    const { scope, office: mine } = await this.me(userId);
    const c = await this.prisma.case.findFirst({
      where: { referenceNumber: reference.toUpperCase(), currentOfficeId: { in: scope.officeIds } },
      select: { id: true, status: true, route: true, currentOfficeId: true, complainantId: true, escalatedToGovAt: true, currentOffice: { select: { id: true, level: true, nameEn: true } } },
    });
    if (!c || !c.currentOffice) throw new NotFoundException({ code: 'NOT_FOUND', message: 'That case is not held by your office.' });
    if (['RESOLVED_MUTUALLY', 'RESOLVED_ADMINISTRATIVE_ORDER', 'COURT_REFERRAL_ISSUED', 'CLOSED_OUTSIDE_JURISDICTION', 'CLOSED_WITHDRAWN'].includes(c.status)) {
      throw new BadRequestException({ code: 'CLOSED', message: 'A closed complaint cannot be sent to another office.' });
    }

    const target = await this.prisma.administrativeOffice.findFirst({
      where: { isActive: true, level: OFFICE_LEVEL[level], ...(level !== 'bureau' ? { subcityCode } : {}), ...(level === 'woreda' ? { woredaCode } : {}) },
      select: { id: true, level: true, nameEn: true, subcityCode: true },
    });
    if (!target) throw new BadRequestException({ code: 'NO_OFFICE', message: 'We could not find that office.' });
    if (target.id === c.currentOffice.id) throw new BadRequestException({ code: 'VALIDATION', message: 'The complaint is already with that office.' });

    // The rules of who may send where (see the class comment).
    const allowed = mine.level === 'CITY_BUREAU'
      || (mine.level === 'SUBCITY' && (target.level === 'CITY_BUREAU' || (target.level === 'WOREDA' && target.subcityCode === mine.subcityCode)))
      || (mine.level === 'WOREDA' && (target.level === 'CITY_BUREAU' || (target.level === 'SUBCITY' && target.subcityCode === mine.subcityCode)));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Your office cannot send a complaint to that office.' });

    const direction = RANK[target.level as Level] > RANK[c.currentOffice.level as Level] ? 'UPWARD_ESCALATION'
      : RANK[target.level as Level] < RANK[c.currentOffice.level as Level] ? 'DOWNWARD_DISPATCH' : 'LATERAL_REASSIGNMENT';
    const handling = target.level === 'CITY_BUREAU' ? 'bureau' : target.level === 'SUBCITY' ? 'subcity' : 'woreda';

    await this.prisma.$transaction(async tx => {
      await tx.caseTransfer.create({
        data: { caseId: c.id, fromOfficeId: c.currentOffice!.id, toOfficeId: target.id, direction, status: 'ACCEPTED', handoverNote: note,
          initiatedByUserId: userId, respondedByUserId: userId, responseNotes: 'Sent directly by the office', respondedAt: new Date() },
      });
      await tx.caseAssignment.updateMany({ where: { caseId: c.id, isActive: true }, data: { isActive: false, unassignedAt: new Date() } });
      await tx.case.update({
        where: { id: c.id },
        // A business complaint that reaches an office for the first time is marked as moved to government (a database rule needs both).
        data: { currentOfficeId: target.id, status: 'RECEIVED_BY_OFFICE', ...(c.route === 'REGISTERED_BUSINESS' && !c.escalatedToGovAt ? { escalatedToGovAt: new Date() } : {}) },
      });
      await tx.caseHistory.create({ data: { caseId: c.id, fromStatus: c.status, toStatus: 'RECEIVED_BY_OFFICE', handlingLevel: handling, officeId: target.id, actorUserId: userId,
        publicNote: `Your complaint was passed to ${target.nameEn}.` } });
      await tx.caseAuditLog.create({ data: { caseId: c.id, actorId: userId, actionCode: 'CASE_REDIRECTED', fieldName: 'currentOfficeId', oldValue: c.currentOffice!.nameEn, newValue: target.nameEn } });
      await tx.notification.create({ data: { recipientUserId: c.complainantId, caseId: c.id, type: 'CASE_REDIRECTED', title: 'Your complaint moved to another office',
        messageBody: `Your complaint was passed to ${target.nameEn}. You can keep writing to them in Messages.` } });
      await notify(tx, await officeStaffIds(tx, target.id), { caseId: c.id, type: 'NEW_CASE_FOR_OFFICE', title: `A case was sent to your office: ${reference.toUpperCase()}`, body: `From ${c.currentOffice!.nameEn}. Read the handover note on the case page.` });
    });
    return { reference: reference.toUpperCase(), handledBy: target.nameEn, level: handling, direction };
  }
}
