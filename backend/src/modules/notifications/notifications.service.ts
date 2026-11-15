import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import {
  NotificationType,
  CaseLifecycleEvent,
  NotificationPreferences,
} from './notifications.types';
import { buildLifecycleNotifications, FormattedNotification } from './notifications.helpers';
import { SmsNotificationAdapter } from './adapters/sms-notification.adapter';
import { EmailNotificationAdapter } from './adapters/email-notification.adapter';
import { PushNotificationAdapter } from './adapters/push-notification.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsAdapter: SmsNotificationAdapter,
    private readonly emailAdapter: EmailNotificationAdapter,
    private readonly pushAdapter: PushNotificationAdapter,
  ) {}

  async listNotifications(userId: string, query: QueryNotificationsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { recipientUserId: userId };
    if (typeof query.isRead === 'boolean') {
      where.isRead = query.isRead;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { recipientUserId: userId, isRead: false },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { recipientUserId: userId, isRead: false },
    });
    return { unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found.',
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true, notification: updated };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updatedCount: result.count };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found.',
      });
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  async getPreferences(_userId: string): Promise<NotificationPreferences> {
    return {
      inApp: true,
      email: false,
      sms: false,
      push: false,
      persisted: false,
      note: 'In-app notifications are active. External channel preferences default to disabled.',
    };
  }

  async updatePreferences(_userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferences> {
    return {
      inApp: dto.inApp ?? true,
      email: dto.email ?? false,
      sms: dto.sms ?? false,
      push: dto.push ?? false,
      persisted: false,
      note: 'Channel preferences acknowledged. Persistence is reserved for future schema evolution.',
    };
  }

  async createNotification(params: {
    recipientUserId: string;
    caseId?: string | null;
    type: string;
    title: string;
    messageBody: string;
    channel?: string;
  }) {
    // 1. Idempotency deduplication check: within last 60 seconds
    const cutoff = new Date(Date.now() - 60_000);
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientUserId: params.recipientUserId,
        caseId: params.caseId || undefined,
        type: params.type,
        createdAt: { gte: cutoff },
      },
    });
    if (existing) {
      return existing;
    }

    // 2. Persist in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        recipientUserId: params.recipientUserId,
        caseId: params.caseId ?? null,
        type: params.type,
        title: params.title,
        messageBody: params.messageBody,
        channel: params.channel || 'IN_APP',
        isRead: false,
      },
    });

    // 3. Dispatch to external channel adapters asynchronously
    this.dispatchAdapters({
      recipientUserId: params.recipientUserId,
      caseId: params.caseId,
      type: params.type,
      title: params.title,
      messageBody: params.messageBody,
    }).catch((err) => {
      this.logger.warn(`External notification dispatch failed: ${err.message}`);
    });

    return notification;
  }

  private async dispatchAdapters(payload: {
    recipientUserId: string;
    caseId?: string | null;
    type: string;
    title: string;
    messageBody: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.recipientUserId },
      select: { phoneNumber: true, email: true },
    });
    if (!user) return;

    await Promise.allSettled([
      this.smsAdapter.send({ ...payload, recipientPhone: user.phoneNumber }),
      this.emailAdapter.send({ ...payload, recipientEmail: user.email }),
      this.pushAdapter.send(payload),
    ]);
  }

  async dispatchCaseEvent(event: CaseLifecycleEvent): Promise<void> {
    try {
      const formattedList = buildLifecycleNotifications(event);
      if (formattedList.length === 0) return;

      for (const item of formattedList) {
        await this.deliverFormattedNotification(item, event);
      }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch case event (${event.type}): ${err.message}`);
      // Fail safely: notification errors must never break case operations
    }
  }

  private async deliverFormattedNotification(item: FormattedNotification, event: CaseLifecycleEvent) {
    if (item.target === 'CONSUMER' && event.complainantId) {
      await this.createNotification({
        recipientUserId: event.complainantId,
        caseId: event.caseId,
        type: item.type,
        title: item.title,
        messageBody: item.message,
      });
    } else if (item.target === 'BUSINESS' && event.merchantId) {
      const merchantUsers = await this.prisma.merchantUser.findMany({
        where: { merchantId: event.merchantId },
        select: { userId: true },
      });
      for (const mu of merchantUsers) {
        await this.createNotification({
          recipientUserId: mu.userId,
          caseId: event.caseId,
          type: item.type,
          title: item.title,
          messageBody: item.message,
        });
      }
    } else if (item.target === 'OFFICER') {
      const officerId = event.targetOfficerId || await this.resolveActiveOfficer(event.caseId);
      if (officerId) {
        await this.createNotification({
          recipientUserId: officerId,
          caseId: event.caseId,
          type: item.type,
          title: item.title,
          messageBody: item.message,
        });
      }
    } else if (item.target === 'OFFICE') {
      const officeId = event.targetOfficeId || event.officeId;
      if (officeId) {
        const staff = await this.prisma.userOffice.findMany({
          where: { officeId, isActive: true },
          select: { userId: true },
        });
        for (const s of staff) {
          await this.createNotification({
            recipientUserId: s.userId,
            caseId: event.caseId,
            type: item.type,
            title: item.title,
            messageBody: item.message,
          });
        }
      }
    }
  }

  private async resolveActiveOfficer(caseId: string): Promise<string | null> {
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: { caseId, isActive: true },
      select: { assignedToUserId: true },
    });
    return assignment?.assignedToUserId || null;
  }

  async checkPendingReminders(): Promise<{ count: number }> {
    const now = new Date();
    const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // within 24 hours

    const urgentCases = await this.prisma.case.findMany({
      where: {
        slaDeadline: { lte: threshold, gt: now },
        status: { notIn: ['RESOLVED_MUTUALLY', 'RESOLVED_ADMINISTRATIVE_ORDER', 'COURT_REFERRAL_ISSUED', 'CLOSED_WITHDRAWN'] },
      },
      select: { id: true, referenceNumber: true, currentOfficeId: true, merchantId: true, complainantAlias: true },
      take: 50,
    });

    for (const c of urgentCases) {
      await this.dispatchCaseEvent({
        type: NotificationType.DEADLINE_APPROACHING,
        caseId: c.id,
        referenceNumber: c.referenceNumber,
        officeId: c.currentOfficeId || undefined,
        merchantId: c.merchantId || undefined,
        complainantAlias: c.complainantAlias,
      });
    }

    return { count: urgentCases.length };
  }
}

