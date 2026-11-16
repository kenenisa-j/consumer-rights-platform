import { randomInt, createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { OfficeLevel, RoleCode } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { OfficerContext } from '../cases/government-cases.helpers';

/** Unambiguous character set: excludes 0, 1, I, L, O to avoid reading errors. Matches [2-9A-HJ-KM-NP-Z]. */
const TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Generates a cryptographically random, uniform 8-character follow-up token in XXXX-XXXX format. */
export function generateFollowUpToken(): string {
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) p1 += TOKEN_ALPHABET[randomInt(0, TOKEN_ALPHABET.length)];
  for (let i = 4; i < 8; i++) p2 += TOKEN_ALPHABET[randomInt(0, TOKEN_ALPHABET.length)];
  return `${p1}-${p2}`;
}

/** Hashes a follow-up token with SHA-256 after normalization (uppercase, stripped dashes/spaces). */
export function hashFollowUpToken(token: string): string {
  const normalized = token.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(normalized).digest('hex');
}

/** Verifies a raw token against the stored hash. */
export function verifyFollowUpToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  return hashFollowUpToken(token) === storedHash;
}

/** Generates the next atomic reference in TIP-YYYY-NNNNN format. */
export async function generateTipReference(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.anonymousReport.count();
  const seq = count + 1;
  return `TIP-${year}-${String(seq).padStart(5, '0')}`;
}

/** Resolves the destination government office based on subcity and optional woreda. */
export async function resolveTipOffice(
  prisma: PrismaService,
  subcity: string,
  woreda?: string,
) {
  const cleanSub = subcity.trim();
  const subCode = cleanSub.toUpperCase().replace(/\s+/g, '-');

  if (woreda && woreda.trim()) {
    const rawWo = woreda.trim();
    const woNum = parseInt(rawWo, 10);
    const woCode = !isNaN(woNum) ? String(woNum).padStart(2, '0') : rawWo;

    const woredaOffice = await prisma.administrativeOffice.findFirst({
      where: {
        level: OfficeLevel.WOREDA,
        isActive: true,
        OR: [
          { woredaCode: woCode, subcityCode: subCode },
          { woredaCode: rawWo, subcityCode: subCode },
          { nameEn: { contains: `Woreda ${rawWo}`, mode: 'insensitive' } },
        ],
      },
    });
    if (woredaOffice) return woredaOffice;
  }

  const subcityOffice = await prisma.administrativeOffice.findFirst({
    where: {
      level: OfficeLevel.SUBCITY,
      isActive: true,
      OR: [
        { subcityCode: subCode },
        { nameEn: { contains: cleanSub, mode: 'insensitive' } },
      ],
    },
  });
  if (subcityOffice) return subcityOffice;

  const bureauOffice = await prisma.administrativeOffice.findFirst({
    where: { level: OfficeLevel.CITY_BUREAU, isActive: true },
  });
  if (bureauOffice) return bureauOffice;

  const fallback = await prisma.administrativeOffice.findFirst({ where: { isActive: true } });
  if (!fallback) throw new NotFoundException({ code: 'OFFICE_NOT_FOUND', message: 'No active government office found.' });
  return fallback;
}

/** Enforces that an officer can only view/act on tips within their jurisdiction; fails closed with 404 to prevent existence probing. */
export function assertOfficerTipJurisdiction(
  actor: OfficerContext,
  office: { id: string; subcityCode?: string | null } | null,
): void {
  if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
    return;
  }

  if (!office) {
    throw new NotFoundException({ code: 'TIP_NOT_FOUND', message: 'Tip not found in your jurisdiction.' });
  }

  if (actor.level === OfficeLevel.SUBCITY) {
    if (office.subcityCode && office.subcityCode === actor.subcityCode) return;
    throw new NotFoundException({
      code: 'TIP_NOT_FOUND',
      message: 'Tip not found within your Sub-City jurisdiction.',
    });
  }

  if (actor.level === OfficeLevel.WOREDA) {
    if (office.id === actor.officeId) return;
    throw new NotFoundException({
      code: 'TIP_NOT_FOUND',
      message: 'Tip not found within your Woreda jurisdiction.',
    });
  }

  throw new NotFoundException({
    code: 'TIP_NOT_FOUND',
    message: 'Tip not found within your administrative jurisdiction.',
  });
}

