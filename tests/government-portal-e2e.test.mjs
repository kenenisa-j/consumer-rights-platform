import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {
  CaseStatus,
  ComplaintRoute,
  OfficeLevel,
  RoleCode,
  TransferDirection,
  TransferStatus,
} from "@prisma/client";
import {
  DecisionOutcome,
  FinalStatusTarget,
} from "../backend/dist/modules/cases/dto/issue-decision.dto.js";
import { CaseClosureReason } from "../backend/dist/modules/cases/dto/close-case.dto.js";
import { GovernmentCasesService } from "../backend/dist/modules/cases/government-cases.service.js";
import { GovernmentTransfersService } from "../backend/dist/modules/cases/government-transfers.service.js";
import { GovernmentInvestigationsService } from "../backend/dist/modules/cases/government-investigations.service.js";
import { GovernmentDecisionsService } from "../backend/dist/modules/cases/government-decisions.service.js";

function createPortalE2ePrisma() {
  const offices = new Map([
    ["off-bureau", { id: "off-bureau", code: "AA-BUREAU", nameEn: "City Bureau", level: OfficeLevel.CITY_BUREAU, isActive: true }],
    ["off-sc-bole", { id: "off-sc-bole", code: "SC-BOLE", nameEn: "Bole Sub-City", level: OfficeLevel.SUBCITY, subcityCode: "BOLE", parentOfficeId: "off-bureau", isActive: true }],
    ["off-w-bole01", { id: "off-w-bole01", code: "WO-BOLE-01", nameEn: "Bole Woreda 01", level: OfficeLevel.WOREDA, subcityCode: "BOLE", parentOfficeId: "off-sc-bole", isActive: true }],
    ["off-w-bole02", { id: "off-w-bole02", code: "WO-BOLE-02", nameEn: "Bole Woreda 02", level: OfficeLevel.WOREDA, subcityCode: "BOLE", parentOfficeId: "off-sc-bole", isActive: true }],
    ["off-w-akaki07", { id: "off-w-akaki07", code: "WO-AKAKI-07", nameEn: "Akaki Woreda 07", level: OfficeLevel.WOREDA, subcityCode: "AKAKI-KALITY", isActive: true }],
  ]);

  const users = new Map([
    ["u-bureau-officer", {
      id: "u-bureau-officer",
      fullName: "Bureau Director",
      roles: [{ role: { code: RoleCode.BUREAU_OFFICER } }],
      offices: [{ officeId: "off-bureau", isPrimary: true, isActive: true, office: offices.get("off-bureau") }],
      status: "ACTIVE",
    }],
    ["u-sc-coordinator", {
      id: "u-sc-coordinator",
      fullName: "Subcity Coordinator",
      roles: [{ role: { code: RoleCode.SUBCITY_COORDINATOR } }],
      offices: [{ officeId: "off-sc-bole", isPrimary: true, isActive: true, office: offices.get("off-sc-bole") }],
      status: "ACTIVE",
    }],
    ["u-w-supervisor", {
      id: "u-w-supervisor",
      fullName: "Woreda Supervisor",
      roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
      offices: [{ officeId: "off-w-bole01", isPrimary: true, isActive: true, office: offices.get("off-w-bole01") }],
      status: "ACTIVE",
    }],
    ["u-w-officer1", {
      id: "u-w-officer1",
      fullName: "Woreda Officer One",
      roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
      offices: [{ officeId: "off-w-bole01", isPrimary: true, isActive: true, office: offices.get("off-w-bole01") }],
      status: "ACTIVE",
    }],
    ["u-w-officer2", {
      id: "u-w-officer2",
      fullName: "Woreda Officer Two",
      roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
      offices: [{ officeId: "off-w-bole02", isPrimary: true, isActive: true, office: offices.get("off-w-bole02") }],
      status: "ACTIVE",
    }],
  ]);

  const cases = new Map();
  const assignments = new Map();
  const transfers = new Map();
  const inspections = new Map();
  const findings = new Map();
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
          let list = u.offices || [];
          if (include.offices.where?.isActive !== undefined) {
            list = list.filter((o) => (o.isActive !== false) === include.offices.where.isActive);
          }
          res.offices = list.map((o) => ({ ...o, office: offices.get(o.officeId) }));
        }
        return res;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
      findFirst: async ({ where }) =>
        Array.from(offices.values()).find(
          (o) =>
            (!where.level || o.level === where.level) &&
            (!where.subcityCode || o.subcityCode === where.subcityCode) &&
            (!where.isActive || o.isActive === where.isActive),
        ) || null,
    },
    case: {
      create: async ({ data }) => {
        const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        cases.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find(
          (x) => x.id === where.id || x.referenceNumber === where.referenceNumber,
        );
        if (!c) return null;
        const res = { ...c };
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
        if (include?.category) res.category = { id: c.categoryId || "cat-1", code: "GOODS", nameEn: "Goods/Services" };
        if (include?.assignments) {
          res.assignments = Array.from(assignments.values())
            .filter((a) => a.caseId === c.id && (!include.assignments.where?.isActive || a.isActive === include.assignments.where.isActive))
            .map((a) => {
              const asgn = { ...a };
              if (include.assignments.include?.assignedTo) asgn.assignedTo = users.get(a.assignedToUserId);
              if (include.assignments.include?.assignedBy) asgn.assignedBy = users.get(a.assignedByUserId);
              return asgn;
            });
        }
        if (include?.transfers) {
          res.transfers = Array.from(transfers.values())
            .filter((t) => t.caseId === c.id && (!include.transfers.where?.status || t.status === include.transfers.where.status))
            .map((t) => {
              const tr = { ...t };
              if (include.transfers.include?.fromOffice) tr.fromOffice = offices.get(t.fromOfficeId);
              if (include.transfers.include?.toOffice) tr.toOffice = offices.get(t.toOfficeId);
              if (include.transfers.include?.initiatedBy) tr.initiatedBy = users.get(t.initiatedByUserId);
              if (include.transfers.include?.respondedBy) tr.respondedBy = users.get(t.respondedByUserId);
              return tr;
            });
        }
        if (include?.inspections) {
          res.inspections = Array.from(inspections.values())
            .filter((i) => i.caseId === c.id)
            .map((i) => {
              const inspCopy = { ...i };
              if (include.inspections.include?.findings) {
                inspCopy.findings = Array.from(findings.values()).filter((f) => f.inspectionId === i.id);
              }
              return inspCopy;
            });
        }
        if (include?.history) res.history = historyStore.filter((h) => h.caseId === c.id);
        if (include?.auditLogs) res.auditLogs = auditStore.filter((a) => a.caseId === c.id);
        return res;
      },
      findMany: async ({ where, include }) => {
        let list = Array.from(cases.values());
        if (where?.currentOfficeId) list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        if (where?.currentOffice?.subcityCode) {
          list = list.filter((c) => offices.get(c.currentOfficeId)?.subcityCode === where.currentOffice.subcityCode);
        }
        if (where?.status) {
          if (Array.isArray(where.status?.in)) list = list.filter((c) => where.status.in.includes(c.status));
          else if (typeof where.status === "string") list = list.filter((c) => c.status === where.status);
        }
        return list.map((c) => {
          const res = { ...c };
          if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId);
          if (include?.category) res.category = { id: c.categoryId || "cat-1", code: "GOODS", nameEn: "Goods/Services" };
          if (include?.assignments) {
            res.assignments = Array.from(assignments.values()).filter(
              (a) => a.caseId === c.id && (!include.assignments.where?.isActive || a.isActive === include.assignments.where.isActive),
            );
          }
          if (include?.transfers) {
            res.transfers = Array.from(transfers.values()).filter(
              (t) => t.caseId === c.id && (!include.transfers.where?.status || t.status === include.transfers.where.status),
            );
          }
          return res;
        });
      },
      count: async ({ where }) => {
        let list = Array.from(cases.values());
        if (where?.currentOfficeId) list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        return list.length;
      },
      update: async ({ where, data }) => {
        const existing = Array.from(cases.values()).find((x) => x.id === where.id || x.referenceNumber === where.referenceNumber);
        if (!existing) throw new Error("Case not found");
        const updated = { ...existing, ...data, updatedAt: new Date() };
        cases.set(existing.id, updated);
        return updated;
      },
    },
    caseAssignment: {
      create: async ({ data }) => {
        const id = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, assignedAt: new Date() };
        assignments.set(id, record);
        return record;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const [id, a] of assignments.entries()) {
          if (a.caseId === where.caseId && (!where.isActive || a.isActive === where.isActive)) {
            assignments.set(id, { ...a, ...data });
            count++;
          }
        }
        return { count };
      },
      findFirst: async ({ where }) =>
        Array.from(assignments.values()).find(
          (a) => a.caseId === where.caseId && (!where.isActive || a.isActive === where.isActive),
        ) || null,
    },
    caseTransfer: {
      create: async ({ data }) => {
        const id = `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, transferredAt: new Date() };
        transfers.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const t = transfers.get(where.id);
        if (!t) return null;
        const res = { ...t };
        if (include?.toOffice) res.toOffice = offices.get(t.toOfficeId);
        if (include?.fromOffice) res.fromOffice = offices.get(t.fromOfficeId);
        if (include?.case) res.case = cases.get(t.caseId);
        return res;
      },
      findMany: async ({ where, include }) => {
        let list = Array.from(transfers.values());
        if (where?.status) list = list.filter((t) => t.status === where.status);
        if (where?.toOfficeId) list = list.filter((t) => t.toOfficeId === where.toOfficeId);
        return list.map((t) => {
          const res = { ...t };
          if (include?.fromOffice) res.fromOffice = offices.get(t.fromOfficeId);
          if (include?.toOffice) res.toOffice = offices.get(t.toOfficeId);
          if (include?.case) res.case = cases.get(t.caseId);
          return res;
        });
      },
      update: async ({ where, data }) => {
        const existing = transfers.get(where.id);
        const updated = { ...existing, ...data };
        transfers.set(where.id, updated);
        return updated;
      },
    },
    inspection: {
      create: async ({ data }) => {
        const id = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, createdAt: new Date() };
        inspections.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const insp = inspections.get(where.id);
        if (!insp) return null;
        const res = { ...insp };
        if (include?.office) res.office = offices.get(insp.officeId);
        if (include?.case) {
          const c = cases.get(insp.caseId);
          res.case = { ...c, currentOffice: offices.get(c?.currentOfficeId) };
        }
        if (include?.leadInspector) res.leadInspector = users.get(insp.leadInspectorId);
        if (include?.findings) {
          res.findings = Array.from(findings.values()).filter((f) => f.inspectionId === insp.id);
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
        const id = `find-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, createdAt: new Date() };
        findings.set(id, record);
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

  return { mock, cases, assignments, transfers, inspections, findings, historyStore, auditStore };
}

