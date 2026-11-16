import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CaseStatus,
  ComplaintRoute,
  OfficeLevel,
  RoleCode,
} from "@prisma/client";
import { CreateTipDto } from "../backend/dist/modules/tips/dto/create-tip.dto.js";
import { TrackTipDto } from "../backend/dist/modules/tips/dto/track-tip.dto.js";
import { PlanVisitDto } from "../backend/dist/modules/tips/dto/plan-visit.dto.js";
import { ForwardTipDto } from "../backend/dist/modules/tips/dto/forward-tip.dto.js";
import { ConvertTipDto } from "../backend/dist/modules/tips/dto/convert-tip.dto.js";
import { CloseTipDto } from "../backend/dist/modules/tips/dto/close-tip.dto.js";
import { TipsService } from "../backend/dist/modules/tips/tips.service.js";
import { TipsController } from "../backend/dist/modules/tips/tips.controller.js";
import { GovernmentTipsController } from "../backend/dist/modules/tips/government-tips.controller.js";
import {
  generateFollowUpToken,
  hashFollowUpToken,
  verifyFollowUpToken,
} from "../backend/dist/modules/tips/tips.helpers.js";

const mockOffices = [
  { id: "off-bureau", code: "AA-BUREAU", nameEn: "City Bureau", level: OfficeLevel.CITY_BUREAU, isActive: true },
  { id: "off-sc-bole", code: "SC-BOLE", nameEn: "Bole Sub-City", level: OfficeLevel.SUBCITY, subcityCode: "BOLE", parentOfficeId: "off-bureau", isActive: true },
  { id: "off-w-bole01", code: "WO-BOLE-01", nameEn: "Bole Woreda 01", level: OfficeLevel.WOREDA, woredaCode: "01", subcityCode: "BOLE", parentOfficeId: "off-sc-bole", isActive: true },
  { id: "off-w-bole02", code: "WO-BOLE-02", nameEn: "Bole Woreda 02", level: OfficeLevel.WOREDA, woredaCode: "02", subcityCode: "BOLE", parentOfficeId: "off-sc-bole", isActive: true },
  { id: "off-w-akaki07", code: "WO-AKAKI-07", nameEn: "Akaki Woreda 07", level: OfficeLevel.WOREDA, woredaCode: "07", subcityCode: "AKAKI-KALITY", isActive: true },
];

const mockUsers = [
  {
    id: "u-bureau-officer",
    fullName: "Bureau Director",
    roles: [{ role: { code: RoleCode.BUREAU_OFFICER } }],
    offices: [{ officeId: "off-bureau", isPrimary: true, isActive: true, office: mockOffices[0] }],
    status: "ACTIVE",
  },
  {
    id: "u-sc-coordinator",
    fullName: "Subcity Coordinator",
    roles: [{ role: { code: RoleCode.SUBCITY_COORDINATOR } }],
    offices: [{ officeId: "off-sc-bole", isPrimary: true, isActive: true, office: mockOffices[1] }],
    status: "ACTIVE",
  },
  {
    id: "u-woreda1-officer",
    fullName: "Woreda 01 Officer",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-w-bole01", isPrimary: true, isActive: true, office: mockOffices[2] }],
    status: "ACTIVE",
  },
  {
    id: "u-woreda2-officer",
    fullName: "Woreda 02 Officer",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-w-bole02", isPrimary: true, isActive: true, office: mockOffices[3] }],
    status: "ACTIVE",
  },
];

const mockCategories = [
  { id: "cat-goods", code: "GOODS", nameEn: "Goods & Price Ceilings", isActive: true, defaultSlaDays: 5 },
  { id: "cat-weights", code: "WEIGHTS", nameEn: "Weights & Measures", isActive: true, defaultSlaDays: 5 },
];

