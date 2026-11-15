import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CaseStatus,
  OfficeLevel,
  RoleCode,
} from "@prisma/client";
import {
  IssueDecisionDto,
  DecisionOutcome,
  FinalStatusTarget,
} from "../backend/dist/modules/cases/dto/issue-decision.dto.js";
import { UpdateResolutionDto } from "../backend/dist/modules/cases/dto/update-resolution.dto.js";
import { VerifyComplianceDto } from "../backend/dist/modules/cases/dto/verify-compliance.dto.js";
import { CloseCaseDto, CaseClosureReason } from "../backend/dist/modules/cases/dto/close-case.dto.js";
import { ReopenCaseDto } from "../backend/dist/modules/cases/dto/reopen-case.dto.js";
import { GovernmentDecisionsService } from "../backend/dist/modules/cases/government-decisions.service.js";
import { GovernmentDecisionsController } from "../backend/dist/modules/cases/government-decisions.controller.js";

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialMerchants = [],
  initialMerchantUsers = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const merchantUsers = [...initialMerchantUsers];
  const historyStore = [];
  const auditStore = [];

  const mock = {
    user: {
      findUnique: async ({ where, include }) => {
        const u = users.get(where.id);
        if (!u) return null;
        const res = { ...u };
        if (include?.roles) res.roles = u.roles || [];
        if (include?.offices) {
          res.offices = (u.offices || []).map((o) => ({
            ...o,
            office: offices.get(o.officeId),
          }));
        }
        return res;
      },
    },
    case: {
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find(
          (x) => x.id === where.id || x.referenceNumber === where.referenceNumber,
        );
        if (!c) return null;
        const res = { ...c };
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
        if (include?.inspections) res.inspections = c.inspections || [];
        if (include?.assignments) res.assignments = c.assignments || [];
        if (include?.auditLogs) {
          res.auditLogs = auditStore.filter((a) => a.caseId === c.id);
        }
        if (include?.history) {
          res.history = historyStore.filter((h) => h.caseId === c.id);
        }
        return res;
      },
      update: async ({ where, data }) => {
        const existing = cases.get(where.id);
        const updated = { ...existing, ...data };
        cases.set(where.id, updated);
        return updated;
      },
    },
    merchantUser: {
      findFirst: async ({ where }) => {
        const mu = merchantUsers.find(
          (x) => x.userId === where.userId && (!where.merchantId || x.merchantId === where.merchantId),
        );
        if (!mu) return null;
        return { ...mu, merchant: merchants.get(mu.merchantId) };
      },
    },
    caseHistory: {
      create: async ({ data }) => {
        const rec = { id: `hist-${Date.now()}`, ...data, createdAt: new Date() };
        historyStore.push(rec);
        return rec;
      },
    },
    caseAuditLog: {
      create: async ({ data }) => {
        const rec = { id: `audit-${Date.now()}`, ...data, timestamp: new Date() };
        auditStore.push(rec);
        return rec;
      },
    },
    $transaction: async (fn) => fn(mock),
  };

  return { mock, cases, historyStore, auditStore };
}

