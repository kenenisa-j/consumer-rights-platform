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
import { QuerySlaDto } from "../backend/dist/modules/sla/dto/query-sla.dto.js";
import { SlaUrgency } from "../backend/dist/modules/sla/sla.types.js";
import { evaluateCaseSla } from "../backend/dist/modules/sla/sla.helpers.js";
import { SlaService } from "../backend/dist/modules/sla/sla.service.js";
import {
  GovernmentSlaController,
  BusinessSlaController,
} from "../backend/dist/modules/sla/sla.controller.js";

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialMerchantUsers = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const merchantUsers = [...initialMerchantUsers];

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
    merchantUser: {
      findFirst: async ({ where }) => {
        return merchantUsers.find((mu) => mu.userId === where.userId) || null;
      },
    },
    case: {
      findUnique: async ({ where }) => {
        return Array.from(cases.values()).find(
          (c) => c.id === where.id || c.referenceNumber === where.referenceNumber,
        ) || null;
      },
      findMany: async ({ where = {}, skip = 0, take = 50 }) => {
        let list = Array.from(cases.values());
        if (where.status?.notIn) {
          list = list.filter((c) => !where.status.notIn.includes(c.status));
        }
        if (where.currentOfficeId) {
          list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        }
        if (where.merchantId) {
          list = list.filter((c) => c.merchantId === where.merchantId);
        }
        if (where.slaDeadline?.lt) {
          list = list.filter((c) => c.slaDeadline && c.slaDeadline < where.slaDeadline.lt);
        }
        if (where.slaDeadline?.gte && where.slaDeadline?.lte) {
          list = list.filter(
            (c) => c.slaDeadline && c.slaDeadline >= where.slaDeadline.gte && c.slaDeadline <= where.slaDeadline.lte,
          );
        }
        return list.slice(skip, skip + take);
      },
      count: async ({ where = {} } = {}) => {
        let list = Array.from(cases.values());
        if (where.status?.notIn) {
          list = list.filter((c) => !where.status.notIn.includes(c.status));
        }
        if (where.currentOfficeId) {
          list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        }
        if (where.merchantId) {
          list = list.filter((c) => c.merchantId === where.merchantId);
        }
        if (where.slaDeadline?.lt) {
          list = list.filter((c) => c.slaDeadline && c.slaDeadline < where.slaDeadline.lt);
        }
        return list.length;
      },
    },
  };

  return { mock, cases, offices, users, merchantUsers };
}

const mockOffices = [
  { id: "off-woreda-1", code: "WO-01", nameEn: "Woreda 01", level: OfficeLevel.WOREDA, subcityCode: "BOLE" },
  { id: "off-woreda-2", code: "WO-02", nameEn: "Woreda 02", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS" },
];

const mockUsers = [
  {
    id: "u-officer-woreda1",
    fullName: "Abebe Officer",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-woreda-1", isActive: true }],
    status: "ACTIVE",
  },
  {
    id: "u-officer-woreda2",
    fullName: "Chala Other",
    roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
    offices: [{ officeId: "off-woreda-2", isActive: true }],
    status: "ACTIVE",
  },
  {
    id: "u-business-user",
    fullName: "Merchant Contact",
    roles: [{ role: { code: RoleCode.BUSINESS_OWNER } }],
    offices: [],
    status: "ACTIVE",
  },
];

const mockMerchantUsers = [
  {
    userId: "u-business-user",
    merchantId: "merch-1",
    merchant: { id: "merch-1", tradeName: "Super Flour", isActive: true },
  },
];

test("Phase 4.10: DTO validation rules for SLA query", async () => {
  const invalid = plainToInstance(QuerySlaDto, { page: 0, limit: 150 });
  const errors = await validate(invalid);
  assert.ok(errors.length >= 2, "Expected errors for page < 1 and limit > 100");

  const valid = plainToInstance(QuerySlaDto, { page: 1, limit: 50, urgency: SlaUrgency.OVERDUE });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 4.10: SLA calculation helpers evaluate urgency states correctly", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");

  // 1. Overdue case
  const overdueCase = {
    status: CaseStatus.OFFICER_ASSIGNED,
    slaDeadline: new Date("2026-11-15T08:00:00.000Z"),
    createdAt: new Date("2026-11-10T12:00:00.000Z"),
  };
  const overdueRes = evaluateCaseSla(overdueCase, now);
  assert.equal(overdueRes.urgency, SlaUrgency.OVERDUE);
  assert.equal(overdueRes.isOverdue, true);
  assert.ok(overdueRes.hoursRemaining < 0);

  // 2. Approaching case (within 24h)
  const approachingCase = {
    status: CaseStatus.UNDER_INITIAL_REVIEW,
    slaDeadline: new Date("2026-11-16T08:00:00.000Z"),
    createdAt: new Date("2026-11-11T12:00:00.000Z"),
  };
  const approachingRes = evaluateCaseSla(approachingCase, now);
  assert.equal(approachingRes.urgency, SlaUrgency.APPROACHING);
  assert.equal(approachingRes.isOverdue, false);
  assert.equal(approachingRes.hoursRemaining, 20);

  // 3. On-track case (> 24h remaining)
  const onTrackCase = {
    status: CaseStatus.RECEIVED_BY_OFFICE,
    slaDeadline: new Date("2026-11-20T12:00:00.000Z"),
    createdAt: new Date("2026-11-15T10:00:00.000Z"),
  };
  const onTrackRes = evaluateCaseSla(onTrackCase, now);
  assert.equal(onTrackRes.urgency, SlaUrgency.NORMAL);
  assert.equal(onTrackRes.isOverdue, false);

  // 4. Paused case
  const pausedCase = {
    status: CaseStatus.INSPECTION_PENDING,
    slaDeadline: new Date("2026-11-15T08:00:00.000Z"),
    createdAt: new Date("2026-11-10T12:00:00.000Z"),
    slaPauses: [{ pausedAt: new Date("2026-11-14T00:00:00.000Z"), resumedAt: null }],
  };
  const pausedRes = evaluateCaseSla(pausedCase, now);
  assert.equal(pausedRes.urgency, SlaUrgency.PAUSED);
  assert.equal(pausedRes.isPaused, true);
  assert.equal(pausedRes.isOverdue, false);

  // 5. Resolved case
  const resolvedCase = {
    status: CaseStatus.RESOLVED_MUTUALLY,
    slaDeadline: new Date("2026-11-10T00:00:00.000Z"),
    createdAt: new Date("2026-11-05T00:00:00.000Z"),
  };
  const resolvedRes = evaluateCaseSla(resolvedCase, now);
  assert.equal(resolvedRes.isOverdue, false);
});

