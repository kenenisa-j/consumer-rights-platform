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
  ParticipantRole,
  RoleCode,
  SettlementType,
  TransferDirection,
  TransferStatus,
} from "@prisma/client";
import { CreateCaseDto } from "../backend/dist/modules/cases/dto/create-case.dto.js";
import { BusinessResponseDto } from "../backend/dist/modules/cases/dto/business-response.dto.js";
import { BusinessOfferDto } from "../backend/dist/modules/cases/dto/business-offer.dto.js";
import { CasesService } from "../backend/dist/modules/cases/cases.service.js";
import { ConsumerCasesService } from "../backend/dist/modules/cases/consumer-cases.service.js";
import { BusinessCasesService } from "../backend/dist/modules/cases/business-cases.service.js";

function createE2eMockPrisma() {
  const users = new Map([
    ["u-hirut", { id: "u-hirut", fullName: "Hirut Alemu", phoneNumber: "+251900000412", email: "hirut.alemu@example.com", status: "ACTIVE" }],
    ["u-yonas", { id: "u-yonas", fullName: "Yonas Gebriel", phoneNumber: "+251911000101", email: "owner@gebriel-grain.example.com", status: "ACTIVE" }],
    ["u-other", { id: "u-other", fullName: "Other Merchant", phoneNumber: "+251911000999", email: "other@merchant.example.com", status: "ACTIVE" }],
  ]);

  const offices = new Map([
    ["off-w7", { id: "off-w7", code: "WO-AKAKI-KALITY-07", nameEn: "Woreda 7 Trade Office", level: OfficeLevel.WOREDA, subcityCode: "AKAKI-KALITY", isActive: true }],
  ]);

  const merchants = new Map([
    ["m-gebriel", { id: "m-gebriel", registrationNumber: "AA-TRD-0001", tradeName: "Gebriel Grain Traders", legalName: "Gebriel Grain Traders PLC", woredaOfficeId: "off-w7", isActive: true, verificationStatus: "VERIFIED" }],
    ["m-other", { id: "m-other", registrationNumber: "AA-TRD-0002", tradeName: "Other Trader", legalName: "Other Trader PLC", woredaOfficeId: "off-w7", isActive: true, verificationStatus: "VERIFIED" }],
  ]);

  const merchantUsers = new Map([
    ["u-yonas", { id: "mu-1", merchantId: "m-gebriel", userId: "u-yonas", roleInBusiness: "OWNER", isPrimaryContact: true, merchant: merchants.get("m-gebriel") }],
    ["u-other", { id: "mu-2", merchantId: "m-other", userId: "u-other", roleInBusiness: "OWNER", isPrimaryContact: true, merchant: merchants.get("m-other") }],
  ]);

  const categories = new Map([
    ["cat-weight", { id: "cat-weight", code: "WEIGHT_MEASURE", nameEn: "Inaccurate Weights and Measures", defaultSlaDays: 3, isActive: true }],
  ]);

  const cases = new Map();
  const conversations = new Map();
  const participants = new Map();
  const messages = new Map();
  const offers = new Map();
  const transfers = [];
  const historyStore = [];
  const auditStore = [];

  let caseSeq = 1;

  const mock = {
    user: {
      findUnique: async ({ where }) => users.get(where.id) || null,
      findFirst: async ({ where }) => Array.from(users.values()).find((u) => (!where?.id || u.id === where.id)) || null,
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
      findFirst: async ({ where }) => Array.from(offices.values()).find((o) => (!where?.id || o.id === where.id)) || null,
    },
    merchant: {
      findUnique: async ({ where }) => merchants.get(where.id) || Array.from(merchants.values()).find((m) => m.registrationNumber === where.registrationNumber) || null,
      findFirst: async ({ where }) => {
        return Array.from(merchants.values()).find((m) => {
          if (where?.id && m.id === where.id) return true;
          if (where?.registrationNumber && m.registrationNumber === where.registrationNumber) return true;
          if (where?.OR) {
            return where.OR.some((cond) => (cond.id && m.id === cond.id) || (cond.registrationNumber && m.registrationNumber === cond.registrationNumber));
          }
          return false;
        }) || null;
      },
    },
    merchantUser: {
      findFirst: async ({ where, include }) => {
        const mu = merchantUsers.get(where.userId);
        if (!mu) return null;
        const res = { ...mu };
        if (include?.merchant) res.merchant = merchants.get(mu.merchantId);
        return res;
      },
    },
    complaintCategory: {
      findUnique: async ({ where }) => categories.get(where.id) || null,
      findFirst: async ({ where }) => {
        return Array.from(categories.values()).find((c) => {
          if (where?.id && c.id === where.id) return true;
          if (where?.code && c.code === where.code) return true;
          if (where?.OR) {
            return where.OR.some((cond) => (cond.id && c.id === cond.id) || (cond.code && c.code === cond.code));
          }
          return false;
        }) || null;
      },
    },
    case: {
      create: async ({ data }) => {
        const id = `c-${Date.now()}-${caseSeq++}`;
        const referenceNumber = `CC-2026-${String(caseSeq).padStart(5, "0")}`;
        const record = {
          id,
          referenceNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        cases.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find((x) => x.id === where.id || x.referenceNumber === where.referenceNumber);
        if (!c) return null;
        return mock.case._enrichCase(c, include);
      },
      findFirst: async ({ where, include }) => {
        const list = Array.from(cases.values());
        const match = list.find((c) => {
          if (where?.id && c.id !== where.id) return false;
          if (where?.referenceNumber && c.referenceNumber !== where.referenceNumber) return false;
          if (where?.complainantId && c.complainantId !== where.complainantId) return false;
          if (where?.merchantId && c.merchantId !== where.merchantId) return false;
          if (where?.route && c.route !== where.route) return false;
          return true;
        });
        if (!match) return null;
        return mock.case._enrichCase(match, include);
      },
      findMany: async ({ where, select, include }) => {
        let list = Array.from(cases.values());
        if (where?.merchantId) list = list.filter((c) => c.merchantId === where.merchantId);
        if (where?.complainantId) list = list.filter((c) => c.complainantId === where.complainantId);
        if (where?.route) list = list.filter((c) => c.route === where.route);
        if (where?.status) list = list.filter((c) => c.status === where.status);
        if (where?.categoryId) list = list.filter((c) => c.categoryId === where.categoryId);

        return list.map((c) => {
          if (select) {
            const res = {};
            for (const k of Object.keys(select)) {
              if (k === "category") res.category = categories.get(c.categoryId);
              else if (k === "merchant") res.merchant = merchants.get(c.merchantId);
              else if (k === "settlementOffers") {
                res.settlementOffers = Array.from(offers.values()).filter((o) => o.caseId === c.id && o.status === OfferStatus.PENDING);
              } else res[k] = c[k];
            }
            return res;
          }
          return mock.case._enrichCase(c, include);
        });
      },
      update: async ({ where, data }) => {
        const c = cases.get(where.id);
        const updated = { ...c, ...data, updatedAt: new Date() };
        cases.set(where.id, updated);
        return updated;
      },
      count: async ({ where }) => {
        let list = Array.from(cases.values());
        if (where?.complainantId) list = list.filter((c) => c.complainantId === where.complainantId);
        if (where?.merchantId) list = list.filter((c) => c.merchantId === where.merchantId);
        return list.length;
      },
      _enrichCase: (c, include) => {
        const res = { ...c };
        if (include?.category) res.category = categories.get(c.categoryId);
        if (include?.merchant) res.merchant = merchants.get(c.merchantId);
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId);
        if (include?.evidenceFiles) res.evidenceFiles = [];
        if (include?.history) res.history = historyStore.filter((h) => h.caseId === c.id);
        if (include?.transfers) {
          res.transfers = transfers.filter((t) => t.caseId === c.id).map((t) => ({
            ...t,
            fromOffice: offices.get(t.fromOfficeId),
            toOffice: offices.get(t.toOfficeId),
          }));
        }
        if (include?.conversations) {
          res.conversations = Array.from(conversations.values())
            .filter((cv) => cv.caseId === c.id)
            .map((cv) => ({
              ...cv,
              messages: Array.from(messages.values()).filter((m) => m.conversationId === cv.id),
              offers: Array.from(offers.values()).filter((o) => o.conversationId === cv.id),
            }));
        }
        if (include?.settlementOffers) {
          res.settlementOffers = Array.from(offers.values()).filter((o) => o.caseId === c.id);
        }
        return res;
      },
    },
    conversation: {
      findFirst: async ({ where }) => {
        return Array.from(conversations.values()).find((cv) => cv.caseId === where.caseId && (!where.kind || cv.kind === where.kind)) || null;
      },
      create: async ({ data }) => {
        const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, createdAt: new Date(), ...data };
        conversations.set(id, record);
        return record;
      },
    },
    conversationParticipant: {
      upsert: async ({ where, create }) => {
        const key = `${where.conversationId_userId.conversationId}_${where.conversationId_userId.userId}`;
        if (!participants.has(key)) {
          participants.set(key, { ...create, joinedAt: new Date() });
        }
        return participants.get(key);
      },
    },
    message: {
      create: async ({ data }) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, sentAt: new Date(), ...data };
        messages.set(id, record);
        return record;
      },
    },
    settlementOffer: {
      create: async ({ data }) => {
        const id = `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, createdAt: new Date(), ...data };
        offers.set(id, record);
        return record;
      },
      findFirst: async ({ where }) => {
        return Array.from(offers.values()).find((o) => {
          if (where.id && o.id !== where.id) return false;
          if (where.caseId && o.caseId !== where.caseId) return false;
          if (where.status && o.status !== where.status) return false;
          return true;
        }) || null;
      },
      update: async ({ where, data }) => {
        const o = offers.get(where.id);
        const updated = { ...o, ...data };
        offers.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const [id, o] of offers.entries()) {
          if (o.caseId === where.caseId && (!where.status || o.status === where.status)) {
            offers.set(id, { ...o, ...data });
            count++;
          }
        }
        return { count };
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
        const h = { id: `h-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
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

  return { mock, cases, conversations, messages, offers, transfers, historyStore, auditStore };
}

test("Phase 5 E2E: Complete Consumer-to-Business complaint lifecycle", async () => {
  const { mock, cases, offers, historyStore } = createE2eMockPrisma();

  const casesService = new CasesService(mock);
  const consumerCasesService = new ConsumerCasesService(mock);
  const businessCasesService = new BusinessCasesService(mock);

  // --------------------------------------------------------------------------
  // Step 1: Consumer logs in as Hirut Alemu ('u-hirut')
  // Step 2: Consumer files a Route B complaint against Gebriel Grain Traders ('m-gebriel')
  // --------------------------------------------------------------------------
  const createDto = plainToInstance(CreateCaseDto, {
    route: ComplaintRoute.REGISTERED_BUSINESS,
    merchantId: "m-gebriel",
    categoryId: "cat-weight",
    incidentDate: "2026-11-01T00:00:00.000Z",
    itemDescription: "White rice, one 25 kg sack sold short by 4 kg with small stones",
    disputedAmount: 2250,
    currency: "ETB",
    desiredRemedy: "A full refund of 2,250 ETB",
    receiptAvailable: true,
  });

  const validationErrors = await validate(createDto);
  assert.equal(validationErrors.length, 0, "CreateCaseDto must pass validation");

  const createdCase = await casesService.createCase("u-hirut", createDto);

  // Step 3: Confirm saved with valid reference number
  assert.ok(createdCase.id, "Case must have an ID");
  assert.match(createdCase.referenceNumber, /^CC-2026-\d{5}$/, "Valid complaint reference");

  // Step 4: Confirm routed to correct merchant with initial status
  assert.equal(createdCase.route, ComplaintRoute.REGISTERED_BUSINESS);
  assert.equal(createdCase.merchantId, "m-gebriel");
  assert.equal(createdCase.currentOfficeId, null, "Route B starts with no government office");
  assert.equal(createdCase.status, CaseStatus.SUBMITTED_TO_BUSINESS);
  assert.equal(createdCase.complainantAlias, "Consumer 00001", "Citizen alias assigned");

  // Confirm initial CaseHistory logged
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].handlingLevel, "business");
  assert.equal(historyStore[0].toStatus, CaseStatus.SUBMITTED_TO_BUSINESS);

  // --------------------------------------------------------------------------
  // Step 5: Log in as business owner Yonas Gebriel ('u-yonas')
  // Step 6: Confirm complaint appears in Gebriel Grain Traders' inbox
  // --------------------------------------------------------------------------
  const bizInbox = await businessCasesService.listBusinessComplaints("u-yonas", {});
  assert.equal(bizInbox.length, 1, "Merchant inbox must contain the filed complaint");
  assert.equal(bizInbox[0].reference, createdCase.referenceNumber);
  assert.equal(bizInbox[0].complainant, "Consumer 00001");
  assert.equal(bizInbox[0].status, CaseStatus.SUBMITTED_TO_BUSINESS);

  // Isolation check: another merchant cannot see this complaint in their inbox
  const otherInbox = await businessCasesService.listBusinessComplaints("u-other", {});
  assert.equal(otherInbox.length, 0, "Other merchants cannot see Gebriel Grain complaints");

  // --------------------------------------------------------------------------
  // Step 7: Open complaint details from business portal
  // Step 8: Strict privacy verification - no citizen PII exposed
  // --------------------------------------------------------------------------
  const bizDetails = await businessCasesService.getBusinessComplaint("u-yonas", createdCase.referenceNumber);
  assert.equal(bizDetails.reference, createdCase.referenceNumber);
  assert.equal(bizDetails.complainant, "Consumer 00001");
  assert.equal(bizDetails.disputedAmount, 2250);
  assert.equal(bizDetails.currency, "ETB");

  // Critical privacy assertions: citizen's real name, phone, email, and ID MUST NEVER appear
  assert.equal(bizDetails.complainantId, undefined);
  assert.equal(bizDetails.fullName, undefined);
  assert.equal(bizDetails.phoneNumber, undefined);
  assert.equal(bizDetails.email, undefined);

  // --------------------------------------------------------------------------
  // Step 9: Business submits official response and proposes settlement offer
  // --------------------------------------------------------------------------
  const responseDto = plainToInstance(BusinessResponseDto, {
    message: "We apologize for the inconvenience. We have verified the sack with our supplier.",
  });
  assert.equal((await validate(responseDto)).length, 0);

  const responseResult = await businessCasesService.submitBusinessResponse(
    "u-yonas",
    createdCase.referenceNumber,
    responseDto,
  );
  assert.equal(responseResult.success, true);
  assert.ok(responseResult.messageId);

  const offerDto = plainToInstance(BusinessOfferDto, {
    offerType: SettlementType.FULL_REFUND,
    refundAmount: 2250,
    termsDescription: "Full refund of 2,250 ETB in cash at stall within 2 business days.",
    expiresInDays: 3,
  });
  assert.equal((await validate(offerDto)).length, 0);

  const offerResult = await businessCasesService.submitSettlementOffer(
    "u-yonas",
    createdCase.referenceNumber,
    offerDto,
  );
  assert.equal(offerResult.success, true);
  assert.equal(offerResult.status, CaseStatus.BUSINESS_OFFER_PENDING);

  // Verify complaint status updated in storage
  assert.equal(cases.get(createdCase.id).status, CaseStatus.BUSINESS_OFFER_PENDING);

  // --------------------------------------------------------------------------
  // Step 10: Consumer logs back in as Hirut Alemu ('u-hirut')
  // Step 11: Confirm response and pending offer are visible in Consumer Portal
  // Step 12: Confirm complaint history and status are updated correctly
  // --------------------------------------------------------------------------
  const consumerCase = await consumerCasesService.getByReference("u-hirut", createdCase.referenceNumber);
  assert.equal(consumerCase.reference, createdCase.referenceNumber);
  assert.equal(consumerCase.status.tone, "warn");
  assert.equal(consumerCase.official, "BUSINESS OFFER PENDING");

  // Thread verification: consumer sees business message
  assert.ok(consumerCase.thread.length >= 1, "Thread contains business response");
  assert.equal(consumerCase.thread[0].who, "Gebriel Grain Traders");
  assert.ok(consumerCase.thread[0].text.includes("apologize for the inconvenience"));

  // Offers verification: consumer sees active settlement offer
  assert.equal(consumerCase.offers.length, 1);
  const receivedOffer = consumerCase.offers[0];
  assert.equal(receivedOffer.offerType, SettlementType.FULL_REFUND);
  assert.equal(receivedOffer.refundAmount, 2250);
  assert.equal(receivedOffer.isPending, true);

  // History timeline contains both the filing, the reply, and the offer
  assert.ok(consumerCase.updates.length >= 2);

  // --------------------------------------------------------------------------
  // Step 13: Consumer accepts the settlement offer
  // Confirm complaint transitions to RESOLVED_MUTUALLY
  // --------------------------------------------------------------------------
  const acceptResult = await consumerCasesService.acceptOffer(
    "u-hirut",
    createdCase.referenceNumber,
    receivedOffer.id,
  );
  assert.equal(acceptResult.success, true);
  assert.equal(acceptResult.status, CaseStatus.RESOLVED_MUTUALLY);
  assert.equal(offers.get(receivedOffer.id).status, OfferStatus.ACCEPTED);
  assert.equal(cases.get(createdCase.id).status, CaseStatus.RESOLVED_MUTUALLY);

  // History includes mutual resolution
  const finalHistory = historyStore[historyStore.length - 1];
  assert.equal(finalHistory.toStatus, CaseStatus.RESOLVED_MUTUALLY);
});