const mockOffices = [
  { id: "off-woreda-1", code: "WO-01", nameEn: "Woreda 01 Office", level: OfficeLevel.WOREDA, subcityCode: "BOLE" },
  { id: "off-woreda-2", code: "WO-02", nameEn: "Woreda 02 Office", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS" },
];

const mockUsers = [
  { id: "u-officer-woreda1", fullName: "Abebe Officer", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-1", isActive: true }], status: "ACTIVE" },
  { id: "u-officer-other", fullName: "Chala Other", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-2", isActive: true }], status: "ACTIVE" },
  { id: "u-woreda-admin", fullName: "Kebede Admin", roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }], offices: [{ officeId: "off-woreda-1", isActive: true }], status: "ACTIVE" },
  { id: "u-citizen-1", fullName: "Tadesse Citizen", roles: [{ role: { code: RoleCode.CONSUMER } }], offices: [], status: "ACTIVE" },
  { id: "u-merchant-owner", fullName: "Almaz Business", roles: [{ role: { code: RoleCode.BUSINESS_OWNER } }], offices: [], status: "ACTIVE" },
];

const mockMerchants = [{ id: "merch-1", tradeName: "Almaz Flour Mill", isActive: true }];
const mockMerchantUsers = [{ userId: "u-merchant-owner", merchantId: "merch-1" }];

test("Phase 4.7: DTO validation rules", async () => {
  const invalid = plainToInstance(IssueDecisionDto, {
    outcome: "INVALID_OUTCOME",
    statusTarget: "INVALID_STATUS",
    reasoning: "",
  });
  const errors = await validate(invalid);
  assert.ok(errors.length >= 3);

  const valid = plainToInstance(IssueDecisionDto, {
    outcome: DecisionOutcome.SUBSTANTIATED,
    statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
    reasoning: "Inspection confirmed metric scale fraud violating Consumer Protection Proclamation.",
    correctiveAction: "Recalibrate scale and obtain Bureau metrology seal within 5 business days.",
    remedyInstruction: "Refund consumer ETB 450 overcharge.",
    complianceDeadline: "2026-12-01T00:00:00.000Z",
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 4.7: Authorized decision issuance advances case to RESOLVED_ADMINISTRATIVE_ORDER", async () => {
  const { mock, cases, historyStore, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00401",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.INSPECTION_COMPLETED,
        inspections: [{ id: "insp-1", actionTaken: "SEALED", findings: [{ isViolation: true }] }],
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);
  const result = await service.issueDecision("u-officer-woreda1", "CC-2026-00401", {
    outcome: DecisionOutcome.SUBSTANTIATED,
    statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
    reasoning: "Confirmed deliberate weight scale tampering.",
    remedyInstruction: "Refund 450 ETB to consumer.",
    correctiveAction: "Install certified scale.",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER);
  assert.equal(cases.get("case-1").status, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER);
  assert.equal(historyStore.length, 1);
  assert.equal(auditStore.some((a) => a.actionCode === "GOVERNMENT_DECISION_ISSUED"), true);
});

test("Phase 4.7: Decision rejected when investigation is incomplete or cross-jurisdiction", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00402",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.INSPECTION_ACTIVE, // Not completed
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);

  // 1. Cross-office rejected (404)
  await assert.rejects(
    () =>
      service.issueDecision("u-officer-other", "CC-2026-00402", {
        outcome: DecisionOutcome.SUBSTANTIATED,
        statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
        reasoning: "Test reasoning",
      }),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );

  // 2. Incomplete investigation rejected (400)
  await assert.rejects(
    () =>
      service.issueDecision("u-officer-woreda1", "CC-2026-00402", {
        outcome: DecisionOutcome.SUBSTANTIATED,
        statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
        reasoning: "Test reasoning",
      }),
    (err) => err.response?.code === "INVESTIGATION_NOT_READY",
  );
});

test("Phase 4.7: Prevents duplicate final decision on already resolved case", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00403",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);
  await assert.rejects(
    () =>
      service.issueDecision("u-officer-woreda1", "CC-2026-00403", {
        outcome: DecisionOutcome.SUBSTANTIATED,
        statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
        reasoning: "Second decision",
      }),
    (err) => err.response?.code === "DECISION_ALREADY_ISSUED",
  );
});

test("Phase 4.7: Updating resolution terms and verifying compliance", async () => {
  const { mock, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00404",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);

  // 1. Update resolution deadline
  const updateRes = await service.updateResolution("u-officer-woreda1", "CC-2026-00404", {
    complianceDeadline: "2026-12-15T00:00:00.000Z",
    remedyInstruction: "Refund increased to ETB 500.",
  });
  assert.equal(updateRes.success, true);

  // 2. Verify business compliance
  const verifyRes = await service.verifyCompliance("u-officer-woreda1", "CC-2026-00404", {
    isComplied: true,
    verificationNotes: "On-site check confirmed new scale certified and refund voucher provided.",
  });
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.isComplied, true);
  assert.equal(auditStore.some((a) => a.actionCode === "COMPLIANCE_VERIFIED"), true);
});

test("Phase 4.7: Closing case and controlled reopening by administrator", async () => {
  const { mock, cases, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00405",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);

  // 1. Close resolved case
  const closeRes = await service.closeCase("u-officer-woreda1", "CC-2026-00405", {
    closureReason: CaseClosureReason.RESOLVED_COMPLIANCE_CONFIRMED,
    closureNotes: "All remedy instructions executed and verified.",
  });
  assert.equal(closeRes.isClosed, true);
  assert.equal(auditStore.some((a) => a.actionCode === "CASE_CLOSED"), true);

  // 2. Regular officer cannot reopen (403)
  await assert.rejects(
    () =>
      service.reopenCase("u-officer-woreda1", "CC-2026-00405", {
        reopenReason: "Citizen appeal",
      }),
    (err) => err.response?.code === "REOPEN_UNAUTHORIZED",
  );

  // 3. Office administrator can reopen
  const reopenRes = await service.reopenCase("u-woreda-admin", "CC-2026-00405", {
    reopenReason: "Consumer presented evidence that replacement good was also defective.",
  });
  assert.equal(reopenRes.success, true);
  assert.equal(reopenRes.status, CaseStatus.UNDER_INITIAL_REVIEW);
  assert.equal(cases.get("case-1").status, CaseStatus.UNDER_INITIAL_REVIEW);
  assert.equal(auditStore.some((a) => a.actionCode === "CASE_REOPENED"), true);
});

test("Phase 4.7: Consumer and business visibility safeguards", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialMerchants: mockMerchants,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00406",
        currentOfficeId: "off-woreda-1",
        complainantId: "u-citizen-1",
        complainantAlias: "Consumer 00811",
        merchantId: "merch-1",
        status: CaseStatus.INSPECTION_COMPLETED,
        inspections: [{ id: "insp-1", actionTaken: "SEALED", findings: [{ isViolation: true }] }],
      },
    ],
  });

  const service = new GovernmentDecisionsService(mock);
  await service.issueDecision("u-officer-woreda1", "CC-2026-00406", {
    outcome: DecisionOutcome.SUBSTANTIATED,
    statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
    reasoning: "Defective electronics sold with refusal of receipt.",
    remedyInstruction: "Full refund of purchase price.",
    correctiveAction: "Issue legal fiscal receipts for all sales.",
  });

  // 1. Consumer view preserves alias and displays decision
  const consumerView = await service.getCaseDecision("u-citizen-1", "CC-2026-00406", "CONSUMER");
  assert.equal(consumerView.complainantAlias, "Consumer 00811");
  assert.equal(consumerView.decision.outcome, DecisionOutcome.SUBSTANTIATED);
  assert.equal(consumerView.decision.remedyInstruction, "Full refund of purchase price.");

  // 2. Business view displays corrective actions without consumer PII
  const businessView = await service.getCaseDecision("u-merchant-owner", "CC-2026-00406", "BUSINESS");
  assert.equal(businessView.decision.outcome, DecisionOutcome.SUBSTANTIATED);
  assert.equal(businessView.decision.correctiveAction, "Issue legal fiscal receipts for all sales.");
  assert.equal(businessView.complainantAlias, undefined);
  assert.equal(businessView.complainantId, undefined);
});

test("Phase 4.7: All GovernmentDecisionsController routes have authorization decorators", () => {
  const proto = GovernmentDecisionsController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  assert.equal(methods.length, 6, "GovernmentDecisionsController must have exactly 6 endpoints");
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method GovernmentDecisionsController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

