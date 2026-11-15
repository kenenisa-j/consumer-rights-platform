import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CaseStatus, ComplaintRoute, ConversationKind, OfferStatus, SettlementType } from "@prisma/client";
import { QueryBusinessCasesDto } from "../backend/dist/modules/cases/dto/query-business-cases.dto.js";
import { BusinessResponseDto } from "../backend/dist/modules/cases/dto/business-response.dto.js";
import { BusinessOfferDto } from "../backend/dist/modules/cases/dto/business-offer.dto.js";
import { BusinessCasesService } from "../backend/dist/modules/cases/business-cases.service.js";
import { BusinessCasesController } from "../backend/dist/modules/cases/business-cases.controller.js";

function createMockPrisma({
  initialCases = [],
  initialMerchants = [],
  initialMerchantUsers = [],
  initialCategories = [],
  initialConversations = [],
  initialMessages = [],
  initialOffers = [],
  initialEvidence = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const merchantUsers = new Map(initialMerchantUsers.map((mu) => [`${mu.userId}`, { ...mu }]));
  const categories = new Map(initialCategories.map((c) => [c.id, { ...c }]));
  const conversations = new Map(initialConversations.map((cv) => [cv.id, { ...cv }]));
  const messages = new Map(initialMessages.map((m) => [m.id, { ...m }]));
  const offers = new Map(initialOffers.map((o) => [o.id, { ...o }]));
  const historyStore = [];
  const auditStore = [];

  const mock = {
    merchantUser: {
      findFirst: async ({ where, include }) => {
        const mu = merchantUsers.get(where.userId);
        if (!mu) return null;
        const res = { ...mu };
        if (include?.merchant) {
          res.merchant = merchants.get(mu.merchantId) || null;
        }
        return res;
      },
    },
    case: {
      findMany: async ({ where, select }) => {
        let list = Array.from(cases.values());
        if (where?.merchantId) list = list.filter((c) => c.merchantId === where.merchantId);
        if (where?.route) list = list.filter((c) => c.route === where.route);
        if (where?.status) list = list.filter((c) => c.status === where.status);
        if (where?.categoryId) list = list.filter((c) => c.categoryId === where.categoryId);
        return list.map((c) => {
          if (select) {
            const res = {};
            for (const k of Object.keys(select)) {
              if (k === "category") res.category = categories.get(c.categoryId);
              else if (k === "settlementOffers") {
                res.settlementOffers = Array.from(offers.values()).filter(
                  (o) => o.caseId === c.id && o.status === OfferStatus.PENDING,
                );
              } else res[k] = c[k];
            }
            return res;
          }
          return { ...c };
        });
      },
      findFirst: async ({ where, include }) => {
        const list = Array.from(cases.values());
        const match = list.find((c) => {
          if (where?.referenceNumber && c.referenceNumber !== where.referenceNumber) return false;
          if (where?.merchantId && c.merchantId !== where.merchantId) return false;
          if (where?.route && c.route !== where.route) return false;
          return true;
        });
        if (!match) return null;
        const res = { ...match };
        if (include?.category) res.category = categories.get(match.categoryId);
        if (include?.evidenceFiles) {
          res.evidenceFiles = initialEvidence.filter((e) => e.caseId === match.id && !e.isOfficerOnly);
        }
        if (include?.history) {
          res.history = historyStore.filter((h) => h.caseId === match.id && h.handlingLevel === "business");
        }
        if (include?.conversations) {
          res.conversations = Array.from(conversations.values())
            .filter((cv) => cv.caseId === match.id && cv.kind === ConversationKind.CONSUMER_BUSINESS)
            .map((cv) => ({
              ...cv,
              messages: Array.from(messages.values()).filter((m) => m.conversationId === cv.id),
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
    settlementOffer: {
      updateMany: async ({ where, data }) => {
        for (const [id, o] of offers.entries()) {
          if (o.caseId === where.caseId && o.status === where.status) {
            offers.set(id, { ...o, ...data });
          }
        }
        return { count: 1 };
      },
      create: async ({ data }) => {
        const o = { id: `offer-${Date.now()}`, createdAt: new Date(), ...data };
        offers.set(o.id, o);
        return o;
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

  return { mock, historyStore, auditStore, offers, messages };
}

test("Phase 4.2: Business query & response DTO validation", async () => {
  const invalidOffer = plainToInstance(BusinessOfferDto, {
    offerType: "INVALID_TYPE",
    termsDescription: "",
  });
  const errors = await validate(invalidOffer);
  assert.ok(errors.length > 0);

  const validOffer = plainToInstance(BusinessOfferDto, {
    offerType: SettlementType.FULL_REFUND,
    refundAmount: 1500,
    termsDescription: "Full refund offered within 3 business days.",
    expiresInDays: 5,
  });
  const validErrors = await validate(validOffer);
  assert.equal(validErrors.length, 0);

  const invalidMsg = plainToInstance(BusinessResponseDto, { message: "" });
  const msgErrors = await validate(invalidMsg);
  assert.ok(msgErrors.length > 0);
});

test("Phase 4.2: Business inbox returns only that business's complaints", async () => {
  const { mock } = createMockPrisma({
    initialMerchants: [
      { id: "m-biz1", registrationNumber: "AA-01", tradeName: "Gebriel Grain", isActive: true },
      { id: "m-biz2", registrationNumber: "AA-02", tradeName: "Other Trader", isActive: true },
    ],
    initialMerchantUsers: [
      { userId: "u-owner1", merchantId: "m-biz1", roleInBusiness: "OWNER" },
    ],
    initialCategories: [{ id: "cat-1", code: "OVERPRICING", nameEn: "Overpricing" }],
    initialCases: [
      {
        id: "c1",
        referenceNumber: "CC-2026-00001",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        categoryId: "cat-1",
        complainantAlias: "Consumer 00012",
        itemDescription: "Short weight rice sack",
        disputedAmount: 2250,
        currency: "ETB",
        incidentDate: new Date(),
        desiredRemedy: "Refund",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "c2",
        referenceNumber: "CC-2026-00002",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz2",
        categoryId: "cat-1",
        complainantAlias: "Consumer 00099",
        itemDescription: "Electronics dispute",
        disputedAmount: 5000,
        currency: "ETB",
        incidentDate: new Date(),
        desiredRemedy: "Replacement",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  const service = new BusinessCasesService(mock);
  const inbox = await service.listBusinessComplaints("u-owner1", {});

  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].reference, "CC-2026-00001");
  assert.equal(inbox[0].complainant, "Consumer 00012");
});

test("Phase 4.2: Business cannot view complaints belonging to another business", async () => {
  const { mock } = createMockPrisma({
    initialMerchants: [
      { id: "m-biz1", registrationNumber: "AA-01", tradeName: "Gebriel Grain", isActive: true },
      { id: "m-biz2", registrationNumber: "AA-02", tradeName: "Other Trader", isActive: true },
    ],
    initialMerchantUsers: [
      { userId: "u-owner1", merchantId: "m-biz1", roleInBusiness: "OWNER" },
    ],
    initialCases: [
      {
        id: "c2",
        referenceNumber: "CC-2026-00002",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz2",
        complainantAlias: "Consumer 00099",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
      },
    ],
  });

  const service = new BusinessCasesService(mock);

  await assert.rejects(
    () => service.getBusinessComplaint("u-owner1", "CC-2026-00002"),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );
});

test("Phase 4.2: Consumer private PII and officer-only evidence are strictly hidden", async () => {
  const { mock } = createMockPrisma({
    initialMerchants: [{ id: "m-biz1", tradeName: "Gebriel Grain", isActive: true }],
    initialMerchantUsers: [{ userId: "u-owner1", merchantId: "m-biz1", roleInBusiness: "OWNER" }],
    initialCategories: [{ id: "cat-1", nameEn: "Defective goods" }],
    initialCases: [
      {
        id: "c1",
        referenceNumber: "CC-2026-00010",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        categoryId: "cat-1",
        complainantId: "u-citizen-99",
        complainantAlias: "Consumer 00123",
        itemDescription: "25kg Rice sack",
        disputedAmount: 2250,
        currency: "ETB",
        incidentDate: new Date(),
        desiredRemedy: "Refund",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    initialEvidence: [
      { id: "e1", caseId: "c1", fileName: "shared-receipt.jpg", fileType: "image/jpeg", fileSizeBytes: 12000, isOfficerOnly: false },
      { id: "e2", caseId: "c1", fileName: "officer-confidential.pdf", fileType: "application/pdf", fileSizeBytes: 50000, isOfficerOnly: true },
    ],
  });

  const service = new BusinessCasesService(mock);
  const complaint = await service.getBusinessComplaint("u-owner1", "CC-2026-00010");

  assert.equal(complaint.complainant, "Consumer 00123");
  assert.equal(complaint.complainantId, undefined);
  assert.equal(complaint.fullName, undefined);
  assert.equal(complaint.phoneNumber, undefined);
  assert.equal(complaint.email, undefined);

  // Evidence check: only non-officer evidence is exposed
  assert.equal(complaint.evidence.length, 1);
  assert.equal(complaint.evidence[0].name, "shared-receipt.jpg");
});

test("Phase 4.2: Authorized business user can submit response and records history", async () => {
  const { mock, historyStore, messages } = createMockPrisma({
    initialMerchants: [{ id: "m-biz1", tradeName: "Gebriel Grain", isActive: true }],
    initialMerchantUsers: [{ userId: "u-emp1", merchantId: "m-biz1", roleInBusiness: "EMPLOYEE" }],
    initialCases: [
      {
        id: "c1",
        referenceNumber: "CC-2026-00010",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        complainantId: "u-citizen-1",
        complainantAlias: "Consumer 00123",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
      },
    ],
  });

  const service = new BusinessCasesService(mock);
  const res = await service.submitBusinessResponse("u-emp1", "CC-2026-00010", {
    message: "We apologize for the inconvenience and will inspect the stock.",
  });

  assert.equal(res.success, true);
  assert.ok(res.messageId);
  assert.equal(messages.size, 1);
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].handlingLevel, "business");
});

test("Phase 4.2: Settlement offer transitions case status to BUSINESS_OFFER_PENDING", async () => {
  const { mock, historyStore, offers } = createMockPrisma({
    initialMerchants: [{ id: "m-biz1", tradeName: "Gebriel Grain", isActive: true }],
    initialMerchantUsers: [{ userId: "u-owner1", merchantId: "m-biz1", roleInBusiness: "OWNER" }],
    initialCases: [
      {
        id: "c1",
        referenceNumber: "CC-2026-00010",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        complainantId: "u-citizen-1",
        complainantAlias: "Consumer 00123",
        disputedAmount: 2250,
        currency: "ETB",
        status: CaseStatus.SUBMITTED_TO_BUSINESS,
      },
    ],
  });

  const service = new BusinessCasesService(mock);
  const offerRes = await service.submitSettlementOffer("u-owner1", "CC-2026-00010", {
    offerType: SettlementType.FULL_REFUND,
    refundAmount: 2250,
    termsDescription: "Full refund in cash upon return of item within 3 days.",
    expiresInDays: 5,
  });

  assert.equal(offerRes.success, true);
  assert.equal(offerRes.status, CaseStatus.BUSINESS_OFFER_PENDING);
  assert.equal(offers.size, 1);
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].toStatus, CaseStatus.BUSINESS_OFFER_PENDING);
});

test("Phase 4.2: Cannot respond or offer on closed or escalated complaints", async () => {
  const { mock } = createMockPrisma({
    initialMerchants: [{ id: "m-biz1", tradeName: "Gebriel Grain", isActive: true }],
    initialMerchantUsers: [{ userId: "u-owner1", merchantId: "m-biz1", roleInBusiness: "OWNER" }],
    initialCases: [
      {
        id: "c-closed",
        referenceNumber: "CC-CLOSED-01",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        status: CaseStatus.RESOLVED_MUTUALLY,
      },
      {
        id: "c-escalated",
        referenceNumber: "CC-ESCALATED-01",
        route: ComplaintRoute.REGISTERED_BUSINESS,
        merchantId: "m-biz1",
        status: CaseStatus.ESCALATED_TO_GOVERNMENT,
      },
    ],
  });

  const service = new BusinessCasesService(mock);

  // Closed rejection
  await assert.rejects(
    () => service.submitBusinessResponse("u-owner1", "CC-CLOSED-01", { message: "Hello" }),
    (err) => err.response?.code === "CASE_CLOSED",
  );

  // Escalated rejection
  await assert.rejects(
    () =>
      service.submitSettlementOffer("u-owner1", "CC-ESCALATED-01", {
        offerType: SettlementType.REPLACEMENT,
        termsDescription: "New item",
      }),
    (err) => err.response?.code === "CASE_ESCALATED",
  );
});

test("Phase 4.2: Unauthorized non-business user is rejected", async () => {
  const { mock } = createMockPrisma({
    initialMerchantUsers: [], // user is not in merchantUser
  });
  const service = new BusinessCasesService(mock);

  await assert.rejects(
    () => service.listBusinessComplaints("u-random", {}),
    (err) => err.response?.code === "NOT_A_BUSINESS_USER",
  );
});

test("Phase 4.2: All BusinessCasesController routes have authorization decorators", () => {
  const proto = BusinessCasesController.prototype;
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
      `Method BusinessCasesController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

