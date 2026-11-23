import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { officeScopeOf, type OfficeScope } from '../../lib/common/office-scope';
import { businessUserIds, notify, officeStaffIds } from '../../lib/common/notify';

const CLOSED = new Set(['RESOLVED_MUTUALLY', 'RESOLVED_ADMINISTRATIVE_ORDER', 'COURT_REFERRAL_ISSUED', 'CLOSED_OUTSIDE_JURISDICTION', 'CLOSED_WITHDRAWN']);
const AT_BUSINESS = new Set(['SUBMITTED_TO_BUSINESS', 'BUSINESS_OFFER_PENDING']);
export const MAX_VOICE_BYTES = 1_500_000;
export const MAX_VOICE_MS = 180_000;

/** Who is asking, worked out from the database (never from the request). It decides which conversations they may open. */
type Viewer =
  | { kind: 'consumer'; userId: string }
  | { kind: 'business'; userId: string; merchantIds: string[] }
  | { kind: 'staff'; userId: string; scope: OfficeScope };

const convSelect = {
  id: true, kind: true, createdAt: true,
  case: { select: {
    id: true, referenceNumber: true, subject: true, status: true, complainantAlias: true, merchantId: true, currentOfficeId: true, complainantId: true,
    merchant: { select: { tradeName: true } }, currentOffice: { select: { nameEn: true } }, complainant: { select: { fullName: true } },
  } },
  messages: { orderBy: { sentAt: 'desc' as const }, take: 1, select: { kind: true, content: true, sentAt: true, senderUserId: true } },
} satisfies Prisma.ConversationSelect;

