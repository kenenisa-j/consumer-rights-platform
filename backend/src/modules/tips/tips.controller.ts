import { BadRequestException, Body, Controller, Get, HttpException, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomInt } from 'node:crypto';
import { formatReference } from '@consumer-rights/contracts';
import { PrismaService } from '../../lib/database/prisma.service';
import { Public } from '../../lib/common/decorators/public.decorator';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { officeScopeOf } from '../../lib/common/office-scope';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I/L)
const KINDS = ['Prices above the official list', 'Goods hidden or held back', 'Expired or unsafe goods on sale',
  'False scales or short weight', 'Misleading advertising', 'Something else'];
const STATUS_TEXT: Record<string, string> = {
  received: 'Received', under_review: 'Under review', follow_up_planned: 'Follow-up planned',
  converted_to_case: 'Became an official case', closed_action_taken: 'Closed, action taken', closed_no_action: 'Closed, no action needed',
};
const hashCode = (code: string) => createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// A small, memory-only brake on tips from one address. It keeps only a one-way hash and forgets it after an hour.
const hits = new Map<string, number[]>();
function brake(ip: string) {
  const key = createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < 3_600_000);
  if (recent.length >= 12) throw new HttpException({ code: 'RATE_LIMITED', message: 'Too many tips from this connection. Try again later.' }, 429);
  hits.set(key, [...recent, now]);
  if (hits.size > 5000) hits.clear();
}

@Controller()
export class TipsController {
  constructor(private readonly prisma: PrismaService) {}

  /** A tip needs no account. Anonymous tips store no name, phone, address or session: only what was seen. */
  @Public()
  @Post('tips')
  async send(@Req() req: Request, @Body() body: Record<string, unknown>) {
    brake(req.ip ?? 'unknown');
    const fields: Record<string, string> = {};
    const kind = str(body.kind, 80); if (!KINDS.includes(kind)) fields.kind = 'Choose what you saw.';
    const place = str(body.place, 160); if (place.length < 3) fields.place = 'Tell us where.';
    const text = str(body.text, 2000); if (text.length < 10) fields.text = 'Describe what you saw in a few words.';
    const seen = new Date(str(body.when, 10)); if (Number.isNaN(seen.getTime()) || seen.getTime() > Date.now() + 86_400_000) fields.when = 'Choose a date that is not in the future.';
    const anonymous = body.anonymous !== false;
    const contactName = anonymous ? null : str(body.name, 100) || null;
    const contactPhone = anonymous ? null : str(body.phone, 30) || null;
    if (!anonymous && (!contactName || !contactPhone)) fields.name = 'Write your name and phone, or stay anonymous.';
    if (Object.keys(fields).length) throw new BadRequestException({ code: 'VALIDATION', message: 'Some answers need fixing.', fields });

    const subcityCode = str(body.subcity, 60) || null;
    const woreda = Number(body.woreda);
    const woredaCode = Number.isInteger(woreda) && woreda > 0 ? String(woreda).padStart(2, '0') : null;
    const office = (woredaCode && subcityCode && await this.prisma.administrativeOffice.findFirst({ where: { level: 'WOREDA', subcityCode, woredaCode, isActive: true }, select: { id: true } }))
      || (subcityCode && await this.prisma.administrativeOffice.findFirst({ where: { level: 'SUBCITY', subcityCode, isActive: true }, select: { id: true } }))
      || await this.prisma.administrativeOffice.findFirst({ where: { level: 'CITY_BUREAU', isActive: true }, select: { id: true } });
    if (!office) throw new BadRequestException({ code: 'NO_OFFICE', message: 'No office could receive the tip.' });

    const code = `${Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}-${Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;
    const made = await this.prisma.$transaction(async tx => {
      const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(new Date()));
      const [{ last_val }] = await tx.$queryRaw<{ last_val: number }[]>`
        INSERT INTO annual_tip_sequences (year, last_val) VALUES (${year}, 1)
        ON CONFLICT (year) DO UPDATE SET last_val = annual_tip_sequences.last_val + 1 RETURNING last_val`;
      return tx.anonymousReport.create({
        data: {
          referenceNumber: formatReference('tip', year, last_val), trackingTokenHash: hashCode(code), category: kind,
          marketLocation: place, targetBusinessName: str(body.business, 120) || null, product: str(body.product, 120) || null,
          description: text, seenOn: seen, subcityCode, woredaCode, destinationOfficeId: office.id,
          contactName, contactPhone,
        },
        select: { referenceNumber: true, createdAt: true },
      });
    });
    return { reference: made.referenceNumber, code, receivedAt: made.createdAt.toISOString(), anonymous };
  }

  @Public()
  @Get('track/tip')
  async track(@Query('reference') reference = '', @Query('code') code = '') {
    const tip = /^TIP-\d{4}-\d{5}$/i.test(String(reference)) && String(code).length >= 8
      ? await this.prisma.anonymousReport.findFirst({
        where: { referenceNumber: String(reference).toUpperCase(), trackingTokenHash: hashCode(String(code).slice(0, 12)) },
        select: { referenceNumber: true, status: true, createdAt: true, destinationOffice: { select: { nameEn: true } } },
      }) : null;
    if (!tip) return { found: false as const };
    return { found: true as const, reference: tip.referenceNumber, status: tip.status, label: STATUS_TEXT[tip.status] ?? 'Received',
      receivedAt: tip.createdAt.toISOString(), reviewedBy: tip.destinationOffice.nameEn };
  }

  /** Tips sent to the officer's office (and the offices below it). Anonymous tips carry no identity at all. */
  @Get('office/tips')
  @RequirePermission('tips.read.office')
  async officeTips(@Req() req: Request & { user: { id: string } }) {
    const scope = await officeScopeOf(this.prisma, req.user.id);
    const rows = await this.prisma.anonymousReport.findMany({
      where: { destinationOfficeId: { in: scope.officeIds } }, orderBy: { createdAt: 'desc' }, take: 300,
      select: { referenceNumber: true, category: true, marketLocation: true, targetBusinessName: true, product: true, description: true,
        status: true, createdAt: true, subcityCode: true, woredaCode: true, contactName: true, contactPhone: true,
        destinationOffice: { select: { nameEn: true } } },
    });
    return rows.map(t => ({
      reference: t.referenceNumber, kind: t.category, place: t.marketLocation, business: t.targetBusinessName, product: t.product,
      text: t.description, status: t.status, receivedAt: t.createdAt.toISOString(), subcity: t.subcityCode, woreda: t.woredaCode,
      office: t.destinationOffice.nameEn, contact: t.contactName ? { name: t.contactName, phone: t.contactPhone } : null,
    }));
  }
}
