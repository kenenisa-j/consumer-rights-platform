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
  TransferDirection,
  TransferStatus,
} from "@prisma/client";
import { QueryGovernmentCasesDto } from "../backend/dist/modules/cases/dto/query-government-cases.dto.js";
import { AcceptTransferDto } from "../backend/dist/modules/cases/dto/accept-transfer.dto.js";
import { TriageCaseDto } from "../backend/dist/modules/cases/dto/triage-case.dto.js";
import { AssignOfficerDto } from "../backend/dist/modules/cases/dto/assign-officer.dto.js";
import { GovernmentCasesService } from "../backend/dist/modules/cases/government-cases.service.js";
import { GovernmentCasesController } from "../backend/dist/modules/cases/government-cases.controller.js";

function createMockPrisma({
  initialCases = [],
  initialCategories = [],
  initialOffices = [],
  initialUsers = [],
  initialTransfers = [],
  initialAssignments = [],
  initialEvidence = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const categories = new Map(initialCategories.map((cat) => [cat.id, { ...cat }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const transfers = new Map(initialTransfers.map((t) => [t.id, { ...t }]));
  const assignments = new Map(initialAssignments.map((a) => [a.id, { ...a }]));
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
      count: async ({ where }) => {
        let list = Array.from(cases.values());
        if (where?.currentOfficeId) list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        if (where?.currentOffice?.subcityCode) {
          list = list.filter((c) => offices.get(c.currentOfficeId)?.subcityCode === where.currentOffice.subcityCode);
        }
        if (where?.status) list = list.filter((c) => c.status === where.status);
        if (where?.route) list = list.filter((c) => c.route === where.route);
        return list.length;
      },
      findMany: async ({ where, skip = 0, take = 20, include }) => {
        let list = Array.from(cases.values());
        if (where?.currentOfficeId) list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        if (where?.currentOffice?.subcityCode) {
          list = list.filter((c) => offices.get(c.currentOfficeId)?.subcityCode === where.currentOffice.subcityCode);
        }
        if (where?.status) list = list.filter((c) => c.status === where.status);
        if (where?.route) list = list.filter((c) => c.route === where.route);

        return list.slice(skip, skip + take).map((c) => {
          const res = { ...c };
          if (include?.category) res.category = categories.get(c.categoryId);
          if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId);
          if (include?.assignments) {
            res.assignments = Array.from(assignments.values())
              .filter((a) => a.caseId === c.id && a.isActive)
              .map((a) => ({ ...a, assignedTo: users.get(a.assignedToUserId) }));
          }
          if (include?.transfers) {
            res.transfers = Array.from(transfers.values()).filter(
              (t) => t.caseId === c.id && t.status === TransferStatus.PENDING_ACCEPTANCE,
            );
          }
          return res;
        });
      },
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find((x) => x.referenceNumber === where.referenceNumber);
        if (!c) return null;
        const res = { ...c };
        if (include?.category) res.category = categories.get(c.categoryId);
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId);
        if (include?.assignments) {
          res.assignments = Array.from(assignments.values())
            .filter((a) => a.caseId === c.id)
            .map((a) => ({
              ...a,
              assignedTo: users.get(a.assignedToUserId),
              assignedBy: users.get(a.assignedByUserId),
            }));
        }
        if (include?.transfers) {
          res.transfers = Array.from(transfers.values())
            .filter((t) => t.caseId === c.id)
            .map((t) => ({
              ...t,
              fromOffice: offices.get(t.fromOfficeId),
              toOffice: offices.get(t.toOfficeId),
              initiatedBy: users.get(t.initiatedByUserId),
              respondedBy: users.get(t.respondedByUserId),
            }));
        }
        if (include?.evidenceFiles) {
          res.evidenceFiles = initialEvidence.filter((e) => e.caseId === c.id);
        }
        if (include?.history) {
          res.history = historyStore
            .filter((h) => h.caseId === c.id)
            .map((h) => ({ ...h, actor: users.get(h.actorUserId) || { fullName: "System/Officer" } }));
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
    caseTransfer: {
      findUnique: async ({ where, include }) => {
        const t = transfers.get(where.id);
        if (!t) return null;
        const res = { ...t };
        if (include?.toOffice) res.toOffice = offices.get(t.toOfficeId);
        if (include?.case) res.case = cases.get(t.caseId);
        return res;
      },
      findMany: async ({ where, include }) => {
        let list = Array.from(transfers.values());
        if (where?.status) list = list.filter((t) => t.status === where.status);
        if (where?.toOfficeId) list = list.filter((t) => t.toOfficeId === where.toOfficeId);
        if (where?.toOffice?.subcityCode) {
          list = list.filter((t) => offices.get(t.toOfficeId)?.subcityCode === where.toOffice.subcityCode);
        }
        return list.map((t) => {
          const res = { ...t };
          if (include?.case) res.case = cases.get(t.caseId);
          if (include?.fromOffice) res.fromOffice = offices.get(t.fromOfficeId);
          if (include?.toOffice) res.toOffice = offices.get(t.toOfficeId);
          if (include?.initiatedBy) res.initiatedBy = users.get(t.initiatedByUserId);
          return res;
        });
      },
      update: async ({ where, data }) => {
        const t = transfers.get(where.id);
        const updated = { ...t, ...data };
        transfers.set(where.id, updated);
        return updated;
      },
    },
    caseAssignment: {
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const [id, a] of assignments.entries()) {
          if (a.caseId === where.caseId && a.isActive === where.isActive) {
            assignments.set(id, { ...a, ...data });
            count++;
          }
        }
        return { count };
      },
      create: async ({ data }) => {
        const id = `asgn-${Date.now()}-${Math.random()}`;
        const a = { id, assignedAt: new Date(), ...data };
        assignments.set(id, a);
        return a;
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

  return { mock, historyStore, auditStore, cases, assignments, transfers };
}

test("Phase 4.4: Government DTO validation", async () => {
  const invalidTriage = plainToInstance(TriageCaseDto, { priority: "A".repeat(100) });
  const triageErrors = await validate(invalidTriage);
  assert.ok(triageErrors.length > 0);

  const invalidAssign = plainToInstance(AssignOfficerDto, { officerId: "" });
  const assignErrors = await validate(invalidAssign);
  assert.ok(assignErrors.length > 0);

  const validAssign = plainToInstance(AssignOfficerDto, { officerId: "u-officer-1", notes: "Priority review" });
  assert.equal((await validate(validAssign)).length, 0);
});

test("Phase 4.4: Government inbox returns only cases within officer's jurisdiction", async () => {
  const { mock } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", code: "WO-07", level: OfficeLevel.WOREDA, subcityCode: "AKAKI-KALITY", isActive: true },
      { id: "off-w8", code: "WO-08", level: OfficeLevel.WOREDA, subcityCode: "AKAKI-KALITY", isActive: true },
    ],
    initialUsers: [
      {
        id: "u-w7-officer",
        fullName: "Meron Tadesse",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCategories: [{ id: "cat-1", nameEn: "Wrong weight", code: "WEIGHT" }],
    initialCases: [
      {
        id: "case-w7",
        referenceNumber: "CC-2026-00001",
        route: ComplaintRoute.DIRECT_GOVERNMENT,
        currentOfficeId: "off-w7",
        categoryId: "cat-1",
        itemDescription: "Woreda 7 case",
        disputedAmount: 100,
        currency: "ETB",
        status: CaseStatus.RECEIVED_BY_OFFICE,
        createdAt: new Date(),
      },
      {
        id: "case-w8",
        referenceNumber: "CC-2026-00002",
        route: ComplaintRoute.DIRECT_GOVERNMENT,
        currentOfficeId: "off-w8",
        categoryId: "cat-1",
        itemDescription: "Woreda 8 case",
        disputedAmount: 200,
        currency: "ETB",
        status: CaseStatus.RECEIVED_BY_OFFICE,
        createdAt: new Date(),
      },
    ],
  });

  const service = new GovernmentCasesService(mock);
  const result = await service.listCases("u-w7-officer", {});

  assert.equal(result.cases.length, 1);
  assert.equal(result.cases[0].referenceNumber, "CC-2026-00001");
});

test("Phase 4.4: Woreda officer cannot read another Woreda's case", async () => {
  const { mock } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", code: "WO-07", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-w8", code: "WO-08", level: OfficeLevel.WOREDA, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-w7-officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCases: [
      {
        id: "c-w8",
        referenceNumber: "CC-2026-00008",
        currentOfficeId: "off-w8",
      },
    ],
  });

  const service = new GovernmentCasesService(mock);
  await assert.rejects(
    () => service.getCaseByReference("u-w7-officer", "CC-2026-00008"),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );
});

