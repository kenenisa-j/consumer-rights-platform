import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CaseStatus,
  ComplaintRoute,
  ConversationKind,
  OfferStatus,
  OfficeLevel,
  SettlementType,
  TransferDirection,
  TransferStatus,
} from "@prisma/client";
import { ConsumerMessageDto } from "../backend/dist/modules/cases/dto/consumer-message.dto.js";
import { RejectOfferDto } from "../backend/dist/modules/cases/dto/reject-offer.dto.js";
import { EscalateCaseDto } from "../backend/dist/modules/cases/dto/escalate-case.dto.js";
import { ConsumerCasesService } from "../backend/dist/modules/cases/consumer-cases.service.js";
import { CasesController } from "../backend/dist/modules/cases/cases.controller.js";

function createMockPrisma({
  initialCases = [],
  initialCategories = [],
  initialOffices = [],
  initialMerchants = [],
  initialConversations = [],
  initialMessages = [],
  initialOffers = [],
  initialTransfers = [],
  initialEvidence = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const categories = new Map(initialCategories.map((cat) => [cat.id, { ...cat }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const conversations = new Map(initialConversations.map((cv) => [cv.id, { ...cv }]));
  const messages = new Map(initialMessages.map((m) => [m.id, { ...m }]));
  const offers = new Map(initialOffers.map((o) => [o.id, { ...o }]));
  const transfers = [...initialTransfers];
  const historyStore = [];
  const auditStore = [];

  const mock = {
    case: {
      findFirst: async ({ where, include }) => {
        const list = Array.from(cases.values());
        const match = list.find((c) => {
          if (where?.referenceNumber && c.referenceNumber !== where.referenceNumber) return false;
          if (where?.complainantId && c.complainantId !== where.complainantId) return false;
          return true;
        });
        if (!match) return null;
        const res = { ...match };
        if (include?.category) res.category = categories.get(match.categoryId);
        if (include?.merchant) res.merchant = merchants.get(match.merchantId);
        if (include?.currentOffice) res.currentOffice = offices.get(match.currentOfficeId);
        if (include?.evidenceFiles) {
          res.evidenceFiles = initialEvidence.filter((e) => e.caseId === match.id && !e.isOfficerOnly);
        }
        if (include?.history) {
          res.history = historyStore.filter((h) => h.caseId === match.id);
        }
        if (include?.transfers) {
          res.transfers = transfers
            .filter((t) => t.caseId === match.id)
            .map((t) => ({
              ...t,
              fromOffice: offices.get(t.fromOfficeId),
              toOffice: offices.get(t.toOfficeId),
            }));
        }
        if (include?.conversations) {
          res.conversations = Array.from(conversations.values())
            .filter((cv) => cv.caseId === match.id)
            .map((cv) => ({
              ...cv,
              messages: Array.from(messages.values())
                .filter((m) => m.conversationId === cv.id)
                .map((m) => ({ ...m, sender: { id: m.senderUserId, fullName: m.senderName || "Sender" } })),
              offers: Array.from(offers.values()).filter((o) => o.conversationId === cv.id),
            }));
        }
        return res;
      },
      update: async ({ where, data }) => {
        const c = cases.get(where.id);
        const updated = { ...c, ...data };
        cases.set(where.id, updated);
        return updated;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
    },
    settlementOffer: {
      findFirst: async ({ where }) => {
        return (
          Array.from(offers.values()).find((o) => {
            if (where.id && o.id !== where.id) return false;
            if (where.caseId && o.caseId !== where.caseId) return false;
            return true;
          }) || null
        );
      },
      update: async ({ where, data }) => {
        const o = offers.get(where.id);
        const updated = { ...o, ...data };
        offers.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }) => {
        for (const [id, o] of offers.entries()) {
          if (o.caseId === where.caseId && o.status === where.status) {
            offers.set(id, { ...o, ...data });
          }
        }
        return { count: 1 };
      },
    },
    conversation: {
      findFirst: async ({ where }) => {
        return (
          Array.from(conversations.values()).find(
            (cv) => cv.caseId === where.caseId && cv.kind === where.kind,
          ) || null
        );
      },
      create: async ({ data }) => {
        const cv = { id: `conv-${Date.now()}`, ...data };
        conversations.set(cv.id, cv);
        return cv;
      },
    },
    conversationParticipant: {
      upsert: async ({ create }) => create,
    },
    message: {
      create: async ({ data }) => {
        const m = { id: `msg-${Date.now()}`, sentAt: new Date(), ...data };
        messages.set(m.id, m);
        return m;
      },
    },
    caseTransfer: {
      create: async ({ data }) => {
        const t = { id: `tr-${Date.now()}`, transferredAt: new Date(), ...data };
        transfers.push(t);
        return t;
      },
    },
    caseHistory: {
      create: async ({ data }) => {
        const h = { id: `hist-${Date.now()}`, createdAt: new Date(), ...data };
        historyStore.push(h);
        return h;
      },
    },
    caseAuditLog: {
      create: async ({ data }) => {
        const a = { id: `audit-${Date.now()}`, timestamp: new Date(), ...data };
        auditStore.push(a);
        return a;
      },
    },
    $transaction: async (cb) => cb(mock),
  };

  return { mock, historyStore, auditStore, offers, messages, transfers };
}

test("Phase 4.3: Consumer DTO validation", async () => {
  const emptyMsg = plainToInstance(ConsumerMessageDto, { message: "" });
  const msgErrors = await validate(emptyMsg);
  assert.ok(msgErrors.length > 0);

  const validMsg = plainToInstance(ConsumerMessageDto, { message: "Thank you for the reply." });
  const validErrors = await validate(validMsg);
  assert.equal(validErrors.length, 0);

  const validEscalate = plainToInstance(EscalateCaseDto, {
    targetOfficeId: "off-woreda-7",
    reason: "Merchant refused to offer refund.",
  });
  const escErrors = await validate(validEscalate);
  assert.equal(escErrors.length, 0);
});

test("Phase 4.3: Consumer can view own case details, history, messages, and offers", async () => {
  const { mock } = createMockPrisma({
    initialCases: [
      {
        id: "c-100",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        complainantAlias: "Consumer 00123",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-gebriel",
        categoryId: "cat-grain",
        itemDescription: "Short weight rice sack",
        disputedAmount: 2250,
        currency: "ETB",
        desiredRemedy: "Full refund",
        status: CaseStatus.BUSINESS_OFFER_PENDING,
        escalatedToGovAt: null,
        currentOfficeId: null,
      },
    ],
    initialCategories: [{ id: "cat-grain", nameEn: "Wrong weight or measure", defaultSlaDays: 3 }],
    initialMerchants: [{ id: "m-gebriel", tradeName: "Gebriel Grain Traders", woredaOfficeId: "off-w7" }],
    initialConversations: [{ id: "conv-1", caseId: "c-100", kind: ConversationKind.CONSUMER_BUSINESS }],
    initialMessages: [
      { id: "msg-1", conversationId: "conv-1", senderUserId: "u-biz", senderName: "Gebriel Grain", content: "We offer replacement.", sentAt: new Date() },
    ],
    initialOffers: [
      {
        id: "off-1",
        caseId: "c-100",
        conversationId: "conv-1",
        offerType: SettlementType.REPLACEMENT,
        termsDescription: "New 25kg sack",
        status: OfferStatus.PENDING,
        createdAt: new Date(),
      },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const details = await service.getByReference("u-hirut", "CC-2026-00123");

  assert.equal(details.reference, "CC-2026-00123");
  assert.equal(details.thread.length, 1);
  assert.equal(details.thread[0].from, "business");
  assert.equal(details.offers.length, 1);
  assert.equal(details.offers[0].offerType, SettlementType.REPLACEMENT);
  assert.equal(details.canEscalate, true);
});

test("Phase 4.3: Consumer cannot view another consumer's case", async () => {
  const { mock } = createMockPrisma({
    initialCases: [
      {
        id: "c-other",
        referenceNumber: "CC-2026-00999",
        complainantId: "u-other-citizen",
        route: ComplaintRoute.DIRECT_GOVERNMENT,
        status: CaseStatus.RECEIVED_BY_OFFICE,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const result = await service.getByReference("u-hirut", "CC-2026-00999");
  assert.equal(result, null);
});

test("Phase 4.3: Consumer can send authorized message on active case", async () => {
  const { mock, messages, auditStore } = createMockPrisma({
    initialCases: [
      {
        id: "c-1",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const res = await service.sendMessage("u-hirut", "CC-2026-00123", {
    message: "Here is the photo of the scale.",
  });

  assert.equal(res.success, true);
  assert.ok(res.messageId);
  assert.equal(messages.size, 1);
  assert.equal(auditStore.length, 1);
});

test("Phase 4.3: Closed case rejects consumer messages and escalation", async () => {
  const { mock } = createMockPrisma({
    initialCases: [
      {
        id: "c-closed",
        referenceNumber: "CC-2026-00888",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        status: CaseStatus.RESOLVED_MUTUALLY,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);

  await assert.rejects(
    () => service.sendMessage("u-hirut", "CC-2026-00888", { message: "Can I still ask?" }),
    (err) => err.response?.code === "CASE_CLOSED",
  );

  await assert.rejects(
    () => service.escalateToGovernment("u-hirut", "CC-2026-00888", {}),
    (err) => err.response?.code === "CASE_CLOSED",
  );
});

test("Phase 4.3: Consumer accepts pending offer and transitions to RESOLVED_MUTUALLY", async () => {
  const { mock, historyStore, offers } = createMockPrisma({
    initialCases: [
      {
        id: "c-1",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        status: CaseStatus.BUSINESS_OFFER_PENDING,
      },
    ],
    initialOffers: [
      {
        id: "off-pend",
        caseId: "c-1",
        conversationId: "conv-1",
        offerType: SettlementType.FULL_REFUND,
        refundAmount: 2250,
        termsDescription: "Full refund in cash within 2 days",
        status: OfferStatus.PENDING,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const res = await service.acceptOffer("u-hirut", "CC-2026-00123", "off-pend");

  assert.equal(res.success, true);
  assert.equal(res.status, CaseStatus.RESOLVED_MUTUALLY);
  assert.equal(offers.get("off-pend").status, OfferStatus.ACCEPTED);
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].toStatus, CaseStatus.RESOLVED_MUTUALLY);
});

test("Phase 4.3: Expired offer cannot be accepted", async () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { mock } = createMockPrisma({
    initialCases: [
      {
        id: "c-1",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        status: CaseStatus.BUSINESS_OFFER_PENDING,
      },
    ],
    initialOffers: [
      {
        id: "off-expired",
        caseId: "c-1",
        status: OfferStatus.PENDING,
        expiresAt: pastDate,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);

  await assert.rejects(
    () => service.acceptOffer("u-hirut", "CC-2026-00123", "off-expired"),
    (err) => err.response?.code === "OFFER_EXPIRED",
  );
});

test("Phase 4.3: Consumer rejects offer and reverts status to SUBMITTED_TO_BUSINESS", async () => {
  const { mock, historyStore, offers } = createMockPrisma({
    initialCases: [
      {
        id: "c-1",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        status: CaseStatus.BUSINESS_OFFER_PENDING,
      },
    ],
    initialOffers: [
      {
        id: "off-1",
        caseId: "c-1",
        conversationId: "conv-1",
        offerType: SettlementType.REPLACEMENT,
        termsDescription: "New sack",
        status: OfferStatus.PENDING,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const res = await service.rejectOffer("u-hirut", "CC-2026-00123", "off-1", {
    reason: "A replacement is not acceptable. I want my money back.",
  });

  assert.equal(res.success, true);
  assert.equal(res.status, CaseStatus.SUBMITTED_TO_BUSINESS);
  assert.equal(offers.get("off-1").status, OfferStatus.REJECTED);
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].toStatus, CaseStatus.SUBMITTED_TO_BUSINESS);
});

test("Phase 4.3: Valid Route B escalation creates CaseTransfer, CaseHistory, and expires offers", async () => {
  const { mock, historyStore, transfers, offers } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", code: "WO-07", nameEn: "Woreda 7 Trade Office", level: OfficeLevel.WOREDA, isActive: true },
    ],
    initialMerchants: [
      { id: "m-gebriel", tradeName: "Gebriel Grain", woredaOfficeId: "off-w7" },
    ],
    initialCategories: [
      { id: "cat-1", nameEn: "Short weight", defaultSlaDays: 3 },
    ],
    initialCases: [
      {
        id: "c-1",
        referenceNumber: "CC-2026-00123",
        complainantId: "u-hirut",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-gebriel",
        categoryId: "cat-1",
        status: CaseStatus.BUSINESS_OFFER_PENDING,
        escalatedToGovAt: null,
        currentOfficeId: null,
      },
    ],
    initialOffers: [
      { id: "off-1", caseId: "c-1", status: OfferStatus.PENDING },
    ],
  });

  const service = new ConsumerCasesService(mock);
  const res = await service.escalateToGovernment("u-hirut", "CC-2026-00123", {
    reason: "Business offer is insufficient.",
  });

  assert.equal(res.success, true);
  assert.equal(res.status, CaseStatus.ESCALATED_TO_GOVERNMENT);
  assert.equal(res.holdingOffice, "Woreda 7 Trade Office");

  // Transfer created
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].direction, TransferDirection.UPWARD_ESCALATION);
  assert.equal(transfers[0].status, TransferStatus.PENDING_ACCEPTANCE);

  // History logged
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].toStatus, CaseStatus.ESCALATED_TO_GOVERNMENT);
  assert.equal(historyStore[0].handlingLevel, "woreda");

  // Pending offers expired
  assert.equal(offers.get("off-1").status, OfferStatus.EXPIRED);
});

test("Phase 4.3: Rejects escalation of Route A direct-government complaints", async () => {
  const { mock } = createMockPrisma({
    initialCases: [
      {
        id: "c-route-a",
        referenceNumber: "CC-2026-00140",
        complainantId: "u-hirut",
        route: ComplaintRoute.DIRECT_GOVERNMENT,
        status: CaseStatus.RECEIVED_BY_OFFICE,
      },
    ],
  });

  const service = new ConsumerCasesService(mock);

  await assert.rejects(
    () => service.escalateToGovernment("u-hirut", "CC-2026-00140", {}),
    (err) => err.response?.code === "ALREADY_GOVERNMENT_ROUTE",
  );
});

test("Phase 4.3: All CasesController routes have authorization decorators", () => {
  const proto = CasesController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method CasesController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