type Conv = Prisma.ConversationGetPayload<{ select: typeof convSelect }>;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async viewer(userId: string): Promise<Viewer> {
    const deployed = await this.prisma.userOffice.findFirst({ where: { userId, isActive: true }, select: { id: true } });
    if (deployed) return { kind: 'staff', userId, scope: await officeScopeOf(this.prisma, userId) };
    const mine = await this.prisma.merchantUser.findMany({ where: { userId }, select: { merchantId: true } });
    if (mine.length) return { kind: 'business', userId, merchantIds: mine.map(m => m.merchantId) };
    return { kind: 'consumer', userId };
  }

  private where(v: Viewer): Prisma.ConversationWhereInput {
    if (v.kind === 'consumer') return { case: { complainantId: v.userId } };
    if (v.kind === 'business') return { kind: 'CONSUMER_BUSINESS', case: { merchantId: { in: v.merchantIds } } };
    return { kind: 'CONSUMER_GOVERNMENT', case: { currentOfficeId: { in: v.scope.officeIds } } };
  }

  private canWrite(v: Viewer, c: Conv): boolean {
    const s = c.case.status;
    if (CLOSED.has(s)) return false;
    if (v.kind === 'consumer') return true;
    if (c.kind === 'CONSUMER_BUSINESS') return v.kind === 'business' && AT_BUSINESS.has(s);
    return v.kind === 'staff' && !!c.case.currentOfficeId && v.scope.officeIds.includes(c.case.currentOfficeId);
  }

  /** The name of the person on the other side, as this viewer may know it. A business only ever knows "Consumer 00123". */
  private counterpart(v: Viewer, c: Conv): string {
    if (v.kind === 'business') return c.case.complainantAlias;
    if (v.kind === 'staff') return c.case.complainant.fullName;
    return c.kind === 'CONSUMER_BUSINESS' ? (c.case.merchant?.tradeName ?? 'The business') : (c.case.currentOffice?.nameEn ?? 'The office');
  }

  /** Every complaint has one conversation: with the business (Route B) or with the office (Route A). Missing ones are made here. */
  async ensureConversations(): Promise<void> {
    const missing = await this.prisma.case.findMany({ where: { conversations: { none: {} } }, take: 200, select: { id: true, route: true, complainantId: true } });
    for (const c of missing) {
      await this.prisma.conversation.create({
        data: { caseId: c.id, kind: c.route === 'REGISTERED_BUSINESS' ? 'CONSUMER_BUSINESS' : 'CONSUMER_GOVERNMENT',
          participants: { create: { userId: c.complainantId, role: 'CONSUMER' } } },
      }).catch(() => undefined); // another request made it first
    }
  }

  /** How many messages from other people each conversation holds since this person last opened it. */
  private async unreadBy(userId: string, ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; n: number }[]>`
      SELECT m.conversation_id AS id, COUNT(*)::int AS n FROM messages m
      LEFT JOIN conversation_reads r ON r.conversation_id = m.conversation_id AND r.user_id = ${userId}
      WHERE m.conversation_id = ANY(${ids}) AND m.sender_user_id <> ${userId} AND (r.read_at IS NULL OR m.sent_at > r.read_at)
      GROUP BY m.conversation_id`;
    return new Map(rows.map(r => [r.id, r.n]));
  }

  async unreadTotal(userId: string) {
    const v = await this.viewer(userId);
    const ids = (await this.prisma.conversation.findMany({ where: this.where(v), select: { id: true }, take: 500 })).map(c => c.id);
    let total = 0; for (const n of (await this.unreadBy(userId, ids)).values()) total += n;
    return { total };
  }

  async list(userId: string) {
    await this.ensureConversations();
    const v = await this.viewer(userId);
    const rows = await this.prisma.conversation.findMany({ where: this.where(v), select: convSelect, take: 100 });
    const unread = await this.unreadBy(userId, rows.map(r => r.id));
    return rows.map(c => {
      const last = c.messages[0];
      return {
        id: c.id, caseRef: c.case.referenceNumber, title: c.case.subject, name: this.counterpart(v, c),
        subtitle: c.kind === 'CONSUMER_BUSINESS' ? 'The business' : 'Government office', open: this.canWrite(v, c),
        preview: last ? (last.kind === 'VOICE' ? 'Voice message' : last.content.slice(0, 80)) : 'No messages yet',
        lastAt: (last?.sentAt ?? c.createdAt).toISOString(), lastMine: last?.senderUserId === userId, unread: unread.get(c.id) ?? 0,
      };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  private async open(userId: string, id: string) {
    const v = await this.viewer(userId);
    const c = await this.prisma.conversation.findFirst({ where: { id, ...this.where(v) }, select: convSelect });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'That conversation is not available to you.' });
    return { v, c };
  }

  async thread(userId: string, id: string) {
    const { v, c } = await this.open(userId, id);
    const rows = await this.prisma.message.findMany({
      where: { conversationId: id }, orderBy: { sentAt: 'asc' }, take: 500,
      select: { id: true, kind: true, content: true, durationMs: true, sentAt: true, senderUserId: true,
        sender: { select: { fullName: true, offices: { where: { isActive: true }, take: 1, select: { office: { select: { nameEn: true } } } } } } },
    });
    // Opening a conversation reads it. Messages that arrive later are unread again.
    await this.prisma.conversationRead.upsert({ where: { conversationId_userId: { conversationId: id, userId } }, update: { readAt: new Date() }, create: { conversationId: id, userId } });
    return {
      id, caseRef: c.case.referenceNumber, title: c.case.subject, name: this.counterpart(v, c), open: this.canWrite(v, c),
      closedNote: this.canWrite(v, c) ? null : CLOSED.has(c.case.status) ? 'This complaint is closed.' : v.kind === 'staff' || v.kind === 'business'
        ? 'This complaint is no longer with you, so you can read the conversation but not write.' : 'You cannot write here right now.',
      messages: rows.map(m => {
        const mine = m.senderUserId === userId;
        const fromConsumer = m.senderUserId === c.case.complainantId;
        const office = m.sender.offices[0]?.office.nameEn;
        const who = mine ? 'You' : fromConsumer ? this.counterpart(v, c) : v.kind === 'consumer' && c.kind === 'CONSUMER_BUSINESS' ? this.counterpart(v, c) : office ? `${m.sender.fullName} · ${office}` : m.sender.fullName;
        return { id: m.id, mine, who, kind: m.kind === 'VOICE' ? 'voice' as const : 'text' as const, text: m.content, durationMs: m.durationMs, sentAt: m.sentAt.toISOString() };
      }),
    };
  }

  /** A new message puts one unread notice in front of the people on the other side (several in a row fold into one). */
  private async tell(v: Viewer, c: Conv, caseId: string, userId: string, preview: string) {
    const ref = c.case.referenceNumber;
    let to: string[] = [];
    let who = 'Someone';
    if (v.kind === 'consumer') {
      to = c.kind === 'CONSUMER_BUSINESS' ? (c.case.merchantId ? await businessUserIds(this.prisma, c.case.merchantId) : []) : (c.case.currentOfficeId ? await officeStaffIds(this.prisma, c.case.currentOfficeId) : []);
      who = c.kind === 'CONSUMER_BUSINESS' ? c.case.complainantAlias : c.case.complainant.fullName; // a business only ever learns the pseudonym
    } else {
      to = [c.case.complainantId];
      who = c.kind === 'CONSUMER_BUSINESS' ? (c.case.merchant?.tradeName ?? 'The business') : (c.case.currentOffice?.nameEn ?? 'The office');
    }
    await notify(this.prisma, to.filter(u => u !== userId), { caseId, type: 'NEW_MESSAGE', title: `New message from ${who} about ${ref}`, body: preview, fold: true });
  }

  async sendText(userId: string, id: string, text: unknown) {
    const body = typeof text === 'string' ? text.trim() : '';
    if (!body || body.length > 2000) throw new BadRequestException({ code: 'VALIDATION', message: 'Write a message of up to 2000 characters.' });
    const { v, c } = await this.open(userId, id);
    if (!this.canWrite(v, c)) throw new ForbiddenException({ code: 'CLOSED', message: 'You cannot write in this conversation now.' });
    const m = await this.prisma.message.create({ data: { conversationId: id, senderUserId: userId, content: body }, select: { id: true, sentAt: true } });
    await this.tell(v, c, c.case.id, userId, body.slice(0, 140));
    return { id: m.id, sentAt: m.sentAt.toISOString() };
  }

  async sendVoice(userId: string, id: string, input: { audio?: unknown; mime?: unknown; durationMs?: unknown }) {
    const mime = typeof input.mime === 'string' ? input.mime.split(';')[0].trim() : '';
    const ms = Number(input.durationMs);
    const bytes = typeof input.audio === 'string' ? Buffer.from(input.audio, 'base64') : null;
    if (!bytes || !bytes.length || !mime.startsWith('audio/') || !Number.isFinite(ms) || ms < 300) throw new BadRequestException({ code: 'VALIDATION', message: 'The recording is empty or not understood.' });
    if (bytes.length > MAX_VOICE_BYTES || ms > MAX_VOICE_MS) throw new BadRequestException({ code: 'TOO_LONG', message: 'A voice message can be up to 3 minutes.' });
    const { v, c } = await this.open(userId, id);
    if (!this.canWrite(v, c)) throw new ForbiddenException({ code: 'CLOSED', message: 'You cannot write in this conversation now.' });
    const m = await this.prisma.message.create({
      data: { conversationId: id, senderUserId: userId, content: '', kind: 'VOICE', audio: bytes, audioMime: mime, durationMs: Math.round(ms) }, select: { id: true, sentAt: true },
    });
    await this.tell(v, c, c.case.id, userId, 'Sent a voice message');
    return { id: m.id, sentAt: m.sentAt.toISOString() };
  }

  async audio(userId: string, messageId: string) {
    const m = await this.prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true, audio: true, audioMime: true } });
    if (!m?.audio) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No such recording.' });
    await this.open(userId, m.conversationId); // the same access check as reading the conversation
    return { bytes: Buffer.from(m.audio), mime: m.audioMime ?? 'audio/webm' };
  }
}