/** Builds Prisma where-clause for listing government tips based on officer role and jurisdiction. */
export function buildOfficerTipWhere(actor: OfficerContext, query?: any): any {
  const where: any = {};
  if (actor.govRole === RoleCode.SYSTEM_SUPERADMIN || actor.level === OfficeLevel.CITY_BUREAU) {
    if (query?.officeId) where.destinationOfficeId = query.officeId;
    if (query?.subcityCode) where.destinationOffice = { subcityCode: query.subcityCode };
  } else if (actor.level === OfficeLevel.SUBCITY) {
    where.destinationOffice = { subcityCode: actor.subcityCode };
    if (query?.officeId) where.destinationOfficeId = query.officeId;
  } else if (actor.level === OfficeLevel.WOREDA) {
    where.destinationOfficeId = actor.officeId || undefined;
  }
  if (query?.status) where.status = query.status;
  return where;
}

/** Formats a single government tip summary row for the officer table view. */
export function formatGovTipSummary(r: any) {
  return {
    reference: r.id,
    title: `${r.category} at ${r.marketLocation}`,
    where: r.marketLocation,
    seen: r.createdAt.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    category: r.category,
    status: r.status,
    holder: r.destinationOffice?.nameEn || 'Government Office',
    closed: r.status === 'closed_action_taken' || r.status === 'closed_no_action',
    caseRef: r.convertedCase?.referenceNumber || undefined,
  };
}

/** Resolves an appropriate active complaint category for converting an anonymous tip. */
export async function resolveTipCategory(prisma: PrismaService, categoryId?: string, tipCategory = '') {
  if (categoryId) {
    const found = await prisma.complaintCategory.findFirst({
      where: { OR: [{ id: categoryId }, { code: categoryId }] },
    });
    if (found) return found;
  }

  const category = await prisma.complaintCategory.findFirst({
    where: {
      OR: [
        { code: tipCategory.toUpperCase().replace(/\s+/g, '_') },
        { nameEn: { contains: tipCategory, mode: 'insensitive' } },
        { isActive: true },
      ],
    },
  });
  if (!category) {
    throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'No valid complaint category found.' });
  }
  return category;
}

/** Public tracking view: strictly excludes officer notes, officer identities, and reporter details. */
export function formatPublicTipTracking(report: any) {
  const isClosed = report.status === 'closed_action_taken' || report.status === 'closed_no_action';
  return {
    reference: report.id,
    status: report.status,
    label: formatTipStatusLabel(report.status),
    category: report.category,
    where: report.marketLocation,
    received: report.createdAt.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    reviewedBy: report.destinationOffice?.nameEn || 'Addis Ababa Trade and Market Bureau',
    meaning: formatTipStatusMeaning(report.status),
    convertedCaseReference: report.convertedCase?.referenceNumber || null,
    isClosed,
  };
}

function formatTipStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Received',
    under_review: 'Under review',
    follow_up_planned: 'Follow-up planned',
    converted_to_case: 'Converted to official case',
    closed_action_taken: 'Closed, action taken',
    closed_no_action: 'Closed, no action',
  };
  return labels[status] || 'Under review';
}

function formatTipStatusMeaning(status: string): string {
  const meanings: Record<string, string> = {
    received: 'Your tip has been received and queued for review.',
    under_review: 'An officer is reading the tip and determining appropriate enforcement action.',
    follow_up_planned: 'An on-site inspection or visit has been scheduled by the holding trade office.',
    converted_to_case: 'The tip was substantiated and converted into a formal consumer rights investigation.',
    closed_action_taken: 'The trade office concluded inspection and executed corrective enforcement action.',
    closed_no_action: 'The trade office reviewed the tip and determined no further action was warranted.',
  };
  return meanings[status] || 'An officer is reviewing the report.';
}

/** Government officer view of a tip: includes history and office details, zero reporter identity. */
export function formatGovTip(report: any, level: string) {
  const isClosed = report.status === 'closed_action_taken' || report.status === 'closed_no_action';
  const holder = report.destinationOffice?.nameEn || 'Government Office';
  const history = (report.auditLogs || []).map((l: any) => ({
    title: l.actionCode.replace(/_/g, ' ').toLowerCase(),
    when: l.timestamp.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    iso: l.timestamp.toISOString(),
    text: l.internalNotes || undefined,
  }));

  history.push({
    title: 'Received',
    when: report.createdAt.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    iso: report.createdAt.toISOString(),
    text: undefined,
  });

  return {
    reference: report.id,
    title: `${report.category} at ${report.marketLocation}`,
    where: report.marketLocation,
    seen: report.createdAt.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    what: report.description,
    source: 'Anonymous citizen',
    status: formatTipStatusLabel(report.status),
    holder,
    closed: isClosed,
    caseRef: report.convertedCase?.referenceNumber || undefined,
    history,
  };
}
