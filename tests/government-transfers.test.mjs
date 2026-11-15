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
import { InitiateTransferDto } from "../backend/dist/modules/cases/dto/initiate-transfer.dto.js";
import { AcceptTransferDto } from "../backend/dist/modules/cases/dto/accept-transfer.dto.js";
import { RejectTransferDto } from "../backend/dist/modules/cases/dto/reject-transfer.dto.js";
import { GovernmentTransfersService } from "../backend/dist/modules/cases/government-transfers.service.js";
import { GovernmentTransfersController } from "../backend/dist/modules/cases/government-transfers.controller.js";

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialTransfers = [],
  initialAssignments = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
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
      findFirst: async ({ where }) =>
        Array.from(offices.values()).find(
          (o) => (!where.level || o.level === where.level) && (!where.isActive || o.isActive === where.isActive),
        ) || null,
    },
    case: {
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find(
          (x) => x.id === where.id || x.referenceNumber === where.referenceNumber,
        );
        if (!c) return null;
        const res = { ...c };
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
        if (include?.transfers) {
          res.transfers = Array.from(transfers.values()).filter(
            (t) => t.caseId === c.id && (!include.transfers.where?.status || t.status === include.transfers.where.status),
          );
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
        if (where?.caseId) list = list.filter((t) => t.caseId === where.caseId);
        if (where?.status) list = list.filter((t) => t.status === where.status);
        if (where?.toOfficeId) list = list.filter((t) => t.toOfficeId === where.toOfficeId);
        if (where?.fromOfficeId) list = list.filter((t) => t.fromOfficeId === where.fromOfficeId);
        if (where?.toOffice?.subcityCode) {
          list = list.filter((t) => offices.get(t.toOfficeId)?.subcityCode === where.toOffice.subcityCode);
        }
        if (where?.fromOffice?.subcityCode) {
          list = list.filter((t) => offices.get(t.fromOfficeId)?.subcityCode === where.fromOffice.subcityCode);
        }
        return list.map((t) => {
          const res = { ...t };
          if (include?.fromOffice) res.fromOffice = offices.get(t.fromOfficeId);
          if (include?.toOffice) res.toOffice = offices.get(t.toOfficeId);
          if (include?.initiatedBy) res.initiatedBy = users.get(t.initiatedByUserId);
          if (include?.respondedBy) res.respondedBy = users.get(t.respondedByUserId);
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
    caseAssignment: {
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

  return { mock, cases, transfers, assignments, historyStore, auditStore };
}

const mockOffices = [
  { id: "off-bureau", code: "AA-BUREAU", nameEn: "City Bureau", level: OfficeLevel.CITY_BUREAU, isActive: true },
  { id: "off-subcity-bole", code: "SC-BOLE", nameEn: "Bole Sub-City Office", level: OfficeLevel.SUBCITY, subcityCode: "BOLE", parentOfficeId: "off-bureau", isActive: true },
  { id: "off-woreda-bole01", code: "WO-BOLE-01", nameEn: "Bole Woreda 01", level: OfficeLevel.WOREDA, subcityCode: "BOLE", parentOfficeId: "off-subcity-bole", isActive: true },
  { id: "off-subcity-kirkos", code: "SC-KIRKOS", nameEn: "Kirkos Sub-City Office", level: OfficeLevel.SUBCITY, subcityCode: "KIRKOS", parentOfficeId: "off-bureau", isActive: true },
  { id: "off-woreda-kirkos02", code: "WO-KIR-02", nameEn: "Kirkos Woreda 02", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS", parentOfficeId: "off-subcity-kirkos", isActive: true },
];

const mockUsers = [
  { id: "u-woreda-officer", fullName: "Abebe Woreda", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-bole01", isActive: true }], status: "ACTIVE" },
  { id: "u-subcity-coord", fullName: "Tigist SubCity", roles: [{ role: { code: RoleCode.SUBCITY_COORDINATOR } }], offices: [{ officeId: "off-subcity-bole", isActive: true }], status: "ACTIVE" },
  { id: "u-bureau-admin", fullName: "Dawit Bureau", roles: [{ role: { code: RoleCode.BUREAU_ADMIN } }], offices: [{ officeId: "off-bureau", isActive: true }], status: "ACTIVE" },
  { id: "u-other-woreda", fullName: "Chala Kirkos", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-kirkos02", isActive: true }], status: "ACTIVE" },
];

test("Phase 4.8: Transfer DTO validation", async () => {
  const invalid = plainToInstance(InitiateTransferDto, { handoverNote: "shrt" }); // min 5 chars
  const errors = await validate(invalid);
  assert.ok(errors.length > 0);

  const valid = plainToInstance(InitiateTransferDto, {
    handoverNote: "Cross-jurisdiction price gouging network requires Sub-City coordination.",
    direction: TransferDirection.UPWARD_ESCALATION,
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);

  const invalidReject = plainToInstance(RejectTransferDto, { reason: "no" });
  assert.ok((await validate(invalidReject)).length > 0);
});

test("Phase 4.8: Woreda escalates to Sub-City parent office", async () => {
  const { mock, transfers, historyStore, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00501",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  const transfer = await service.initiateTransfer("u-woreda-officer", "CC-2026-00501", {
    handoverNote: "Investigation involves multi-woreda distributor operating across Bole.",
  });

  assert.ok(transfer.id);
  assert.equal(transfer.fromOfficeId, "off-woreda-bole01");
  assert.equal(transfer.toOfficeId, "off-subcity-bole");
  assert.equal(transfer.status, TransferStatus.PENDING_ACCEPTANCE);
  assert.equal(transfers.size, 1);
  assert.equal(historyStore.length, 1);
  assert.equal(auditStore.some((a) => a.actionCode === "TRANSFER_INITIATED"), true);
});

test("Phase 4.8: Invalid climb hierarchy is blocked (Woreda skipping to Bureau)", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00502",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  await assert.rejects(
    () =>
      service.initiateTransfer("u-woreda-officer", "CC-2026-00502", {
        toOfficeId: "off-bureau", // skipping Sub-City level!
        handoverNote: "Attempting to skip straight to city bureau.",
      }),
    (err) => err.response?.code === "INVALID_CLIMB",
  );
});

test("Phase 4.8: Sub-City escalates to City Bureau", async () => {
  const { mock, transfers } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00503",
        currentOfficeId: "off-subcity-bole",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  const transfer = await service.initiateTransfer("u-subcity-coord", "CC-2026-00503", {
    toOfficeId: "off-bureau",
    handoverNote: "City-wide supply chain violation requiring Bureau intervention.",
  });

  assert.ok(transfer.id);
  assert.equal(transfer.fromOfficeId, "off-subcity-bole");
  assert.equal(transfer.toOfficeId, "off-bureau");
  assert.equal(transfers.size, 1);
});

test("Phase 4.8: City Bureau cannot escalate upward (terminal level)", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00504",
        currentOfficeId: "off-bureau",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  await assert.rejects(
    () =>
      service.initiateTransfer("u-bureau-admin", "CC-2026-00504", {
        handoverNote: "Escalate beyond Bureau.",
      }),
    (err) => err.response?.code === "TERMINAL_LEVEL",
  );
});

test("Phase 4.8: Prevents transfer of closed or resolved cases", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00505",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  await assert.rejects(
    () =>
      service.initiateTransfer("u-woreda-officer", "CC-2026-00505", {
        handoverNote: "Attempting to transfer resolved complaint.",
      }),
    (err) => err.response?.code === "CANNOT_TRANSFER_CLOSED_CASE",
  );
});

test("Phase 4.8: Prevents duplicate pending transfers", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00506",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
    initialTransfers: [
      {
        id: "tr-existing",
        caseId: "case-1",
        fromOfficeId: "off-woreda-bole01",
        toOfficeId: "off-subcity-bole",
        status: TransferStatus.PENDING_ACCEPTANCE,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  await assert.rejects(
    () =>
      service.initiateTransfer("u-woreda-officer", "CC-2026-00506", {
        handoverNote: "Another transfer attempt.",
      }),
    (err) => err.response?.code === "PENDING_TRANSFER_EXISTS",
  );
});

test("Phase 4.8: Transfer acceptance updates custody and closes existing officer assignment", async () => {
  const { mock, cases, transfers, assignments, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00507",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
    initialTransfers: [
      {
        id: "tr-pending",
        caseId: "case-1",
        fromOfficeId: "off-woreda-bole01",
        toOfficeId: "off-subcity-bole",
        status: TransferStatus.PENDING_ACCEPTANCE,
      },
    ],
    initialAssignments: [
      {
        id: "as-prev",
        caseId: "case-1",
        assignedToUserId: "u-woreda-officer",
        isActive: true,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);

  // 1. Cross-office acceptance rejected (Kirkos officer trying to accept Bole transfer)
  await assert.rejects(
    () =>
      service.acceptTransfer("u-other-woreda", "tr-pending", {
        notes: "Intruding acceptance",
      }),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );

  // 2. Sub-City coordinator accepts incoming transfer
  const accepted = await service.acceptTransfer("u-subcity-coord", "tr-pending", {
    notes: "Accepted into Sub-City queue for multi-woreda investigation.",
  });

  assert.equal(accepted.success, true);
  assert.equal(accepted.status, CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(cases.get("case-1").currentOfficeId, "off-subcity-bole");
  assert.equal(transfers.get("tr-pending").status, TransferStatus.ACCEPTED);
  assert.equal(assignments.get("as-prev").isActive, false); // Previous assignment unassigned!
  assert.equal(auditStore.some((a) => a.actionCode === "TRANSFER_ACCEPTED"), true);

  // 3. Accepting an already accepted transfer is rejected
  await assert.rejects(
    () => service.acceptTransfer("u-subcity-coord", "tr-pending", {}),
    (err) => err.response?.code === "TRANSFER_ALREADY_RESOLVED",
  );
});

test("Phase 4.8: Rejecting/returning transfer with mandatory reason keeps custody with sending office", async () => {
  const { mock, cases, transfers, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00508",
        currentOfficeId: "off-woreda-bole01",
        status: CaseStatus.UNDER_INITIAL_REVIEW,
      },
    ],
    initialTransfers: [
      {
        id: "tr-pending",
        caseId: "case-1",
        fromOfficeId: "off-woreda-bole01",
        toOfficeId: "off-subcity-bole",
        status: TransferStatus.PENDING_ACCEPTANCE,
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);

  // 1. Rejection without reason fails validation
  await assert.rejects(
    () => service.rejectTransfer("u-subcity-coord", "tr-pending", { reason: " " }),
    (err) => err.response?.code === "REJECTION_REASON_REQUIRED",
  );

  // 2. Rejection with valid reason
  const result = await service.rejectTransfer("u-subcity-coord", "tr-pending", {
    reason: "Woreda has adequate jurisdiction to handle this merchant directly. Returning for local enforcement.",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, TransferStatus.RETURNED);
  assert.equal(transfers.get("tr-pending").status, TransferStatus.RETURNED);
  assert.equal(cases.get("case-1").currentOfficeId, "off-woreda-bole01"); // Custody unchanged!
  assert.equal(auditStore.some((a) => a.actionCode === "TRANSFER_RETURNED"), true);
});

test("Phase 4.8: Chronological transfer history query", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00509",
        currentOfficeId: "off-subcity-bole",
        status: CaseStatus.RECEIVED_BY_OFFICE,
      },
    ],
    initialTransfers: [
      {
        id: "tr-1",
        caseId: "case-1",
        fromOfficeId: "off-woreda-bole01",
        toOfficeId: "off-subcity-bole",
        status: TransferStatus.ACCEPTED,
        handoverNote: "First handover",
      },
    ],
  });

  const service = new GovernmentTransfersService(mock);
  const list = await service.getCaseTransfers("u-subcity-coord", "CC-2026-00509");
  assert.equal(list.length, 1);
  assert.equal(list[0].handoverNote, "First handover");
});

test("Phase 4.8: All GovernmentTransfersController routes have authorization decorators", () => {
  const proto = GovernmentTransfersController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  assert.equal(methods.length, 7, "GovernmentTransfersController must have exactly 7 endpoints");
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method GovernmentTransfersController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

