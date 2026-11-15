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
  ConversationKind,
  ParticipantRole,
} from "@prisma/client";
import { StartInvestigationDto } from "../backend/dist/modules/cases/dto/start-investigation.dto.js";
import { ScheduleInspectionDto } from "../backend/dist/modules/cases/dto/schedule-inspection.dto.js";
import { UpdateInspectionDto } from "../backend/dist/modules/cases/dto/update-inspection.dto.js";
import { CreateFindingDto } from "../backend/dist/modules/cases/dto/create-finding.dto.js";
import { SubmitInvestigationDto } from "../backend/dist/modules/cases/dto/submit-investigation.dto.js";
import { BusinessInvestigationResponseDto } from "../backend/dist/modules/cases/dto/business-investigation-response.dto.js";
import { GovernmentInvestigationsService } from "../backend/dist/modules/cases/government-investigations.service.js";
import { GovernmentInvestigationsController } from "../backend/dist/modules/cases/government-investigations.controller.js";

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialInspections = [],
  initialFindings = [],
  initialMerchantUsers = [],
  initialMerchants = [],
  initialConversations = [],
  initialMessages = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const inspections = new Map(initialInspections.map((i) => [i.id, { ...i, findings: [] }]));
  const findings = new Map(initialFindings.map((f) => [f.id, { ...f }]));
  const merchantUsers = [...initialMerchantUsers];
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const conversations = new Map(initialConversations.map((c) => [c.id, { ...c, messages: [], participants: [] }]));
  const messages = new Map(initialMessages.map((m) => [m.id, { ...m }]));
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
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
    },
    case: {
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find(
          (x) => x.id === where.id || x.referenceNumber === where.referenceNumber,
        );
        if (!c) return null;
        const res = { ...c };
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
        if (include?.assignments) res.assignments = c.assignments || [];
        if (include?.inspections) {
          res.inspections = Array.from(inspections.values())
            .filter((i) => i.caseId === c.id)
            .map((i) => ({
              ...i,
              leadInspector: users.get(i.leadInspectorId),
              findings: Array.from(findings.values()).filter((f) => f.inspectionId === i.id),
            }));
        }
        if (include?.conversations) {
          res.conversations = Array.from(conversations.values())
            .filter((conv) => conv.caseId === c.id)
            .map((conv) => ({
              ...conv,
              messages: Array.from(messages.values())
                .filter((m) => m.conversationId === conv.id)
                .map((m) => ({ ...m, sender: users.get(m.senderUserId) })),
            }));
        }
        if (include?.history) res.history = historyStore.filter((h) => h.caseId === c.id);
        return res;
      },
      update: async ({ where, data }) => {
        const existing = cases.get(where.id);
        const updated = { ...existing, ...data };
        cases.set(where.id, updated);
        return updated;
      },
    },
    inspection: {
      create: async ({ data }) => {
        const id = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const record = { id, ...data, createdAt: new Date() };
        inspections.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const i = inspections.get(where.id);
        if (!i) return null;
        const res = { ...i };
        if (include?.office) res.office = offices.get(i.officeId);
        if (include?.case) res.case = cases.get(i.caseId);
        if (include?.leadInspector) res.leadInspector = users.get(i.leadInspectorId);
        if (include?.findings) {
          res.findings = Array.from(findings.values()).filter((f) => f.inspectionId === i.id);
        }
        return res;
      },
      update: async ({ where, data, include }) => {
        const existing = inspections.get(where.id);
        const updated = { ...existing, ...data };
        inspections.set(where.id, updated);
        const res = { ...updated };
        if (include?.findings) {
          res.findings = Array.from(findings.values()).filter((f) => f.inspectionId === updated.id);
        }
        if (include?.leadInspector) res.leadInspector = users.get(updated.leadInspectorId);
        return res;
      },
    },
    inspectionFinding: {
      create: async ({ data }) => {
        const id = `fnd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const record = { id, ...data };
        findings.set(id, record);
        return record;
      },
    },
    merchantUser: {
      findFirst: async ({ where }) => {
        const mu = merchantUsers.find((x) => x.userId === where.userId);
        if (!mu) return null;
        return { ...mu, merchant: merchants.get(mu.merchantId) };
      },
    },
    conversation: {
      findFirst: async ({ where }) => {
        return Array.from(conversations.values()).find(
          (c) => c.caseId === where.caseId && (!where.kind || c.kind === where.kind),
        ) || null;
      },
      create: async ({ data }) => {
        const id = `conv-${Date.now()}`;
        const record = { id, ...data };
        conversations.set(id, record);
        return record;
      },
    },
    conversationParticipant: {
      findUnique: async () => null,
      create: async ({ data }) => data,
    },
    message: {
      create: async ({ data }) => {
        const id = `msg-${Date.now()}`;
        const record = { id, ...data, sentAt: new Date() };
        messages.set(id, record);
        return record;
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

  return { mock, cases, inspections, findings, historyStore, auditStore };
}

const mockOffices = [
  { id: "off-woreda-1", code: "WO-01", nameEn: "Woreda 01 Office", level: OfficeLevel.WOREDA, subcityCode: "BOLE" },
  { id: "off-woreda-2", code: "WO-02", nameEn: "Woreda 02 Office", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS" },
];

const mockUsers = [
  {
    id: "u-officer-assigned",
    fullName: "Abebe Assigned",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-woreda-1", isActive: true }],
    status: "ACTIVE",
  },
  {
    id: "u-officer-other-woreda",
    fullName: "Chala Other",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-woreda-2", isActive: true }],
    status: "ACTIVE",
  },
  {
    id: "u-woreda-admin",
    fullName: "Kebede Admin",
    roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
    offices: [{ officeId: "off-woreda-1", isActive: true }],
    status: "ACTIVE",
  },
  {
    id: "u-merchant-owner",
    fullName: "Almaz Business",
    roles: [{ role: { code: RoleCode.BUSINESS_OWNER } }],
    offices: [],
    status: "ACTIVE",
  },
];

const mockMerchants = [
  { id: "merch-1", tradeName: "Almaz Flour Mill", isActive: true },
];

const mockMerchantUsers = [
  { userId: "u-merchant-owner", merchantId: "merch-1" },
];

test("Phase 4.5: DTO validation rules", async () => {
  const invalidSchedule = plainToInstance(ScheduleInspectionDto, {
    inspectionDate: "invalid-date",
    locationName: "",
    inspectionType: "",
    summary: "",
  });
  const scheduleErrors = await validate(invalidSchedule);
  assert.ok(scheduleErrors.length >= 3);

  const validSchedule = plainToInstance(ScheduleInspectionDto, {
    inspectionDate: new Date().toISOString(),
    locationName: "Bole Medhanealem Market Stall 12",
    inspectionType: "METROLOGY_SCALE_CHECK",
    summary: "Routine scale verification for alleged under-weighing.",
  });
  const validErrors = await validate(validSchedule);
  assert.equal(validErrors.length, 0);

  const invalidFinding = plainToInstance(CreateFindingDto, {
    metricName: "",
    measuredValue: "not-a-number",
    unit: "",
    isViolation: "true",
  });
  const findingErrors = await validate(invalidFinding);
  assert.ok(findingErrors.length >= 2);
});

test("Phase 4.5: Assigned officer can start an investigation", async () => {
  const { mock, cases, historyStore, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00101",
        status: CaseStatus.OFFICER_ASSIGNED,
        currentOfficeId: "off-woreda-1",
        assignments: [{ assignedToUserId: "u-officer-assigned", isActive: true }],
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);
  const result = await service.startInvestigation("u-officer-assigned", "CC-2026-00101", {
    notes: "Commencing formal on-site metrology inspection.",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, CaseStatus.INSPECTION_PENDING);
  assert.equal(cases.get("case-1").status, CaseStatus.INSPECTION_PENDING);
  assert.equal(historyStore.length, 1);
  assert.equal(auditStore.some((a) => a.actionCode === "INVESTIGATION_STARTED"), true);
});

test("Phase 4.5: Unassigned officer and cross-office officer are rejected", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00101",
        status: CaseStatus.OFFICER_ASSIGNED,
        currentOfficeId: "off-woreda-1",
        assignments: [{ assignedToUserId: "u-officer-assigned", isActive: true }],
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);

  // Cross-jurisdiction officer rejected with CASE_NOT_FOUND (404)
  await assert.rejects(
    () => service.startInvestigation("u-officer-other-woreda", "CC-2026-00101", {}),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );
});

test("Phase 4.5: Prevents duplicate active investigation", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00102",
        status: CaseStatus.INSPECTION_ACTIVE,
        currentOfficeId: "off-woreda-1",
        assignments: [{ assignedToUserId: "u-officer-assigned", isActive: true }],
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);
  await assert.rejects(
    () => service.startInvestigation("u-officer-assigned", "CC-2026-00102", {}),
    (err) => err.response?.code === "DUPLICATE_INVESTIGATION",
  );
});

test("Phase 4.5: Schedule inspection advances case to INSPECTION_ACTIVE", async () => {
  const { mock, cases, inspections, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00103",
        status: CaseStatus.INSPECTION_PENDING,
        currentOfficeId: "off-woreda-1",
        assignments: [{ assignedToUserId: "u-officer-assigned", isActive: true }],
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);
  const inspection = await service.scheduleInspection("u-officer-assigned", "CC-2026-00103", {
    inspectionDate: new Date().toISOString(),
    locationName: "Bole Mill Premises",
    inspectionType: "METROLOGY_SCALE_CHECK",
    summary: "Checking electronic scale calibration.",
  });

  assert.ok(inspection.id);
  assert.equal(cases.get("case-1").status, CaseStatus.INSPECTION_ACTIVE);
  assert.equal(inspections.size, 1);
  assert.equal(auditStore.some((a) => a.actionCode === "INSPECTION_SCHEDULED"), true);
});

test("Phase 4.5: Recording metric findings and completing inspection", async () => {
  const { mock, cases, findings } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00104",
        status: CaseStatus.INSPECTION_ACTIVE,
        currentOfficeId: "off-woreda-1",
        assignments: [{ assignedToUserId: "u-officer-assigned", isActive: true }],
      },
    ],
    initialInspections: [
      {
        id: "insp-1",
        caseId: "case-1",
        officeId: "off-woreda-1",
        leadInspectorId: "u-officer-assigned",
        inspectionDate: new Date(),
        locationName: "Bole Mill",
        inspectionType: "METROLOGY_SCALE_CHECK",
        summary: "Scale check initial summary",
        actionTaken: null,
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);

  // 1. Completion without findings is rejected
  await assert.rejects(
    () =>
      service.updateInspection("u-officer-assigned", "insp-1", {
        isCompleted: true,
        actionTaken: "CONFISCATED_SCALE",
      }),
    (err) => err.response?.code === "COMPLETION_MISSING_FINDINGS",
  );

  // 2. Record violation finding
  const finding = await service.recordFinding("u-officer-assigned", "insp-1", {
    metricName: "Standard 1kg Test Weight",
    nominalValue: 1000.0,
    measuredValue: 850.0,
    unit: "grams",
    isViolation: true,
    notes: "Scale under-reads by 150g per kilogram.",
  });
  assert.ok(finding.id);
  assert.equal(findings.size, 1);

  // 3. Complete inspection with documented action
  const completed = await service.updateInspection("u-officer-assigned", "insp-1", {
    isCompleted: true,
    actionTaken: "CONFISCATED_SCALE_ISSUED_CITATION",
    summary: "Confirmed fraudulent calibration. Confiscated scale and issued citation.",
  });
  assert.equal(completed.actionTaken, "CONFISCATED_SCALE_ISSUED_CITATION");
  assert.equal(cases.get("case-1").status, CaseStatus.INSPECTION_COMPLETED);
});

test("Phase 4.5: Business investigation response opportunity and privacy", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialMerchants: mockMerchants,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00105",
        status: CaseStatus.INSPECTION_ACTIVE,
        currentOfficeId: "off-woreda-1",
        merchantId: "merch-1",
        complainantAlias: "Consumer 00982",
      },
    ],
  });

  const service = new GovernmentInvestigationsService(mock);

  // Associated merchant submits formal explanation
  const response = await service.submitBusinessInvestigationResponse(
    "u-merchant-owner",
    "CC-2026-00105",
    {
      statement: "The scale was serviced yesterday; we have requested immediate recalibration.",
    },
  );

  assert.equal(response.success, true);
  assert.ok(response.messageId);

  // Verify overview does not expose complainant PII
  const details = await service.getInvestigationDetails("u-officer-assigned", "CC-2026-00105");
  assert.equal(details.complainantAlias, "Consumer 00982");
  assert.equal(details.businessResponses.length, 1);
  assert.equal(details.businessResponses[0].content.includes("recalibration"), true);
});

test("Phase 4.5: All GovernmentInvestigationsController routes have authorization decorators", () => {
  const proto = GovernmentInvestigationsController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  assert.equal(methods.length, 7, "GovernmentInvestigationsController must have exactly 7 endpoints");
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method GovernmentInvestigationsController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

