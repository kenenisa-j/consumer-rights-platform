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
import { QueryReportsDto } from "../backend/dist/modules/reports/dto/query-reports.dto.js";
import { ReportsService } from "../backend/dist/modules/reports/reports.service.js";
import {
  GovernmentReportsController,
  BusinessReportsController,
} from "../backend/dist/modules/reports/reports.controller.js";

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialMerchantUsers = [],
  initialTransfers = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const merchantUsers = [...initialMerchantUsers];
  const transfers = [...initialTransfers];

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
      findMany: async ({ where = {}, select }) => {
        let list = Array.from(cases.values());
        if (where.currentOfficeId) {
          list = list.filter((c) => c.currentOfficeId === where.currentOfficeId);
        }
        if (where.merchantId) {
          list = list.filter((c) => c.merchantId === where.merchantId);
        }
        if (where.status?.in) {
          list = list.filter((c) => where.status.in.includes(c.status));
        }
        if (where.createdAt?.gte) {
          list = list.filter((c) => c.createdAt >= where.createdAt.gte);
        }
        if (where.createdAt?.lte) {
          list = list.filter((c) => c.createdAt <= where.createdAt.lte);
        }
        return list.map((c) => {
          const res = { ...c };
          if (select?.category) res.category = c.category;
          if (select?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
          return res;
        });
      },
    },
    caseTransfer: {
      findMany: async ({ where = {} } = {}) => {
        return transfers;
      },
    },
  };

  return { mock, cases, offices, users, merchantUsers, transfers };
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

test("Phase 4.12: DTO validation rules for reports query", async () => {
  const invalid = plainToInstance(QueryReportsDto, { startDate: "invalid-date" });
  const errors = await validate(invalid);
  assert.ok(errors.length >= 1, "Expected validation error for invalid date format");

  const valid = plainToInstance(QueryReportsDto, {
    startDate: "2026-11-01T00:00:00.000Z",
    endDate: "2026-11-15T00:00:00.000Z",
    officeId: "off-woreda-1",
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 4.12: Government overview report aggregates complaint volumes accurately", async () => {
  const now = new Date();
  const past = new Date(now.getTime() - 48 * 3600 * 1000);
  const overdueDeadline = new Date(now.getTime() - 24 * 3600 * 1000);
  const futureDeadline = new Date(now.getTime() + 48 * 3600 * 1000);

  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "c-1",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
        createdAt: past,
        updatedAt: now,
        slaDeadline: futureDeadline,
      },
      {
        id: "c-2",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.CLOSED_WITHDRAWN,
        createdAt: past,
        updatedAt: now,
        slaDeadline: futureDeadline,
      },
      {
        id: "c-3",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.OFFICER_ASSIGNED,
        createdAt: past,
        updatedAt: now,
        slaDeadline: overdueDeadline,
      },
      {
        id: "c-4",
        currentOfficeId: "off-woreda-2", // outside jurisdiction
        status: CaseStatus.OFFICER_ASSIGNED,
        createdAt: past,
        updatedAt: now,
        slaDeadline: futureDeadline,
      },
    ],
  });

  const service = new ReportsService(mock);
  const overview = await service.getGovernmentOverview("u-officer-woreda1", {});

  assert.equal(overview.totalComplaints, 3);
  assert.equal(overview.resolvedCount, 1);
  assert.equal(overview.closedCount, 1);
  assert.equal(overview.openCount, 1);
  assert.equal(overview.overdueCount, 1);
  assert.ok(overview.averageResolutionDays >= 1);
});

test("Phase 4.12: Cases by status distribution returns percentages and counts", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      { id: "c-1", currentOfficeId: "off-woreda-1", status: CaseStatus.RECEIVED_BY_OFFICE },
      { id: "c-2", currentOfficeId: "off-woreda-1", status: CaseStatus.RECEIVED_BY_OFFICE },
      { id: "c-3", currentOfficeId: "off-woreda-1", status: CaseStatus.RESOLVED_MUTUALLY },
    ],
  });

  const service = new ReportsService(mock);
  const distribution = await service.getGovernmentCasesByStatus("u-officer-woreda1", {});

  assert.equal(distribution.length, 2);
  const receivedItem = distribution.find((d) => d.status === CaseStatus.RECEIVED_BY_OFFICE);
  assert.equal(receivedItem.count, 2);
  assert.equal(receivedItem.percentage, 66.7);
});

test("Phase 4.12: Business reports restrict results to authenticated merchant", async () => {
  const { mock } = createMockPrisma({
    initialUsers: mockUsers,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      { id: "c-1", merchantId: "merch-1", status: CaseStatus.RESOLVED_MUTUALLY },
      { id: "c-2", merchantId: "merch-1", status: CaseStatus.SUBMITTED_TO_BUSINESS },
      { id: "c-3", merchantId: "merch-other", status: CaseStatus.SUBMITTED_TO_BUSINESS },
    ],
  });

  const service = new ReportsService(mock);
  const overview = await service.getBusinessOverview("u-business-user", {});

  assert.equal(overview.totalComplaints, 2);
  assert.equal(overview.resolvedCount, 1);
  assert.equal(overview.openCount, 1);
  assert.equal(overview.settlementRatePercent, 50);
});

test("Phase 4.12: Zero division and empty datasets handled safely", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [],
  });

  const service = new ReportsService(mock);
  const overview = await service.getGovernmentOverview("u-officer-woreda1", {});

  assert.equal(overview.totalComplaints, 0);
  assert.equal(overview.openCount, 0);
  assert.equal(overview.resolvedCount, 0);
  assert.equal(overview.averageResolutionDays, 0);
  assert.equal(overview.slaComplianceRatePercent, 100);
});

test("Phase 4.12: Government and Business Reports controllers have authorization decorators", () => {
  const govProto = GovernmentReportsController.prototype;
  const govMethods = Object.getOwnPropertyNames(govProto).filter(
    (m) => m !== "constructor" && typeof govProto[m] === "function",
  );
  assert.equal(govMethods.length, 8);
  for (const method of govMethods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", govProto[method]) ||
      Reflect.hasMetadata("requirePermission", govProto[method]);
    assert.ok(hasPermission, `GovernmentReportsController.${method} missing @RequirePermission`);
  }

  const bizProto = BusinessReportsController.prototype;
  const bizMethods = Object.getOwnPropertyNames(bizProto).filter(
    (m) => m !== "constructor" && typeof bizProto[m] === "function",
  );
  assert.equal(bizMethods.length, 5);
  for (const method of bizMethods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", bizProto[method]) ||
      Reflect.hasMetadata("requirePermission", bizProto[method]);
    assert.ok(hasPermission, `BusinessReportsController.${method} missing @RequirePermission`);
  }
});