test("Phase 4.10: Government SLA overview calculates metrics within jurisdiction", async () => {
  const now = new Date();
  const past = new Date(now.getTime() - 48 * 3600 * 1000);
  const nearFuture = new Date(now.getTime() + 12 * 3600 * 1000);
  const farFuture = new Date(now.getTime() + 100 * 3600 * 1000);

  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      { id: "c-1", referenceNumber: "CC-001", currentOfficeId: "off-woreda-1", status: CaseStatus.OFFICER_ASSIGNED, slaDeadline: past, createdAt: past },
      { id: "c-2", referenceNumber: "CC-002", currentOfficeId: "off-woreda-1", status: CaseStatus.UNDER_INITIAL_REVIEW, slaDeadline: nearFuture, createdAt: now },
      { id: "c-3", referenceNumber: "CC-003", currentOfficeId: "off-woreda-1", status: CaseStatus.RECEIVED_BY_OFFICE, slaDeadline: farFuture, createdAt: now },
      { id: "c-4", referenceNumber: "CC-004", currentOfficeId: "off-woreda-2", status: CaseStatus.OFFICER_ASSIGNED, slaDeadline: past, createdAt: past }, // Other office
    ],
  });

  const service = new SlaService(mock);
  const overview = await service.getGovernmentSlaOverview("u-officer-woreda1");

  // Only the 3 cases in woreda 1 are counted
  assert.equal(overview.totalMonitored, 3);
  assert.equal(overview.overdueCount, 1);
  assert.equal(overview.approachingCount, 1);
  assert.equal(overview.onTrackCount, 1);
  assert.equal(overview.complianceRatePercent, 67); // 2 compliant out of 3
});

test("Phase 4.10: Business SLA overview restricts data to merchant complaints", async () => {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 3600 * 1000);

  const { mock } = createMockPrisma({
    initialUsers: mockUsers,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      { id: "c-1", referenceNumber: "CC-101", merchantId: "merch-1", status: CaseStatus.SUBMITTED_TO_BUSINESS, slaDeadline: past, createdAt: past },
      { id: "c-2", referenceNumber: "CC-102", merchantId: "merch-other", status: CaseStatus.SUBMITTED_TO_BUSINESS, slaDeadline: past, createdAt: past },
    ],
  });

  const service = new SlaService(mock);
  const overview = await service.getBusinessSlaOverview("u-business-user");

  assert.equal(overview.totalMonitored, 1);
  assert.equal(overview.overdueCount, 1);
});

test("Phase 4.10: Government and Business SLA controllers have proper authorization decorators", () => {
  const govProto = GovernmentSlaController.prototype;
  const govMethods = Object.getOwnPropertyNames(govProto).filter(
    (m) => m !== "constructor" && typeof govProto[m] === "function",
  );
  assert.equal(govMethods.length, 4);
  for (const method of govMethods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", govProto[method]) ||
      Reflect.hasMetadata("requirePermission", govProto[method]);
    assert.ok(hasPermission, `GovernmentSlaController.${method} missing @RequirePermission`);
  }

  const bizProto = BusinessSlaController.prototype;
  const bizMethods = Object.getOwnPropertyNames(bizProto).filter(
    (m) => m !== "constructor" && typeof bizProto[m] === "function",
  );
  assert.equal(bizMethods.length, 2);
  for (const method of bizMethods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", bizProto[method]) ||
      Reflect.hasMetadata("requirePermission", bizProto[method]);
    assert.ok(hasPermission, `BusinessSlaController.${method} missing @RequirePermission`);
  }
});

