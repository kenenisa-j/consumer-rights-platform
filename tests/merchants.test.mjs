import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RoleCode, OfficeLevel } from "@prisma/client";
import { CreateMerchantDto } from "../backend/dist/modules/merchants/dto/create-merchant.dto.js";
import { UpdateMerchantDto } from "../backend/dist/modules/merchants/dto/update-merchant.dto.js";
import { AddMerchantUserDto } from "../backend/dist/modules/merchants/dto/add-merchant-user.dto.js";
import { MerchantsService } from "../backend/dist/modules/merchants/merchants.service.js";
import { BusinessDeskService } from "../backend/dist/modules/merchants/business-desk.service.js";
import { MerchantsController } from "../backend/dist/modules/merchants/merchants.controller.js";
import { BusinessMeController } from "../backend/dist/modules/merchants/business-me.controller.js";

function createMockPrisma({
  initialMerchants = [],
  initialMerchantUsers = [],
  initialOffices = [],
  initialMarkets = [],
  initialUsers = [],
  initialRoles = [],
} = {}) {
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const merchantUsers = new Map(initialMerchantUsers.map((mu) => [`${mu.merchantId}_${mu.userId}`, { ...mu }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const markets = new Map(initialMarkets.map((m) => [m.id, { ...m }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const roles = new Map(initialRoles.map((r) => [r.id, { ...r }]));
  const userRoles = new Map();

  const mock = {
    merchant: {
      findUnique: async ({ where, include }) => {
        const m = where.id
          ? merchants.get(where.id)
          : Array.from(merchants.values()).find((x) => x.registrationNumber === where.registrationNumber);
        if (!m) return null;
        const res = { ...m };
        if (include?.woredaOffice) res.woredaOffice = offices.get(m.woredaOfficeId);
        if (include?.market) res.market = markets.get(m.marketId);
        if (include?.staff || include?.users) {
          const staffList = Array.from(merchantUsers.values())
            .filter((mu) => mu.merchantId === m.id)
            .map((mu) => ({ ...mu, user: users.get(mu.userId) }));
          res.staff = staffList;
          res.users = staffList;
        }
        return res;
      },
      findMany: async ({ where, select }) => {
        let list = Array.from(merchants.values());
        if (where?.verificationStatus) list = list.filter((m) => m.verificationStatus === where.verificationStatus);
        if (where?.isActive !== undefined) list = list.filter((m) => m.isActive === where.isActive);
        if (where?.woredaOfficeId) list = list.filter((m) => m.woredaOfficeId === where.woredaOfficeId);
        if (where?.woredaOffice?.subcityCode) {
          list = list.filter((m) => {
            const off = offices.get(m.woredaOfficeId);
            return off && off.subcityCode === where.woredaOffice.subcityCode;
          });
        }
        if (where?.marketId) list = list.filter((m) => m.marketId === where.marketId);

        return list.map((m) => {
          if (select) {
            const s = {};
            for (const key of Object.keys(select)) {
              if (key === "market") s.market = markets.get(m.marketId) || null;
              else if (key === "woredaOffice") s.woredaOffice = offices.get(m.woredaOfficeId) || null;
              else s[key] = m[key];
            }
            return s;
          }
          return {
            ...m,
            woredaOffice: offices.get(m.woredaOfficeId),
            market: markets.get(m.marketId),
            staff: Array.from(merchantUsers.values())
              .filter((mu) => mu.merchantId === m.id)
              .map((mu) => ({ ...mu, user: users.get(mu.userId) })),
            users: Array.from(merchantUsers.values())
              .filter((mu) => mu.merchantId === m.id)
              .map((mu) => ({ ...mu, user: users.get(mu.userId) })),
          };
        });
      },
      create: async ({ data, include }) => {
        const created = { id: `merch-${Date.now()}-${Math.random()}`, ...data };
        merchants.set(created.id, created);
        const res = { ...created };
        if (include?.woredaOffice) res.woredaOffice = offices.get(created.woredaOfficeId);
        if (include?.market) res.market = markets.get(created.marketId);
        return res;
      },
      update: async ({ where, data }) => {
        const existing = merchants.get(where.id);
        const updated = { ...existing, ...data };
        merchants.set(where.id, updated);
        return updated;
      },
    },
    merchantUser: {
      findFirst: async ({ where, include }) => {
        const list = Array.from(merchantUsers.values());
        const match = list.find((mu) => {
          if (where.userId && mu.userId !== where.userId) return false;
          if (where.merchantId && mu.merchantId !== where.merchantId) return false;
          if (where.isPrimaryContact !== undefined && mu.isPrimaryContact !== where.isPrimaryContact) return false;
          return true;
        });
        if (!match) return null;
        const res = { ...match };
        if (include?.merchant) {
          const m = merchants.get(match.merchantId);
          res.merchant = {
            ...m,
            woredaOffice: offices.get(m.woredaOfficeId),
            market: markets.get(m.marketId),
          };
        }
        return res;
      },
      findUnique: async ({ where }) => {
        const key = `${where.merchantId_userId.merchantId}_${where.merchantId_userId.userId}`;
        return merchantUsers.get(key) || null;
      },
      findMany: async ({ where, include }) => {
        let list = Array.from(merchantUsers.values());
        if (where.merchantId) list = list.filter((mu) => mu.merchantId === where.merchantId);
        if (where.roleInBusiness) list = list.filter((mu) => mu.roleInBusiness === where.roleInBusiness);
        if (where.userId?.not) list = list.filter((mu) => mu.userId !== where.userId.not);
        return list.map((mu) => {
          const res = { ...mu };
          if (include?.user) res.user = users.get(mu.userId);
          return res;
        });
      },
      create: async ({ data, include }) => {
        const key = `${data.merchantId}_${data.userId}`;
        const created = { id: `mu-${Date.now()}`, ...data };
        merchantUsers.set(key, created);
        const res = { ...created };
        if (include?.user) res.user = users.get(data.userId);
        return res;
      },
      update: async ({ where, data }) => {
        const key = `${where.merchantId_userId.merchantId}_${where.merchantId_userId.userId}`;
        const existing = merchantUsers.get(key);
        const updated = { ...existing, ...data };
        merchantUsers.set(key, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const key = `${where.merchantId_userId.merchantId}_${where.merchantId_userId.userId}`;
        const existing = merchantUsers.get(key);
        merchantUsers.delete(key);
        return existing;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
    },
    market: {
      findUnique: async ({ where }) => markets.get(where.id) || null,
    },
    user: {
      findUnique: async ({ where, include }) => {
        const u = users.get(where.id);
        if (!u) return null;
        const res = { ...u };
        if (include?.roles) res.roles = u.roles || [];
        if (include?.offices) res.offices = u.offices || [];
        return res;
      },
    },
    role: {
      findUnique: async ({ where }) => Array.from(roles.values()).find((r) => r.code === where.code) || null,
    },
    userRole: {
      upsert: async ({ create }) => {
        userRoles.set(`${create.userId}_${create.roleId}`, create);
        return create;
      },
    },
    $transaction: async (cb) => cb(mock),
  };

  return mock;
}

test("Phase 3.5: Merchant DTO validation", async () => {
  const invalid = plainToInstance(CreateMerchantDto, {
    registrationNumber: "",
    tradeName: "",
    phoneNumber: "invalid-phone",
  });
  const errors = await validate(invalid);
  assert.ok(errors.length > 0);

  const valid = plainToInstance(CreateMerchantDto, {
    registrationNumber: "AA-TRD-12345",
    tradeName: "Ethio Coffee Exporters",
    businessType: "Wholesale",
    businessCategory: "Coffee",
    phoneNumber: "+251911223344",
    woredaOfficeId: "off-woreda-1",
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 3.5: Prevents duplicate registration numbers", async () => {
  const prisma = createMockPrisma({
    initialMerchants: [{ id: "m1", registrationNumber: "AA-TRD-0001", tradeName: "Existing Merchant" }],
    initialUsers: [{ id: "u-citizen", roles: [] }],
  });
  const service = new MerchantsService(prisma);

  await assert.rejects(
    () =>
      service.createMerchant("u-citizen", {
        registrationNumber: "AA-TRD-0001",
        tradeName: "Duplicate Merchant",
        woredaOfficeId: "off-woreda-1",
      }),
    (err) => err.response?.code === "MERCHANT_REG_EXISTS",
  );
});

test("Phase 3.5: Validates Woreda office must be active and level WOREDA", async () => {
  const prisma = createMockPrisma({
    initialOffices: [
      { id: "off-sc", level: OfficeLevel.SUBCITY, isActive: true },
      { id: "off-w-inactive", level: OfficeLevel.WOREDA, isActive: false },
    ],
    initialUsers: [{ id: "u-citizen", roles: [] }],
  });
  const service = new MerchantsService(prisma);

  await assert.rejects(
    () =>
      service.createMerchant("u-citizen", {
        registrationNumber: "AA-TRD-0002",
        tradeName: "Test Merchant",
        woredaOfficeId: "off-sc",
      }),
    (err) => err.response?.code === "OFFICE_MUST_BE_WOREDA",
  );

  await assert.rejects(
    () =>
      service.createMerchant("u-citizen", {
        registrationNumber: "AA-TRD-0003",
        tradeName: "Test Merchant",
        woredaOfficeId: "off-w-inactive",
      }),
    (err) => err.response?.code === "OFFICE_INACTIVE",
  );
});

test("Phase 3.5: Validates market must belong to the selected Woreda", async () => {
  const prisma = createMockPrisma({
    initialOffices: [{ id: "off-w1", level: OfficeLevel.WOREDA, isActive: true }],
    initialMarkets: [{ id: "mkt-other", woredaOfficeId: "off-w2", isActive: true }],
    initialUsers: [{ id: "u-citizen", roles: [] }],
  });
  const service = new MerchantsService(prisma);

  await assert.rejects(
    () =>
      service.createMerchant("u-citizen", {
        registrationNumber: "AA-TRD-0004",
        tradeName: "Test Merchant",
        woredaOfficeId: "off-w1",
        marketId: "mkt-other",
      }),
    (err) => err.response?.code === "MARKET_WOREDA_MISMATCH",
  );
});

test("Phase 3.5: Citizen self-registration auto-links as OWNER with PENDING status", async () => {
  const prisma = createMockPrisma({
    initialOffices: [{ id: "off-w1", level: OfficeLevel.WOREDA, isActive: true }],
    initialUsers: [{ id: "u-citizen", roles: [] }],
    initialRoles: [{ id: "r-bo", code: RoleCode.BUSINESS_OWNER, name: "Business Owner" }],
  });
  const service = new MerchantsService(prisma);

  const created = await service.createMerchant("u-citizen", {
    registrationNumber: "AA-TRD-1000",
    tradeName: "Citizen Store",
    woredaOfficeId: "off-w1",
  });

  assert.equal(created.verificationStatus, "PENDING");
  assert.equal(created.tradeName, "Citizen Store");
});

test("Phase 3.5: Government staff registration is auto-VERIFIED and enforces jurisdiction", async () => {
  const prisma = createMockPrisma({
    initialOffices: [
      { id: "off-w1", level: OfficeLevel.WOREDA, subcityCode: "BOLE", isActive: true },
      { id: "off-w2", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS", isActive: true },
    ],
    initialUsers: [
      {
        id: "u-woreda-admin",
        roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
        offices: [{ office: { id: "off-w1", level: OfficeLevel.WOREDA, subcityCode: "BOLE" } }],
      },
    ],
  });
  const service = new MerchantsService(prisma);

  // Succeeds within jurisdiction
  const created = await service.createMerchant("u-woreda-admin", {
    registrationNumber: "AA-TRD-2000",
    tradeName: "Gov Registered Merchant",
    woredaOfficeId: "off-w1",
  });
  assert.equal(created.verificationStatus, "VERIFIED");

  // Rejects outside jurisdiction
  await assert.rejects(
    () =>
      service.createMerchant("u-woreda-admin", {
        registrationNumber: "AA-TRD-2001",
        tradeName: "Outside Merchant",
        woredaOfficeId: "off-w2",
      }),
    (err) => err.response?.code === "OUTSIDE_WOREDA_JURISDICTION",
  );
});

test("Phase 3.5: Public lookup endpoint filters active & verified and hides private fields", async () => {
  const prisma = createMockPrisma({
    initialOffices: [{ id: "off-w1", code: "WO-01", nameEn: "Woreda 1", level: OfficeLevel.WOREDA }],
    initialMerchants: [
      {
        id: "m-verified",
        registrationNumber: "AA-TRD-1111",
        tradeName: "Verified Shop",
        businessCategory: "Retail",
        phoneNumber: "+251911999999",
        verificationStatus: "VERIFIED",
        isActive: true,
        woredaOfficeId: "off-w1",
      },
      {
        id: "m-pending",
        registrationNumber: "AA-TRD-2222",
        tradeName: "Pending Shop",
        verificationStatus: "PENDING",
        isActive: true,
        woredaOfficeId: "off-w1",
      },
    ],
  });
  const service = new MerchantsService(prisma);

  const results = await service.findPublicLookup({ category: "Retail" });
  assert.equal(results.length, 1);
  assert.equal(results[0].tradeName, "Verified Shop");
  assert.equal(results[0].phoneNumber, undefined); // Private citizen phone hidden
});

test("Phase 3.5: Business Desk (/api/business/me) user management safeguards", async () => {
  const prisma = createMockPrisma({
    initialMerchants: [{ id: "m-biz", registrationNumber: "AA-BIZ-1", tradeName: "My Shop", woredaOfficeId: "off-w1" }],
    initialUsers: [
      { id: "u-owner", fullName: "Owner User" },
      { id: "u-emp", fullName: "Employee User" },
    ],
    initialMerchantUsers: [
      { merchantId: "m-biz", userId: "u-owner", roleInBusiness: "OWNER", isPrimaryContact: true },
      { merchantId: "m-biz", userId: "u-emp", roleInBusiness: "EMPLOYEE", isPrimaryContact: false },
    ],
  });
  const merchantsService = new MerchantsService(prisma);
  const deskService = new BusinessDeskService(prisma, merchantsService);

  // Employee cannot add staff
  await assert.rejects(
    () => deskService.addMerchantUser("u-emp", { userId: "u-other", roleInBusiness: "EMPLOYEE" }),
    (err) => err.response?.code === "OWNER_REQUIRED",
  );

  // Cannot remove last owner
  await assert.rejects(
    () => deskService.removeMerchantUser("u-owner", "u-owner"),
    (err) => err.response?.code === "CANNOT_REMOVE_LAST_OWNER",
  );

  // Cannot remove last primary contact
  await assert.rejects(
    () => deskService.updateMerchantUser("u-owner", "u-owner", { isPrimaryContact: false }),
    (err) => err.response?.code === "CANNOT_REMOVE_LAST_PRIMARY",
  );
});

test("Phase 3.5: All controller routes have authorization decorators", () => {
  const controllers = [MerchantsController, BusinessMeController];
  for (const ControllerClass of controllers) {
    const proto = ControllerClass.prototype;
    const methods = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor" && typeof proto[m] === "function",
    );
    for (const method of methods) {
      const hasPermission = Reflect.hasMetadata("requirePermission", proto[method]);
      const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
      assert.ok(
        hasPermission || isPublic,
        `Method ${ControllerClass.name}.${method} missing @RequirePermission or @Public decorator`,
      );
    }
  }
});