test("Phase 4.4: Authorized officer accepts pending transfer; duplicate acceptance is rejected", async () => {
  const { mock, cases, transfers, historyStore } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", code: "WO-07", level: OfficeLevel.WOREDA, nameEn: "Woreda 7 Office", isActive: true },
    ],
    initialUsers: [
      {
        id: "u-w7-officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCases: [
      {
        id: "c-esc",
        referenceNumber: "CC-2026-00123",
        status: CaseStatus.ESCALATED_TO_GOVERNMENT,
        currentOfficeId: "off-w7",
      },
    ],
    initialTransfers: [
      {
        id: "tr-1",
        caseId: "c-esc",
        fromOfficeId: "off-w7",
        toOfficeId: "off-w7",
        status: TransferStatus.PENDING_ACCEPTANCE,
      },
    ],
  });

  const service = new GovernmentCasesService(mock);

  // 1. First acceptance succeeds
  const res = await service.acceptTransfer("u-w7-officer", "tr-1", { notes: "Transfer accepted by Woreda 7" });
  assert.equal(res.success, true);
  assert.equal(res.status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(cases.get("c-esc").status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(transfers.get("tr-1").status, TransferStatus.ACCEPTED);
  assert.equal(historyStore.length, 1);
  assert.equal(historyStore[0].toStatus, CaseStatus.RECEIVED_BY_OFFICE);

  // 2. Duplicate acceptance fails
  await assert.rejects(
    () => service.acceptTransfer("u-w7-officer", "tr-1", {}),
    (err) => err.response?.code === "TRANSFER_ALREADY_RESOLVED",
  );
});

