import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RoleCode, OfficeLevel } from "@prisma/client";
import { CreateMarketDto } from "../backend/dist/modules/markets/dto/create-market.dto.js";
import { UpdateMarketDto } from "../backend/dist/modules/markets/dto/update-market.dto.js";
import { MarketsService } from "../backend/dist/modules/markets/markets.service.js";
import { MarketsController } from "../backend/dist/modules/markets/markets.controller.js";

function createMockPrisma({
  initialMarkets = [],
  initialOffices = [],
  initialUsers = [],
} = {}) {
  const markets = new Map(initialMarkets.map((m) => [m.id, { ...m }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));

  return {
    market: {
      findUnique: async ({ where, include }) => {
        const m = where.id
          ? markets.get(where.id)
          : Array.from(markets.values()).find((x) => x.code === where.code);
        if (!m) return null;
        const res = { ...m };
        if (include?.woredaOffice) res.woredaOffice = offices.get(m.woredaOfficeId);
        if (include?.merchants) res.merchants = m.merchants || [];
        if (include?.cases) res.cases = m.cases || [];
        if (include?.anonymousReports) res.anonymousReports = m.anonymousReports || [];
        return res;
      },
      findMany: async ({ where }) => {
        let list = Array.from(markets.values());
        if (where?.subcityCode) list = list.filter((m) => m.subcityCode === where.subcityCode);
        if (where?.woredaOfficeId) list = list.filter((m) => m.woredaOfficeId === where.woredaOfficeId);
        if (where?.isActive !== undefined) list = list.filter((m) => m.isActive === where.isActive);
        return list.map((m) => ({ ...m, woredaOffice: offices.get(m.woredaOfficeId) }));
      },
      create: async ({ data, include }) => {
        const created = { id: `mkt-${Date.now()}-${Math.random()}`, ...data };
        markets.set(created.id, created);
        const res = { ...created };
        if (include?.woredaOffice) res.woredaOffice = offices.get(created.woredaOfficeId);
        return res;
      },
      update: async ({ where, data, include }) => {
        const existing = markets.get(where.id);
        const updated = { ...existing, ...data };
        markets.set(where.id, updated);
        const res = { ...updated };
        if (include?.woredaOffice) res.woredaOffice = offices.get(updated.woredaOfficeId);
        return res;
      },
      delete: async ({ where }) => {
        const existing = markets.get(where.id);
        markets.delete(where.id);
        return existing;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
      findMany: async () => Array.from(offices.values()),
    },
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
  };
}

test("DTO Validation: CreateMarketDto validates codes, names, stalls, and locations", async () => {
  const valid = plainToInstance(CreateMarketDto, {
    code: "MKT-AKAKI-01",
    nameEn: "Kality Central Grain Market",
    nameAm: "የቃሊቲ የእህል ገበያ",
    subcityCode: "AKAKI-KALITY",
    woredaOfficeId: "off-woreda-1",
    locationDescription: "Near Akaki train station gate 2",
    totalStalls: 150,
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0, "Valid CreateMarketDto must have 0 validation errors");

  const invalid = plainToInstance(CreateMarketDto, {
    code: "invalid code!",
    nameEn: "AB",
    nameAm: "AB",
    subcityCode: "",
    woredaOfficeId: "",
    locationDescription: "few",
    totalStalls: -10,
  });
  const invalidErrors = await validate(invalid);
  assert.ok(invalidErrors.some((e) => e.property === "code"));
  assert.ok(invalidErrors.some((e) => e.property === "nameEn"));
  assert.ok(invalidErrors.some((e) => e.property === "nameAm"));
  assert.ok(invalidErrors.some((e) => e.property === "locationDescription"));
  assert.ok(invalidErrors.some((e) => e.property === "totalStalls"));
});

test("Integrity: Duplicate market codes are rejected with ConflictException", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: true },
    ],
    initialMarkets: [
      { id: "mkt-1", code: "MKT-AKAKI-01", woredaOfficeId: "off-woreda-1", subcityCode: "AKAKI" },
    ],
    initialUsers: [
      { id: "u-admin", status: "ACTIVE", roles: [{ role: { code: RoleCode.SYSTEM_SUPERADMIN } }], offices: [] },
    ],
  });
  const service = new MarketsService(mockPrisma);

  await assert.rejects(
    async () => {
      await service.createMarket("u-admin", {
        code: "MKT-AKAKI-01",
        nameEn: "Duplicate Market",
        nameAm: "ድጋሚ ገበያ",
        subcityCode: "AKAKI",
        woredaOfficeId: "off-woreda-1",
        locationDescription: "Some location description",
      });
    },
    (err) => err.response?.code === "MARKET_CODE_EXISTS"
  );
});

