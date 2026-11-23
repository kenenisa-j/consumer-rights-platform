import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface Note { caseId?: string | null; type: string; title: string; body: string; /** Repeated events of this kind fold into one unread notice (new messages). */ fold?: boolean }

/** The people working at an office right now. */
export async function officeStaffIds(db: Db, officeId: string): Promise<string[]> {
  const rows = await db.userOffice.findMany({ where: { officeId, isActive: true }, select: { userId: true } });
  return rows.map(r => r.userId);
}

/** The people who work on a business's desk. */
export async function businessUserIds(db: Db, merchantId: string): Promise<string[]> {
  const rows = await db.merchantUser.findMany({ where: { merchantId }, select: { userId: true } });
  return rows.map(r => r.userId);
}

/**
 * Puts a notice in each person's list ("in-app" is the always-on channel). A repeated kind for the same case folds into the unread one,
 * so ten chat messages in a row make one notice, not ten.
 */
export async function notify(db: Db, userIds: string[], n: Note): Promise<void> {
  for (const recipientUserId of [...new Set(userIds)]) {
    if (n.fold) {
      const open = await db.notification.findFirst({ where: { recipientUserId, caseId: n.caseId ?? null, type: n.type, isRead: false }, select: { id: true } });
      if (open) { await db.notification.update({ where: { id: open.id }, data: { title: n.title, messageBody: n.body, createdAt: new Date() } }); continue; }
    }
    await db.notification.create({ data: { recipientUserId, caseId: n.caseId ?? null, type: n.type, title: n.title, messageBody: n.body } });
  }
}