test("Phase 4.4: Unauthorized officer from another office cannot accept transfer", async () => {
  const { mock } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", code: "WO-07", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-w8", code: "WO-08", level: OfficeLevel.WOREDA, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-w8-officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w8", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCases: [{ id: "c-1", referenceNumber: "CC-01", status: CaseStatus.ESCALATED_TO_GOVERNMENT }],
    initialTransfers: [
      { id: "tr-for-w7", caseId: "c-1", toOfficeId: "off-w7", status: TransferStatus.PENDING_ACCEPTANCE },
    ],
  });

  const service = new GovernmentCasesService(mock);
  await assert.rejects(
    () => service.acceptTransfer("u-w8-officer", "tr-for-w7", {}),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );
});

test("Phase 4.4: Triage decision moves case to UNDER_INITIAL_REVIEW and logs history", async () => {
  const { mock, cases, historyStore } = createMockPrisma({
    initialOffices: [{ id: "off-w7", level: OfficeLevel.WOREDA, isActive: true }],
    initialUsers: [
      {
        id: "u-w7-officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCases: [
      {
        id: "c-recv",
        referenceNumber: "CC-2026-00050",
        currentOfficeId: "off-w7",
        status: CaseStatus.RECEIVED_BY_OFFICE,
      },
    ],
  });

  const service = new GovernmentCasesService(mock);
  const res = await service.triageCase("u-w7-officer", "CC-2026-00050", {
    notes: "Evidence verified, requires on-site inspection",
    priority: "HIGH",
  });

  assert.equal(res.success, true);
  assert.equal(res.status, CaseStatus.UNDER_INITIAL_REVIEW);
  assert.equal(cases.get("c-recv").status, CaseStatus.UNDER_INITIAL_REVIEW);
  assert.equal(historyStore.length, 1);
});

test("Phase 4.4: Officer assignment succeeds; inactive or unrelated officer is rejected", async () => {
  const { mock, cases, assignments } = createMockPrisma({
    initialOffices: [
      { id: "off-w7", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-w8", level: OfficeLevel.WOREDA, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-admin",
        fullName: "Woreda Admin",
        roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
      {
        id: "u-eligible-officer",
        fullName: "Dawit Kebede",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
      {
        id: "u-other-officer",
        fullName: "Other Woreda Officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w8", isActive: true }],
        status: "ACTIVE",
      },
      {
        id: "u-inactive-officer",
        fullName: "Inactive Officer",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "SUSPENDED",
      },
    ],
    initialCases: [
      {
        id: "c-triage",
        referenceNumber: "CC-2026-00050",
        currentOfficeId: "off-w7",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
  });

  const service = new GovernmentCasesService(mock);

  // 1. Rejects inactive officer
  await assert.rejects(
    () => service.assignOfficer("u-admin", "CC-2026-00050", { officerId: "u-inactive-officer" }),
    (err) => err.response?.code === "OFFICER_NOT_ELIGIBLE",
  );

  // 2. Rejects officer not deployed in holding office
  await assert.rejects(
    () => service.assignOfficer("u-admin", "CC-2026-00050", { officerId: "u-other-officer" }),
    (err) => err.response?.code === "OFFICER_NOT_IN_OFFICE",
  );

  // 3. Valid assignment succeeds
  const assignRes = await service.assignOfficer("u-admin", "CC-2026-00050", { officerId: "u-eligible-officer" });
  assert.equal(assignRes.success, true);
  assert.equal(assignRes.status, CaseStatus.OFFICER_ASSIGNED);
  assert.equal(cases.get("c-triage").status, CaseStatus.OFFICER_ASSIGNED);
  assert.equal(assignments.size, 1);
});

test("Phase 4.4: Reassignment preserves history and maintains single active assignment", async () => {
  const { mock, assignments, historyStore } = createMockPrisma({
    initialOffices: [{ id: "off-w7", level: OfficeLevel.WOREDA, isActive: true }],
    initialUsers: [
      {
        id: "u-admin",
        roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
      {
        id: "u-off-1",
        fullName: "Officer One",
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
      {
        id: "u-off-2",
        fullName: "Officer Two",
        offices: [{ officeId: "off-w7", isActive: true }],
        status: "ACTIVE",
      },
    ],
    initialCases: [
      {
        id: "c-asgn",
        referenceNumber: "CC-2026-00050",
        currentOfficeId: "off-w7",
        status: CaseStatus.OFFICER_ASSIGNED,
      },
    ],
    initialAssignments: [
      {
        id: "asgn-1",
        caseId: "c-asgn",
        assignedToUserId: "u-off-1",
        assignedByUserId: "u-admin",
        officeId: "off-w7",
        isActive: true,
      },
    ],
  });

  const service = new GovernmentCasesService(mock);
  const reassignRes = await service.assignOfficer("u-admin", "CC-2026-00050", { officerId: "u-off-2" }, true);

  assert.equal(reassignRes.success, true);
  assert.equal(assignments.get("asgn-1").isActive, false); // Prior assignment deactivated
  assert.equal(assignments.size, 2); // New assignment added
  assert.equal(historyStore.length, 1);
  assert.ok(historyStore[0].publicNote.includes("Officer Two"));
});

test("Phase 4.4: Citizen and merchant users are forbidden from government operations", async () => {
  const { mock } = createMockPrisma({
    initialUsers: [
      {
        id: "u-citizen",
        roles: [{ role: { code: RoleCode.CONSUMER } }],
        status: "ACTIVE",
      },
    ],
  });

  const service = new GovernmentCasesService(mock);
  await assert.rejects(
    () => service.listCases("u-citizen", {}),
    (err) => err.response?.code === "NOT_GOVERNMENT_OFFICER",
  );
});

test("Phase 4.4: All GovernmentCasesController routes have authorization decorators", () => {
  const proto = GovernmentCasesController.prototype;
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
      `Method GovernmentCasesController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