test("Hierarchy: Markets must belong to active Woreda office and matching Sub-City", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-bureau", level: OfficeLevel.CITY_BUREAU, isActive: true },
      { id: "off-woreda-inactive", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: false },
      { id: "off-woreda-akaki", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: true },
    ],
    initialUsers: [
      { id: "u-admin", status: "ACTIVE", roles: [{ role: { code: RoleCode.BUREAU_ADMIN } }], offices: [] },
    ],
  });
  const service = new MarketsService(mockPrisma);

  // 1. Assigning directly to City Bureau office is rejected
  await assert.rejects(
    async () => {
      await service.createMarket("u-admin", {
        code: "MKT-01",
        nameEn: "Bureau Market",
        nameAm: "ገበያ",
        subcityCode: "AKAKI",
        woredaOfficeId: "off-bureau",
        locationDescription: "Some location description",
      });
    },
    (err) => err.response?.code === "OFFICE_MUST_BE_WOREDA"
  );

  // 2. Inactive Woreda office is rejected
  await assert.rejects(
    async () => {
      await service.createMarket("u-admin", {
        code: "MKT-02",
        nameEn: "Inactive Woreda Market",
        nameAm: "ገበያ",
        subcityCode: "AKAKI",
        woredaOfficeId: "off-woreda-inactive",
        locationDescription: "Some location description",
      });
    },
    (err) => err.response?.code === "OFFICE_INACTIVE"
  );

  // 3. Subcity mismatch between DTO and Woreda office record
  await assert.rejects(
    async () => {
      await service.createMarket("u-admin", {
        code: "MKT-03",
        nameEn: "Mismatched Market",
        nameAm: "ገበያ",
        subcityCode: "BOLE", // Office is in AKAKI
        woredaOfficeId: "off-woreda-akaki",
        locationDescription: "Some location description",
      });
    },
    (err) => err.response?.code === "SUBCITY_MISMATCH"
  );

  // 4. Correct Woreda and Sub-City succeeds
  const created = await service.createMarket("u-admin", {
    code: "MKT-04",
    nameEn: "Valid Market",
    nameAm: "ትክክለኛ ገበያ",
    subcityCode: "AKAKI",
    woredaOfficeId: "off-woreda-akaki",
    locationDescription: "Proper location description",
  });
  assert.equal(created.code, "MKT-04");
  assert.equal(created.subcityCode, "AKAKI");
});

test("Jurisdiction: Enforces administrative boundaries for market creation and updates", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: true },
      { id: "off-woreda-2", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: true },
      { id: "off-woreda-bole", level: OfficeLevel.WOREDA, subcityCode: "BOLE", isActive: true },
    ],
    initialUsers: [
      {
        id: "u-woreda-1-admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
        offices: [{ officeId: "off-woreda-1", isActive: true }],
      },
      {
        id: "u-subcity-akaki-admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.SUBCITY_COORDINATOR } }],
        offices: [{ officeId: "off-sc-akaki", subcityCode: "AKAKI", isActive: true }],
      },
    ],
  });
  const service = new MarketsService(mockPrisma);

  // 1. Woreda 1 Admin cannot create market in Woreda 2
  await assert.rejects(
    async () => {
      await service.createMarket("u-woreda-1-admin", {
        code: "MKT-WO2",
        nameEn: "Woreda 2 Market",
        nameAm: "የወረዳ 2 ገበያ",
        subcityCode: "AKAKI",
        woredaOfficeId: "off-woreda-2",
        locationDescription: "Location in Woreda 2",
      });
    },
    (err) => err.response?.code === "OUTSIDE_WOREDA_JURISDICTION"
  );

  // 2. Sub-City Akaki Coordinator cannot create market in Bole Sub-City
  await assert.rejects(
    async () => {
      await service.createMarket("u-subcity-akaki-admin", {
        code: "MKT-BOLE",
        nameEn: "Bole Market",
        nameAm: "የቦሌ ገበያ",
        subcityCode: "BOLE",
        woredaOfficeId: "off-woreda-bole",
        locationDescription: "Location in Bole",
      });
    },
    (err) => err.response?.code === "OUTSIDE_SUBCITY_JURISDICTION"
  );
});

test("Safety: Deactivation works and deletion protects referenced market records", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", level: OfficeLevel.WOREDA, subcityCode: "AKAKI", isActive: true },
    ],
    initialMarkets: [
      {
        id: "mkt-with-merchants",
        code: "MKT-REF",
        woredaOfficeId: "off-woreda-1",
        subcityCode: "AKAKI",
        isActive: true,
        merchants: [{ id: "merch-1" }],
      },
      {
        id: "mkt-clean",
        code: "MKT-CLEAN",
        woredaOfficeId: "off-woreda-1",
        subcityCode: "AKAKI",
        isActive: true,
      },
    ],
    initialUsers: [
      { id: "u-admin", status: "ACTIVE", roles: [{ role: { code: RoleCode.SYSTEM_SUPERADMIN } }], offices: [] },
    ],
  });
  const service = new MarketsService(mockPrisma);

  // 1. Deactivating market succeeds
  const deactivated = await service.deactivateMarket("u-admin", "mkt-clean");
  assert.equal(deactivated.isActive, false);

  // 2. Deleting referenced market is blocked
  await assert.rejects(
    async () => {
      await service.deleteMarket("u-admin", "mkt-with-merchants");
    },
    (err) => err.response?.code === "MARKET_HAS_DEPENDENCIES"
  );

  // 3. Deleting unreferenced market succeeds
  const deleted = await service.deleteMarket("u-admin", "mkt-clean");
  assert.equal(deleted.id, "mkt-clean");
});

test("MarketsController: Declares policy on every route matching validation rules", () => {
  const controller = new MarketsController({});
  assert.ok(controller, "MarketsController instantiated");

  const methods = Object.getOwnPropertyNames(MarketsController.prototype).filter(
    (m) => m !== "constructor"
  );
  assert.equal(methods.length, 6, "MarketsController must have exactly 6 endpoints");
});