function createMockPrisma({
  initialReports = [],
  initialAuditLogs = [],
  initialCases = [],
  initialHistory = [],
} = {}) {
  const offices = new Map(mockOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(mockUsers.map((u) => [u.id, { ...u }]));
  const categories = new Map(mockCategories.map((c) => [c.id, { ...c }]));
  const reports = new Map(initialReports.map((r) => [r.id, { ...r }]));
  const auditLogs = [...initialAuditLogs];
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const historyStore = [...initialHistory];

  const mock = {
    user: {
      findUnique: async ({ where, include }) => {
        const u = users.get(where.id);
        if (!u) return null;
        const res = { ...u };
        if (include?.roles) res.roles = u.roles || [];
        if (include?.offices) {
          res.offices = (u.offices || []).map((o) => ({ ...o, office: offices.get(o.officeId) }));
        }
        return res;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
      findFirst: async ({ where }) => {
        const all = Array.from(offices.values());
        return all.find((o) => {
          if (where.isActive !== undefined && o.isActive !== where.isActive) return false;
          if (where.level && o.level !== where.level) return false;
          if (where.subcityCode && o.subcityCode !== where.subcityCode) return false;
          if (where.woredaCode && o.woredaCode !== where.woredaCode) return false;
          if (where.OR) {
            return where.OR.some((cond) => {
              if (cond.woredaCode && cond.subcityCode) {
                return o.woredaCode === cond.woredaCode && o.subcityCode === cond.subcityCode;
              }
              if (cond.subcityCode) return o.subcityCode === cond.subcityCode;
              if (cond.nameEn?.contains) {
                return o.nameEn.toLowerCase().includes(cond.nameEn.contains.toLowerCase());
              }
              return false;
            });
          }
          return true;
        }) || null;
      },
    },
    complaintCategory: {
      findFirst: async ({ where }) => {
        const all = Array.from(categories.values());
        if (where.id) return categories.get(where.id) || null;
        if (where.OR) {
          for (const item of all) {
            for (const cond of where.OR) {
              if (cond.id && item.id === cond.id) return item;
              if (cond.code && item.code === cond.code) return item;
              if (cond.nameEn?.contains && item.nameEn.toLowerCase().includes(cond.nameEn.contains.toLowerCase())) return item;
              if (cond.isActive !== undefined && item.isActive === cond.isActive) return item;
            }
          }
        }
        return all[0] || null;
      },
    },
    anonymousReport: {
      count: async () => reports.size,
      create: async ({ data }) => {
        const rec = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          convertedCaseId: data.convertedCaseId || null,
        };
        reports.set(data.id, rec);
        return rec;
      },
      findUnique: async ({ where, include }) => {
        const r = reports.get(where.id);
        if (!r) return null;
        const res = { ...r };
        if (include?.destinationOffice) res.destinationOffice = offices.get(r.destinationOfficeId) || null;
        if (include?.convertedCase) res.convertedCase = r.convertedCaseId ? cases.get(r.convertedCaseId) || null : null;
        if (include?.auditLogs) {
          res.auditLogs = auditLogs
            .filter((l) => l.reportId === r.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
        return res;
      },
      findMany: async ({ where, include }) => {
        let list = Array.from(reports.values());
        if (where?.destinationOfficeId) list = list.filter((r) => r.destinationOfficeId === where.destinationOfficeId);
        if (where?.destinationOffice?.subcityCode) {
          list = list.filter((r) => {
            const off = offices.get(r.destinationOfficeId);
            return off?.subcityCode === where.destinationOffice.subcityCode;
          });
        }
        if (where?.status) list = list.filter((r) => r.status === where.status);
        return list.map((r) => {
          const res = { ...r };
          if (include?.destinationOffice) res.destinationOffice = offices.get(r.destinationOfficeId) || null;
          if (include?.convertedCase) res.convertedCase = r.convertedCaseId ? cases.get(r.convertedCaseId) || null : null;
          return res;
        });
      },
      update: async ({ where, data }) => {
        const r = reports.get(where.id);
        if (!r) throw new Error("Report not found");
        const updated = { ...r, ...data, updatedAt: new Date() };
        reports.set(where.id, updated);
        return updated;
      },
    },
    anonymousReportAuditLog: {
      create: async ({ data }) => {
        const log = { id: `log-${Date.now()}-${Math.random()}`, ...data, timestamp: new Date() };
        auditLogs.push(log);
        return log;
      },
      findMany: async ({ where }) => auditLogs.filter((l) => l.reportId === where.reportId),
    },
    case: {
      count: async () => cases.size,
      create: async ({ data }) => {
        const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        cases.set(id, record);
        return record;
      },
      findUnique: async ({ where }) => cases.get(where.id) || null,
    },
    caseHistory: {
      create: async ({ data }) => {
        const rec = { id: `hist-${Date.now()}`, ...data, createdAt: new Date() };
        historyStore.push(rec);
        return rec;
      },
    },
    $transaction: async (fn) => fn(mock),
  };

  return { mock, reports, auditLogs, cases, historyStore };
}

test("Phase 7: Follow-up token generator creates 8-char XXXX-XXXX format and SHA-256 hash", () => {
  for (let i = 0; i < 100; i++) {
    const token = generateFollowUpToken();
    assert.match(token, /^[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}$/);
    assert.equal(token.length, 9);
    assert.equal(token[4], "-");
    const hash = hashFollowUpToken(token);
    assert.equal(hash.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(hash));
    assert.equal(verifyFollowUpToken(token, hash), true);
  }

  const sample = generateFollowUpToken();
  const sampleHash = hashFollowUpToken(sample);
  assert.equal(verifyFollowUpToken(sample.toLowerCase(), sampleHash), true);
  assert.equal(verifyFollowUpToken(sample.replace("-", ""), sampleHash), true);
  assert.equal(verifyFollowUpToken("WRONG-CODE", sampleHash), false);
});

test("Phase 7: DTO validation accepts valid payloads and rejects invalid fields", async () => {
  const validCreate = plainToInstance(CreateTipDto, {
    category: "Price Gouging",
    subcity: "Bole",
    woreda: "01",
    marketLocation: "Market 097 near Gelan road",
    description: "Sugar sold at 160 ETB when the official price ceiling is 125 ETB.",
  });
  const createErrors = await validate(validCreate);
  assert.equal(createErrors.length, 0);

  const invalidTrack = plainToInstance(TrackTipDto, {
    reference: "INVALID-REF",
    code: "SHORT",
  });
  const trackErrors = await validate(invalidTrack);
  assert.ok(trackErrors.length >= 1);

  const validTrack = plainToInstance(TrackTipDto, {
    reference: "TIP-2026-00045",
    code: "Q7MD-42KX",
  });
  const validTrackErrors = await validate(validTrack);
  assert.equal(validTrackErrors.length, 0);
});

test("Phase 7: Public anonymous tip submission generates token and stores only hash", async () => {
  const { mock, reports, auditLogs } = createMockPrisma();
  const service = new TipsService(mock);

  const result = await service.submitTip({
    category: "Price Gouging",
    subcity: "Bole",
    woreda: "01",
    marketLocation: "Bole Bulbula Market",
    description: "Teff sold 20% above official ceiling price.",
  });

  assert.match(result.reference, /^TIP-\d{4}-\d{5}$/);
  assert.match(result.trackingCode, /^[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}$/);
  assert.ok(result.destinationOffice.includes("Bole"));

  // Verify stored database record
  const stored = reports.get(result.reference);
  assert.ok(stored);
  assert.equal(stored.category, "Price Gouging");
  assert.equal(stored.status, "received");
  // CRITICAL PRIVACY: raw tracking code is NOT stored anywhere in the database record
  assert.notEqual(stored.trackingTokenHash, result.trackingCode);
  assert.equal(stored.trackingTokenHash, hashFollowUpToken(result.trackingCode));

  // Verify initial audit log entry
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].reportId, result.reference);
  assert.equal(auditLogs[0].actionCode, "SUBMITTED");
  assert.equal(auditLogs[0].newStatus, "received");
  assert.equal(auditLogs[0].previousStatus, null);
});

test("Phase 7: Public tracking verifies valid token and uniformly rejects mismatched token with 404", async () => {
  const rawToken = "ABCD-EFGH";
  const storedHash = hashFollowUpToken(rawToken);
  const initialReports = [
    {
      id: "TIP-2026-00001",
      category: "Expired Goods",
      marketLocation: "Bole Kiosk 4",
      description: "Expired milk packs on front shelf.",
      destinationOfficeId: "off-w-bole01",
      trackingTokenHash: storedHash,
      status: "under_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  // Valid track
  const tracked = await service.trackTip({ reference: "TIP-2026-00001", code: rawToken });
  assert.equal(tracked.reference, "TIP-2026-00001");
  assert.equal(tracked.status, "under_review");
  assert.equal(tracked.label, "Under review");
  assert.equal(tracked.where, "Bole Kiosk 4");
  assert.equal(tracked.isClosed, false);
  // Privacy check: tracking view must not contain internal notes or officer identity
  assert.equal((tracked).internalNotes, undefined);
  assert.equal((tracked).officerId, undefined);

  // Uniform 404 on mismatched token (does not reveal whether tip exists)
  await assert.rejects(
    async () => service.trackTip({ reference: "TIP-2026-00001", code: "ZZZZ-9999" }),
    (err) => err.status === 404 && err.response?.code === "TIP_NOT_FOUND",
  );

  // Uniform 404 on non-existent reference
  await assert.rejects(
    async () => service.trackTip({ reference: "TIP-2026-99999", code: rawToken }),
    (err) => err.status === 404 && err.response?.code === "TIP_NOT_FOUND",
  );
});

test("Phase 7: Officer jurisdiction scoping restricts tip visibility to administrative office", async () => {
  const initialReports = [
    {
      id: "TIP-2026-00010",
      category: "Price Gouging",
      marketLocation: "Bole Woreda 1 Shop",
      description: "Sugar above ceiling",
      destinationOfficeId: "off-w-bole01",
      trackingTokenHash: "hash1",
      status: "received",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "TIP-2026-00020",
      category: "Wrong Scales",
      marketLocation: "Bole Woreda 2 Stall",
      description: "Inaccurate scales",
      destinationOfficeId: "off-w-bole02",
      trackingTokenHash: "hash2",
      status: "received",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  // Woreda 1 officer sees only Woreda 1 tips
  const woreda1List = await service.listGovernmentTips("u-woreda1-officer", {});
  assert.equal(woreda1List.tips.length, 1);
  assert.equal(woreda1List.tips[0].reference, "TIP-2026-00010");

  // Woreda 1 officer can read their own tip
  const woreda1Tip = await service.getGovernmentTip("u-woreda1-officer", "TIP-2026-00010");
  assert.equal(woreda1Tip.tip.reference, "TIP-2026-00010");

  // ANTI-PROBING: Woreda 1 officer attempting to read Woreda 2 tip receives 404 (not 403)
  await assert.rejects(
    async () => service.getGovernmentTip("u-woreda1-officer", "TIP-2026-00020"),
    (err) => err.status === 404 && err.response?.code === "TIP_NOT_FOUND",
  );

  // Sub-City coordinator sees tips across both subordinate Woredas in Bole
  const scList = await service.listGovernmentTips("u-sc-coordinator", {});
  assert.equal(scList.tips.length, 2);

  // Bureau director sees city-wide tips
  const bureauList = await service.listGovernmentTips("u-bureau-officer", {});
  assert.equal(bureauList.tips.length, 2);
});

test("Phase 7: Sub-City coordinator forwards tip to subordinate Woreda", async () => {
  const initialReports = [
    {
      id: "TIP-2026-00030",
      category: "Price Gouging",
      marketLocation: "Bole Market",
      description: "Edible oil withheld",
      destinationOfficeId: "off-sc-bole",
      trackingTokenHash: "hash3",
      status: "received",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock, reports, auditLogs } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  const forwardRes = await service.forwardTip("u-sc-coordinator", "TIP-2026-00030", {
    destinationOfficeId: "off-w-bole01",
    notes: "Please inspect this stall immediately.",
  });

  assert.equal(forwardRes.success, true);
  assert.equal(forwardRes.status, "under_review");

  const updated = reports.get("TIP-2026-00030");
  assert.equal(updated.destinationOfficeId, "off-w-bole01");
  assert.equal(updated.status, "under_review");

  const forwardLog = auditLogs.find((l) => l.actionCode === "FORWARDED_TO_WOREDA");
  assert.ok(forwardLog);
  assert.equal(forwardLog.newStatus, "under_review");
  assert.ok(forwardLog.internalNotes.includes("u-sc-coordinator"));
  assert.ok(forwardLog.internalNotes.includes("Please inspect"));
});

test("Phase 7: Woreda officer plans inspection visit", async () => {
  const initialReports = [
    {
      id: "TIP-2026-00040",
      category: "False Scales",
      marketLocation: "Bole Woreda 1 Market 097",
      description: "Scale is underweight by 150g per kg.",
      destinationOfficeId: "off-w-bole01",
      trackingTokenHash: "hash4",
      status: "under_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock, reports, auditLogs } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  const visitRes = await service.planVisit("u-woreda1-officer", "TIP-2026-00040", {
    scheduledDate: "2026-11-20",
    assignedOfficer: "Dawit Kebede",
    notes: "Conduct unannounced weight audit with calibrated 1kg weight.",
  });

  assert.equal(visitRes.success, true);
  assert.equal(visitRes.status, "follow_up_planned");

  const updated = reports.get("TIP-2026-00040");
  assert.equal(updated.status, "follow_up_planned");

  const visitLog = auditLogs.find((l) => l.actionCode === "VISIT_PLANNED");
  assert.ok(visitLog);
  assert.equal(visitLog.newStatus, "follow_up_planned");
  assert.ok(visitLog.internalNotes.includes("u-woreda1-officer"));
  assert.ok(visitLog.internalNotes.includes("Dawit Kebede"));
});

test("Phase 7: Tip-to-case conversion creates formal Direct Government complaint with Anonymous alias and prevents duplicate conversion", async () => {
  const initialReports = [
    {
      id: "TIP-2026-00050",
      category: "Expired Goods",
      marketLocation: "Bole Woreda 1 Kiosk",
      description: "Unsafe baby formula sold past expiration date.",
      destinationOfficeId: "off-w-bole01",
      trackingTokenHash: "hash5",
      status: "follow_up_planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock, reports, cases, auditLogs, historyStore } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  const convertRes = await service.convertToCase("u-woreda1-officer", "TIP-2026-00050", {
    notes: "Inspection verified expired formula. Opening formal enforcement case.",
  });

  assert.equal(convertRes.success, true);
  assert.match(convertRes.caseReference, /^CC-\d{4}-\d{5}$/);

  // Check the created formal case
  const createdCase = cases.get(convertRes.caseId);
  assert.ok(createdCase);
  assert.equal(createdCase.route, ComplaintRoute.DIRECT_GOVERNMENT);
  assert.equal(createdCase.complainantAlias, "Anonymous Reporter");
  assert.equal(createdCase.status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(createdCase.currentOfficeId, "off-w-bole01");

  // Check the tip is linked and updated
  const updatedTip = reports.get("TIP-2026-00050");
  assert.equal(updatedTip.convertedCaseId, createdCase.id);
  assert.equal(updatedTip.status, "converted_to_case");

  // Verify audit log and case history
  const convertLog = auditLogs.find((l) => l.actionCode === "CONVERTED_TO_CASE");
  assert.ok(convertLog);
  assert.ok(historyStore.length >= 1);

  // DUPLICATE CONVERSION REJECTION: second attempt must fail with TIP_ALREADY_CONVERTED
  await assert.rejects(
    async () => service.convertToCase("u-woreda1-officer", "TIP-2026-00050", {}),
    (err) => err.status === 400 && err.response?.code === "TIP_ALREADY_CONVERTED",
  );
});

test("Phase 7: Closing a tip sets terminal status and blocks subsequent actions", async () => {
  const initialReports = [
    {
      id: "TIP-2026-00060",
      category: "Price Gouging",
      marketLocation: "Bole Shop 9",
      description: "Reported price discrepancy",
      destinationOfficeId: "off-w-bole01",
      trackingTokenHash: "hash6",
      status: "follow_up_planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const { mock, reports, auditLogs } = createMockPrisma({ initialReports });
  const service = new TipsService(mock);

  const closeRes = await service.closeTip("u-woreda1-officer", "TIP-2026-00060", {
    result: "closed_action_taken",
    notes: "Merchant adjusted prices back to official ceiling list and signed compliance warning.",
  });

  assert.equal(closeRes.success, true);
  assert.equal(closeRes.status, "closed_action_taken");

  const updated = reports.get("TIP-2026-00060");
  assert.equal(updated.status, "closed_action_taken");

  const closeLog = auditLogs.find((l) => l.actionCode === "TIP_CLOSED");
  assert.ok(closeLog);

  // Subsequent actions on closed tip must be rejected
  await assert.rejects(
    async () => service.planVisit("u-woreda1-officer", "TIP-2026-00060", { scheduledDate: "2026-11-21", assignedOfficer: "Meron", notes: "Test" }),
    (err) => err.status === 400 && err.response?.code === "TIP_ALREADY_CLOSED",
  );

  await assert.rejects(
    async () => service.closeTip("u-woreda1-officer", "TIP-2026-00060", { result: "closed_no_action" }),
    (err) => err.status === 400 && err.response?.code === "TIP_ALREADY_CLOSED",
  );
});

test("Phase 7: GovernmentTipsController and TipsController route authorization guards", () => {
  const govProto = GovernmentTipsController.prototype;
  const govMethods = Object.getOwnPropertyNames(govProto).filter(
    (m) => m !== "constructor" && typeof govProto[m] === "function",
  );
  assert.equal(govMethods.length, 6);
  for (const method of govMethods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", govProto[method]) ||
      Reflect.hasMetadata("requirePermission", govProto[method]);
    assert.ok(hasPermission, `GovernmentTipsController.${method} missing @RequirePermission`);
  }

  const publicProto = TipsController.prototype;
  const publicMethods = Object.getOwnPropertyNames(publicProto).filter(
    (m) => m !== "constructor" && typeof publicProto[m] === "function",
  );
  assert.equal(publicMethods.length, 3);
  for (const method of publicMethods) {
    const isPublic = Reflect.getMetadata("isPublic", publicProto[method]);
    assert.equal(isPublic, true, `TipsController.${method} missing @Public()`);
  }
});