test("Phase 5 E2E: Offer rejection and government escalation workflow", async () => {
  const { mock, cases, offers, transfers } = createE2eMockPrisma();

  const casesService = new CasesService(mock);
  const consumerCasesService = new ConsumerCasesService(mock);
  const businessCasesService = new BusinessCasesService(mock);

  // 1. Consumer files complaint against Gebriel Grain Traders
  const createDto = plainToInstance(CreateCaseDto, {
    route: ComplaintRoute.REGISTERED_BUSINESS,
    merchantId: "m-gebriel",
    categoryId: "cat-weight",
    incidentDate: "2026-11-01T00:00:00.000Z",
    itemDescription: "25 kg sack of rice weighing 21 kg",
    disputedAmount: 2250,
    currency: "ETB",
    desiredRemedy: "Refund",
    receiptAvailable: true,
  });
  const c = await casesService.createCase("u-hirut", createDto);

  // 2. Business offers partial refund
  await businessCasesService.submitSettlementOffer("u-yonas", c.referenceNumber, {
    offerType: SettlementType.PARTIAL_REFUND,
    refundAmount: 500,
    termsDescription: "500 ETB voucher",
  });
  assert.equal(cases.get(c.id).status, CaseStatus.BUSINESS_OFFER_PENDING);

  // 3. Consumer rejects insufficient offer
  const activeOffer = Array.from(offers.values()).find((o) => o.caseId === c.id);
  const rejectResult = await consumerCasesService.rejectOffer("u-hirut", c.referenceNumber, activeOffer.id);
  assert.equal(rejectResult.success, true);
  assert.equal(rejectResult.status, CaseStatus.SUBMITTED_TO_BUSINESS);
  assert.equal(offers.get(activeOffer.id).status, OfferStatus.REJECTED);

  // 4. Consumer escalates complaint to Woreda Trade Office
  const escalateResult = await consumerCasesService.escalateToGovernment("u-hirut", c.referenceNumber, {
    reason: "Merchant only offered a partial voucher, which is insufficient.",
  });
  assert.equal(escalateResult.success, true);
  assert.equal(escalateResult.status, CaseStatus.ESCALATED_TO_GOVERNMENT);
  assert.equal(escalateResult.holdingOffice, "Woreda 7 Trade Office");

  // 5. Transfer record created with UPWARD_ESCALATION
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].direction, TransferDirection.UPWARD_ESCALATION);
  assert.equal(transfers[0].status, TransferStatus.PENDING_ACCEPTANCE);
  assert.equal(transfers[0].toOfficeId, "off-w7");

  // 6. Business can no longer make direct settlements once escalated
  await assert.rejects(
    () =>
      businessCasesService.submitSettlementOffer("u-yonas", c.referenceNumber, {
        offerType: SettlementType.FULL_REFUND,
        refundAmount: 2250,
        termsDescription: "Too late refund",
      }),
    (err) => err.response?.code === "CASE_ESCALATED",
  );
});