test("Phase 6 E2E: Government office jurisdiction scoping prevents unauthorized cross-office access", async () => {
  const { mock, cases } = createPortalE2ePrisma();
  cases.set("c-wo1", {
    id: "c-wo1",
    referenceNumber: "CC-2026-00301",
    currentOfficeId: "off-w-bole01",
    status: CaseStatus.RECEIVED_BY_OFFICE,
    route: ComplaintRoute.DIRECT_GOVERNMENT,
    itemDescription: "Bole Woreda 1 case",
    disputedAmount: 100,
    currency: "ETB",
    createdAt: new Date(),
    incidentDate: new Date(),
  });
  cases.set("c-wo2", {
    id: "c-wo2",
    referenceNumber: "CC-2026-00302",
    currentOfficeId: "off-w-bole02",
    status: CaseStatus.RECEIVED_BY_OFFICE,
    route: ComplaintRoute.DIRECT_GOVERNMENT,
    itemDescription: "Bole Woreda 2 case",
    disputedAmount: 200,
    currency: "ETB",
    createdAt: new Date(),
    incidentDate: new Date(),
  });

  const casesService = new GovernmentCasesService(mock);

  // Woreda 1 officer sees Woreda 1 case
  const w1List = await casesService.listCases("u-w-officer1", {});
  assert.equal(w1List.cases.length, 1);
  assert.equal(w1List.cases[0].referenceNumber, "CC-2026-00301");

  // Woreda 1 officer reading Woreda 2 case is forbidden
  await assert.rejects(
    () => casesService.getCaseByReference("u-w-officer1", "CC-2026-00302"),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );

  // Sub-City coordinator can oversee cases across subordinate Woredas in Bole
  const scList = await casesService.listCases("u-sc-coordinator", {});
  assert.equal(scList.cases.length, 2);
  const scCase = await casesService.getCaseByReference("u-sc-coordinator", "CC-2026-00301");
  assert.equal(scCase.reference, "CC-2026-00301");

  // City Bureau officer can oversee city-wide cases
  const bureauList = await casesService.listCases("u-bureau-officer", {});
  assert.equal(bureauList.cases.length, 2);
});

