import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { QueryNotificationsDto } from "../backend/dist/modules/notifications/dto/query-notifications.dto.js";
import { UpdatePreferencesDto } from "../backend/dist/modules/notifications/dto/update-preferences.dto.js";
import { NotificationType } from "../backend/dist/modules/notifications/notifications.types.js";
import { NotificationsService } from "../backend/dist/modules/notifications/notifications.service.js";
import { NotificationsController } from "../backend/dist/modules/notifications/notifications.controller.js";
import { SmsNotificationAdapter } from "../backend/dist/modules/notifications/adapters/sms-notification.adapter.js";
import { EmailNotificationAdapter } from "../backend/dist/modules/notifications/adapters/email-notification.adapter.js";
import { PushNotificationAdapter } from "../backend/dist/modules/notifications/adapters/push-notification.adapter.js";

function createMockPrisma({
  initialNotifications = [],
  initialUsers = [],
  initialMerchantUsers = [],
  initialUserOffices = [],
  initialCases = [],
  initialAssignments = [],
} = {}) {
  const notifications = new Map(initialNotifications.map((n) => [n.id, { ...n }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const merchantUsers = [...initialMerchantUsers];
  const userOffices = [...initialUserOffices];
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const assignments = [...initialAssignments];

  const mock = {
    notification: {
      findMany: async ({ where = {}, skip = 0, take = 50, orderBy } = {}) => {
        let list = Array.from(notifications.values());
        if (where.recipientUserId) {
          list = list.filter((n) => n.recipientUserId === where.recipientUserId);
        }
        if (typeof where.isRead === "boolean") {
          list = list.filter((n) => n.isRead === where.isRead);
        }
        if (where.type) {
          list = list.filter((n) => n.type === where.type);
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list.slice(skip, skip + take);
      },
      count: async ({ where = {} } = {}) => {
        let list = Array.from(notifications.values());
        if (where.recipientUserId) {
          list = list.filter((n) => n.recipientUserId === where.recipientUserId);
        }
        if (typeof where.isRead === "boolean") {
          list = list.filter((n) => n.isRead === where.isRead);
        }
        if (where.type) {
          list = list.filter((n) => n.type === where.type);
        }
        return list.length;
      },
      findFirst: async ({ where = {} } = {}) => {
        return Array.from(notifications.values()).find((n) => {
          if (where.id && n.id !== where.id) return false;
          if (where.recipientUserId && n.recipientUserId !== where.recipientUserId) return false;
          if (where.caseId && n.caseId !== where.caseId) return false;
          if (where.type && n.type !== where.type) return false;
          if (where.createdAt?.gte && new Date(n.createdAt) < where.createdAt.gte) return false;
          return true;
        }) || null;
      },
      create: async ({ data }) => {
        const id = data.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const record = {
          id,
          recipientUserId: data.recipientUserId,
          caseId: data.caseId || null,
          type: data.type,
          title: data.title,
          messageBody: data.messageBody,
          channel: data.channel || "IN_APP",
          isRead: data.isRead ?? false,
          readAt: data.readAt || null,
          createdAt: data.createdAt || new Date(),
        };
        notifications.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = notifications.get(where.id);
        if (!existing) throw new Error("Notification not found");
        const updated = { ...existing, ...data };
        notifications.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where = {}, data }) => {
        let count = 0;
        for (const [id, n] of notifications.entries()) {
          if (where.recipientUserId && n.recipientUserId !== where.recipientUserId) continue;
          if (typeof where.isRead === "boolean" && n.isRead !== where.isRead) continue;
          notifications.set(id, { ...n, ...data });
          count++;
        }
        return { count };
      },
      delete: async ({ where }) => {
        const deleted = notifications.delete(where.id);
        return { count: deleted ? 1 : 0 };
      },
    },
    user: {
      findUnique: async ({ where }) => users.get(where.id) || null,
    },
    merchantUser: {
      findMany: async ({ where = {} } = {}) => {
        return merchantUsers.filter((mu) => !where.merchantId || mu.merchantId === where.merchantId);
      },
    },
    userOffice: {
      findMany: async ({ where = {} } = {}) => {
        return userOffices.filter(
          (uo) => (!where.officeId || uo.officeId === where.officeId) && (!where.isActive || uo.isActive === where.isActive),
        );
      },
    },
    caseAssignment: {
      findFirst: async ({ where = {} } = {}) => {
        return assignments.find((a) => a.caseId === where.caseId && a.isActive === where.isActive) || null;
      },
    },
    case: {
      findMany: async ({ where = {}, take = 50 } = {}) => {
        let list = Array.from(cases.values());
        if (where.slaDeadline?.lte) {
          list = list.filter((c) => c.slaDeadline && c.slaDeadline <= where.slaDeadline.lte);
        }
        return list.slice(0, take);
      },
    },
  };

  return { mock, notifications, users, merchantUsers, userOffices, cases, assignments };
}

test("Phase 4.9: DTO validation rules", async () => {
  const invalidQuery = plainToInstance(QueryNotificationsDto, {
    page: 0,
    limit: 200,
    type: "NON_EXISTENT_TYPE",
  });
  const errors = await validate(invalidQuery);
  assert.ok(errors.length >= 3, "Expected validation errors for page < 1, limit > 100, and invalid type");

  const validQuery = plainToInstance(QueryNotificationsDto, {
    page: 2,
    limit: 50,
    isRead: "true",
    type: NotificationType.COMPLAINT_SUBMITTED,
  });
  const validErrors = await validate(validQuery);
  assert.equal(validErrors.length, 0);
  assert.equal(validQuery.page, 2);
  assert.equal(validQuery.limit, 50);
  assert.equal(validQuery.isRead, true);

  const invalidPref = plainToInstance(UpdatePreferencesDto, { inApp: "yes" });
  const prefErrors = await validate(invalidPref);
  assert.ok(prefErrors.length >= 1, "Expected validation error for non-boolean inApp preference");
});

test("Phase 4.9: Notification creation and deduplication safeguards", async () => {
  const { mock, notifications } = createMockPrisma();
  const service = new NotificationsService(
    mock,
    new SmsNotificationAdapter(),
    new EmailNotificationAdapter(),
    new PushNotificationAdapter(),
  );

  const n1 = await service.createNotification({
    recipientUserId: "u-citizen-1",
    caseId: "case-001",
    type: NotificationType.COMPLAINT_SUBMITTED,
    title: "Complaint Received",
    messageBody: "Your complaint CC-2026-00001 was submitted.",
  });
  assert.ok(n1.id);
  assert.equal(notifications.size, 1);

  // Immediate retry within 60s returns deduplicated record
  const n2 = await service.createNotification({
    recipientUserId: "u-citizen-1",
    caseId: "case-001",
    type: NotificationType.COMPLAINT_SUBMITTED,
    title: "Complaint Received",
    messageBody: "Your complaint CC-2026-00001 was submitted.",
  });
  assert.equal(n1.id, n2.id, "Expected deduplication to return existing notification ID");
  assert.equal(notifications.size, 1, "No duplicate notification created");
});

test("Phase 4.9: Lifecycle events create correct notifications for authorized roles", async () => {
  const { mock, notifications } = createMockPrisma({
    initialUsers: [
      { id: "u-citizen-1", fullName: "Citizen One", phoneNumber: "+251911000001", email: "citizen@example.com" },
      { id: "u-merchant-owner", fullName: "Merchant Owner", phoneNumber: "+251911000002", email: "owner@merchant.com" },
      { id: "u-officer-woreda", fullName: "Officer Abebe", phoneNumber: "+251911000003", email: "officer@trade.gov.et" },
    ],
    initialMerchantUsers: [{ merchantId: "merch-1", userId: "u-merchant-owner" }],
    initialUserOffices: [{ officeId: "off-woreda-1", userId: "u-officer-woreda", isActive: true }],
  });

  const service = new NotificationsService(
    mock,
    new SmsNotificationAdapter(),
    new EmailNotificationAdapter(),
    new PushNotificationAdapter(),
  );

  // 1. Complaint submitted -> Consumer notified
  await service.dispatchCaseEvent({
    type: NotificationType.COMPLAINT_SUBMITTED,
    caseId: "case-1",
    referenceNumber: "CC-2026-00101",
    complainantId: "u-citizen-1",
  });
  const citizenNotifs = Array.from(notifications.values()).filter((n) => n.recipientUserId === "u-citizen-1");
  assert.equal(citizenNotifs.length, 1);
  assert.equal(citizenNotifs[0].type, NotificationType.COMPLAINT_SUBMITTED);
  assert.ok(citizenNotifs[0].messageBody.includes("CC-2026-00101"));

  // 2. New complaint against business -> Merchant notified with consumer alias (no PII)
  await service.dispatchCaseEvent({
    type: NotificationType.NEW_COMPLAINT_FILED,
    caseId: "case-1",
    referenceNumber: "CC-2026-00101",
    merchantId: "merch-1",
    complainantAlias: "Consumer 00811",
  });
  const merchantNotifs = Array.from(notifications.values()).filter((n) => n.recipientUserId === "u-merchant-owner");
  assert.equal(merchantNotifs.length, 1);
  assert.equal(merchantNotifs[0].type, NotificationType.NEW_COMPLAINT_FILED);
  assert.ok(merchantNotifs[0].messageBody.includes("Consumer 00811"));
  // Verify strict privacy: never exposes phone or real citizen name
  assert.equal(merchantNotifs[0].messageBody.includes("+251911000001"), false);
  assert.equal(merchantNotifs[0].messageBody.includes("Citizen One"), false);

  // 3. Officer assignment -> Officer notified
  await service.dispatchCaseEvent({
    type: NotificationType.OFFICER_ASSIGNED,
    caseId: "case-1",
    referenceNumber: "CC-2026-00101",
    targetOfficerId: "u-officer-woreda",
    complainantId: "u-citizen-1",
  });
  const officerNotifs = Array.from(notifications.values()).filter((n) => n.recipientUserId === "u-officer-woreda");
  assert.equal(officerNotifs.length, 1);
  assert.equal(officerNotifs[0].type, NotificationType.OFFICER_ASSIGNED);

  // 4. Transfer initiated -> Office staff notified
  await service.dispatchCaseEvent({
    type: NotificationType.TRANSFER_INITIATED,
    caseId: "case-1",
    referenceNumber: "CC-2026-00101",
    targetOfficeId: "off-woreda-1",
  });
  const transferNotifs = Array.from(notifications.values()).filter(
    (n) => n.recipientUserId === "u-officer-woreda" && n.type === NotificationType.TRANSFER_INITIATED,
  );
  assert.equal(transferNotifs.length, 1);
});

test("Phase 4.9: Cross-user isolation and authorization controls", async () => {
  const { mock } = createMockPrisma({
    initialNotifications: [
      {
        id: "notif-user-1",
        recipientUserId: "u-citizen-1",
        type: NotificationType.COMPLAINT_SUBMITTED,
        title: "Complaint 1",
        messageBody: "Body 1",
        isRead: false,
        createdAt: new Date(),
      },
      {
        id: "notif-user-2",
        recipientUserId: "u-citizen-2",
        type: NotificationType.COMPLAINT_SUBMITTED,
        title: "Complaint 2",
        messageBody: "Body 2",
        isRead: false,
        createdAt: new Date(),
      },
    ],
  });

  const service = new NotificationsService(
    mock,
    new SmsNotificationAdapter(),
    new EmailNotificationAdapter(),
    new PushNotificationAdapter(),
  );

  // 1. User 1 cannot view User 2's notifications
  const user1List = await service.listNotifications("u-citizen-1", {});
  assert.equal(user1List.total, 1);
  assert.equal(user1List.items[0].id, "notif-user-1");

  // 2. User 1 cannot mark User 2's notification as read (throws 404 to avoid enumeration)
  await assert.rejects(
    () => service.markAsRead("u-citizen-1", "notif-user-2"),
    (err) => err.response?.code === "NOTIFICATION_NOT_FOUND",
  );

  // 3. User 1 cannot delete User 2's notification
  await assert.rejects(
    () => service.deleteNotification("u-citizen-1", "notif-user-2"),
    (err) => err.response?.code === "NOTIFICATION_NOT_FOUND",
  );
});

test("Phase 4.9: Read/unread status transitions, mark-all-read and unread count", async () => {
  const { mock } = createMockPrisma({
    initialNotifications: [
      { id: "n-1", recipientUserId: "u-citizen-1", isRead: false, createdAt: new Date() },
      { id: "n-2", recipientUserId: "u-citizen-1", isRead: false, createdAt: new Date() },
      { id: "n-3", recipientUserId: "u-citizen-1", isRead: true, readAt: new Date(), createdAt: new Date() },
    ],
  });

  const service = new NotificationsService(
    mock,
    new SmsNotificationAdapter(),
    new EmailNotificationAdapter(),
    new PushNotificationAdapter(),
  );

  // 1. Initial unread count is 2
  const unreadBefore = await service.getUnreadCount("u-citizen-1");
  assert.equal(unreadBefore.unreadCount, 2);

  // 2. Mark single notification as read
  const markRes = await service.markAsRead("u-citizen-1", "n-1");
  assert.equal(markRes.success, true);
  assert.equal(markRes.notification.isRead, true);
  assert.ok(markRes.notification.readAt);

  const unreadAfterSingle = await service.getUnreadCount("u-citizen-1");
  assert.equal(unreadAfterSingle.unreadCount, 1);

  // 3. Mark all as read
  const markAllRes = await service.markAllAsRead("u-citizen-1");
  assert.equal(markAllRes.success, true);
  assert.equal(markAllRes.updatedCount, 1);

  const unreadFinal = await service.getUnreadCount("u-citizen-1");
  assert.equal(unreadFinal.unreadCount, 0);
});

test("Phase 4.9: Pagination and filtering by read status and type", async () => {
  const now = Date.now();
  const mockItems = Array.from({ length: 25 }, (_, i) => ({
    id: `notif-${i + 1}`,
    recipientUserId: "u-citizen-1",
    type: i % 2 === 0 ? NotificationType.COMPLAINT_SUBMITTED : NotificationType.BUSINESS_RESPONSE,
    isRead: i < 10,
    createdAt: new Date(now - i * 1000),
  }));

  const { mock } = createMockPrisma({ initialNotifications: mockItems });
  const service = new NotificationsService(
    mock,
    new SmsNotificationAdapter(),
    new EmailNotificationAdapter(),
    new PushNotificationAdapter(),
  );

  // 1. First page (limit 10)
  const page1 = await service.listNotifications("u-citizen-1", { page: 1, limit: 10 });
  assert.equal(page1.items.length, 10);
  assert.equal(page1.total, 25);
  assert.equal(page1.page, 1);

  // 2. Filter by unread
  const unreadOnly = await service.listNotifications("u-citizen-1", { isRead: false });
  assert.equal(unreadOnly.items.length, 15);
  assert.ok(unreadOnly.items.every((n) => n.isRead === false));

  // 3. Filter by type
  const typeFilter = await service.listNotifications("u-citizen-1", {
    type: NotificationType.COMPLAINT_SUBMITTED,
  });
  assert.equal(typeFilter.items.length, 13);
  assert.ok(typeFilter.items.every((n) => n.type === NotificationType.COMPLAINT_SUBMITTED));
});

test("Phase 4.9: Channel adapter phone and email masking safeguards", () => {
  const smsAdapter = new SmsNotificationAdapter();
  assert.equal(smsAdapter.maskPhoneNumber("+251911223344"), "+251****44");
  assert.equal(smsAdapter.maskPhoneNumber("123"), "****");

  const emailAdapter = new EmailNotificationAdapter();
  assert.equal(emailAdapter.maskEmail("abebe.citizen@example.com"), "a***n@example.com");
  assert.equal(emailAdapter.maskEmail("invalid-email"), "****");
});

test("Phase 4.9: All NotificationsController routes have authorization decorators", () => {
  const proto = NotificationsController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  assert.equal(methods.length, 7, "NotificationsController must have exactly 7 endpoints");
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method NotificationsController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