test("Phase 6 E2E: Complete case lifecycle — Triage, Assignment, Investigation, Decision, and Closure", async () => {
  const { mock, cases } = createPortalE2ePrisma();
  cases.set("c-100", {
    id: "c-100",
    referenceNumber: "CC-2026-00100",
    currentOfficeId: "off-w-bole01",
    status: CaseStatus.RECEIVED_BY_OFFICE,
    route: ComplaintRoute.DIRECT_GOVERNMENT,
    consumerId: "u-consumer",
    itemDescription: "Flour milling scale inaccuracy",
    disputedAmount: 2250,
    currency: "ETB",
    desiredRemedy: "Refund",
    incidentDate: new Date(),
    createdAt: new Date(),
  });

  const casesService = new GovernmentCasesService(mock);
  const investigationsService = new GovernmentInvestigationsService(mock);
  const decisionsService = new GovernmentDecisionsService(mock);

  // 1. Triage: Supervisor accepts incoming complaint
  const triageRes = await casesService.triageCase("u-w-supervisor", "CC-2026-00100", {
    action: "ACCEPT",
    notes: "Jurisdiction verified for Bole Woreda 01",
  });
  assert.equal(triageRes.success, true);
  assert.equal(triageRes.status, CaseStatus.UNDER_INITIAL_REVIEW);

  // 2. Assignment: Assign case to Woreda Officer One
  const assignRes = await casesService.assignOfficer("u-w-supervisor", "CC-2026-00100", {
    officerId: "u-w-officer1",
    notes: "Assigned for on-site inspection and conciliation",
  });
  assert.equal(assignRes.success, true);
  assert.equal(assignRes.status, CaseStatus.OFFICER_ASSIGNED);

  // 3. Start Investigation
  const invRes = await investigationsService.startInvestigation("u-w-officer1", "CC-2026-00100", {
    notes: "Inspect trader scales and verify weighing compliance",
  });
  assert.equal(invRes.success, true);
  assert.equal(cases.get("c-100").status, CaseStatus.INSPECTION_PENDING);

  // 4. Schedule and complete inspection
  const insp = await investigationsService.scheduleInspection("u-w-officer1", "CC-2026-00100", {
    inspectionDate: new Date().toISOString(),
    locationName: "Bole Market Stall 12",
    inspectionType: "CONCILIATION_MEETING",
    summary: "Verify weights and reconcile with consumer",
  });
  assert.ok(insp.id);
  assert.equal(cases.get("c-100").status, CaseStatus.INSPECTION_ACTIVE);

  const findingRes = await investigationsService.recordFinding("u-w-officer1", insp.id, {
    metricName: "Scale Accuracy",
    measuredValue: 4,
    unit: "kg",
    isViolation: true,
    notes: "Scale is underweight by 1kg",
  });
  assert.ok(findingRes.id);

  const completeRes = await investigationsService.updateInspection("u-w-officer1", insp.id, {
    isCompleted: true,
    actionTaken: "Trader acknowledged scale defect and agreed to refund.",
  });
  assert.ok(completeRes.id);
  assert.equal(cases.get("c-100").status, CaseStatus.INSPECTION_COMPLETED);

  // 5. Issue government decision
  const decRes = await decisionsService.issueDecision("u-w-officer1", "CC-2026-00100", {
    outcome: DecisionOutcome.SUBSTANTIATED,
    statusTarget: FinalStatusTarget.RESOLVED_ADMINISTRATIVE_ORDER,
    reasoning: "Scale discrepancy substantiated by on-site inspection.",
    remedyInstruction: "Trader ordered to refund 2250 ETB to consumer.",
    complianceDeadline: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(decRes.success, true);
  assert.equal(cases.get("c-100").status, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER);

  // 6. Verify compliance and close case
  const verifyRes = await decisionsService.verifyCompliance("u-w-officer1", "CC-2026-00100", {
    isComplied: true,
    verificationNotes: "Consumer confirmed full refund received.",
  });
  assert.equal(verifyRes.isComplied, true);

  const closeRes = await decisionsService.closeCase("u-w-officer1", "CC-2026-00100", {
    closureReason: CaseClosureReason.RESOLVED_COMPLIANCE_CONFIRMED,
    closureNotes: "Remedy complied with and resolved.",
  });
  assert.equal(closeRes.isClosed, true);
});

test("Phase 6 E2E: Hierarchical escalation climbs one level at a time and rejects invalid transfers", async () => {
  const { mock, cases, transfers } = createPortalE2ePrisma();
  cases.set("c-esc", {
    id: "c-esc",
    referenceNumber: "CC-2026-00200",
    currentOfficeId: "off-w-bole01",
    status: CaseStatus.OFFICER_ASSIGNED,
    route: ComplaintRoute.DIRECT_GOVERNMENT,
    itemDescription: "Complex trade infraction",
    disputedAmount: 5000,
    currency: "ETB",
    desiredRemedy: "Enforcement",
    incidentDate: new Date(),
    createdAt: new Date(),
  });

  const transfersService = new GovernmentTransfersService(mock);

  // 1. Woreda cannot skip level directly to City Bureau
  await assert.rejects(
    () =>
      transfersService.initiateTransfer("u-w-officer1", "CC-2026-00200", {
        toOfficeId: "off-bureau",
        direction: TransferDirection.UPWARD_ESCALATION,
        handoverNote: "Illegal skip of Sub-City",
      }),
    (err) => err.response?.code === "INVALID_CLIMB",
  );

  // 2. Woreda escalates to Sub-City
  const initRes = await transfersService.initiateTransfer("u-w-officer1", "CC-2026-00200", {
    toOfficeId: "off-sc-bole",
    direction: TransferDirection.UPWARD_ESCALATION,
    handoverNote: "Complex multi-stall trade infraction requiring Sub-City enforcement",
  });
  assert.ok(initRes.id);

  // 3. Sub-City accepts the transfer
  const pendingTransfer = Array.from(transfers.values()).find(
    (t) => t.caseId === "c-esc" && t.status === TransferStatus.PENDING_ACCEPTANCE,
  );
  const acceptRes = await transfersService.acceptTransfer("u-sc-coordinator", pendingTransfer.id, {
    notes: "Accepted by Bole Sub-City coordinator",
  });
  assert.equal(acceptRes.success, true);
  assert.equal(acceptRes.status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(transfers.get(pendingTransfer.id).status, TransferStatus.ACCEPTED);
  assert.equal(cases.get("c-esc").currentOfficeId, "off-sc-bole");
  assert.equal(cases.get("c-esc").status, CaseStatus.RECEIVED_BY_OFFICE);

  // 4. Sub-City escalates upward to City Bureau
  const initBureauRes = await transfersService.initiateTransfer("u-sc-coordinator", "CC-2026-00200", {
    toOfficeId: "off-bureau",
    direction: TransferDirection.UPWARD_ESCALATION,
    handoverNote: "City-wide supply chain cartel investigation",
  });
  assert.ok(initBureauRes.id);

  const bureauTransfer = Array.from(transfers.values()).find(
    (t) => t.caseId === "c-esc" && t.status === TransferStatus.PENDING_ACCEPTANCE,
  );
  const acceptBureauRes = await transfersService.acceptTransfer("u-bureau-officer", bureauTransfer.id, {
    notes: "Accepted by City Bureau",
  });
  assert.equal(acceptBureauRes.success, true);
  assert.equal(acceptBureauRes.status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(transfers.get(bureauTransfer.id).status, TransferStatus.ACCEPTED);
  assert.equal(cases.get("c-esc").currentOfficeId, "off-bureau");
  assert.equal(cases.get("c-esc").status, CaseStatus.RECEIVED_BY_OFFICE);

  // 5. City Bureau is highest level: cannot escalate upward further
  await assert.rejects(
    () =>
      transfersService.initiateTransfer("u-bureau-officer", "CC-2026-00200", {
        toOfficeId: "off-sc-bole",
        direction: TransferDirection.UPWARD_ESCALATION,
        handoverNote: "City Bureau cannot escalate upward",
      }),
    (err) => err.response?.code === "TERMINAL_LEVEL",
  );
});
