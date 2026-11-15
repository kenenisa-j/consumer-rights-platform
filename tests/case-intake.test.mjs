import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateCaseDto } from "../backend/dist/modules/cases/dto/create-case.dto.js";
import { CasesService } from "../backend/dist/modules/cases/cases.service.js";
import { PermissionGuard } from "../backend/dist/lib/common/guards/permission.guard.js";

// Helper to create mock Prisma client for CasesService tests
function createMockPrisma({
  category = { id: "cat-1", nameEn: "Defective goods", defaultSlaDays: 5, isActive: true },
  office = { id: "off-woreda", nameEn: "Woreda 7", level: "WOREDA", isActive: true },
  merchant = { id: "merch-1", tradeName: "Demo Merchant", isActive: true, verificationStatus: "VERIFIED" },
  existingCases = [],
  failHistory = false,
  failRollbackCallback = null,
} = {}) {
  let insertedCase = null;
  let insertedHistory = null;
  const casesStore = [...existingCases];

  const mockTx = {
    complaintCategory: {
      findUnique: async ({ where }) => (where.id === category?.id ? category : null),
    },
    administrativeOffice: {
      findUnique: async ({ where }) => (where.id === office?.id ? office : null),
    },
    merchant: {
      findUnique: async ({ where }) => (where.id === merchant?.id ? merchant : null),
    },
    market: {
      findUnique: async () => ({ id: "mkt-1", isActive: true }),
    },
    case: {
      findFirst: async ({ where, orderBy }) => {
        let results = casesStore;
        if (where?.complainantId) {
          results = results.filter((c) => c.complainantId === where.complainantId);
        }
        if (where?.complainantAlias?.startsWith) {
          const prefix = where.complainantAlias.startsWith;
          results = results.filter((c) => c.complainantAlias?.startsWith(prefix));
        }
        if (orderBy?.complainantAlias === "desc") {
          results = [...results].sort((a, b) => b.complainantAlias.localeCompare(a.complainantAlias));
        }
        if (orderBy?.createdAt === "asc") {
          results = [...results].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        return results[0] || null;
      },
      create: async ({ data }) => {
        insertedCase = {
          id: "case-uuid-001",
          referenceNumber: "CC-2026-00013",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        casesStore.push(insertedCase);
        return insertedCase;
      },
    },
    caseHistory: {
      create: async ({ data }) => {
        if (failHistory) {
          throw new Error("DB_HISTORY_INSERT_ERROR: simulated database crash");
        }
        insertedHistory = { id: "hist-uuid-001", ...data, createdAt: new Date() };
        return insertedHistory;
      },
    },
  };

  const mockPrisma = {
    $transaction: async (callback) => {
      try {
        return await callback(mockTx);
      } catch (err) {
        if (failRollbackCallback) failRollbackCallback();
        insertedCase = null;
        insertedHistory = null;
        throw err;
      }
    },
    getInsertedCase: () => insertedCase,
    getInsertedHistory: () => insertedHistory,
    getAllCases: () => casesStore,
  };

  return mockPrisma;
}

test("CreateCaseDto validation: valid payloads, boundaries, and whitespace handling", async () => {
  // 1. Valid Route A
  const validRouteA = plainToInstance(CreateCaseDto, {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "Faulty electronic device purchased from vendor",
    disputedAmount: 1500.5,
    desiredRemedy: "Replacement of the unit",
    officeId: "office-woreda-1",
    currency: "ETB",
  });
  assert.equal((await validate(validRouteA)).length, 0, "Valid Route A payload must pass validation");

  // 2. Valid Route B with null optional fields
  const validRouteB = plainToInstance(CreateCaseDto, {
    route: "REGISTERED_BUSINESS",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "Short weight on bulk grain delivery",
    disputedAmount: 4500,
    desiredRemedy: "Full refund",
    merchantId: "merchant-123",
    officeId: null,
    unregisteredMerchantName: null,
    marketId: null,
  });
  assert.equal((await validate(validRouteB)).length, 0, "Valid Route B payload with nulls must pass validation");

  // 3. Whitespace-only string rejected
  const whitespaceItem = plainToInstance(CreateCaseDto, {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "     ",
    disputedAmount: 500,
    desiredRemedy: "Refund",
    officeId: "office-1",
  });
  const wsErrors = await validate(whitespaceItem);
  assert.ok(wsErrors.some((e) => e.property === "itemDescription"), "Whitespace-only description must be rejected");

  // 4. Disputed amount boundary: exceeds Decimal(12,2) limit (max 9,999,999,999.99)
  const excessiveAmount = plainToInstance(CreateCaseDto, {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "Valid item description",
    disputedAmount: 10000000000.0,
    desiredRemedy: "Refund",
    officeId: "office-1",
  });
  const maxErrors = await validate(excessiveAmount);
  assert.ok(maxErrors.some((e) => e.property === "disputedAmount"), "Amount exceeding Decimal(12,2) must be rejected");

  // 5. Negative disputed amount
  const negAmount = plainToInstance(CreateCaseDto, {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "Valid item description",
    disputedAmount: -10,
    desiredRemedy: "Refund",
    officeId: "office-1",
  });
  const negErrors = await validate(negAmount);
  assert.ok(negErrors.some((e) => e.property === "disputedAmount"), "Negative amount must be rejected");

  // 6. Invalid currency code
  const invalidCurrency = plainToInstance(CreateCaseDto, {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-123",
    incidentDate: "2026-10-15T10:00:00.000Z",
    itemDescription: "Valid item description",
    disputedAmount: 100,
    desiredRemedy: "Refund",
    officeId: "office-1",
    currency: "TOOLONG",
  });
  const curErrors = await validate(invalidCurrency);
  assert.ok(curErrors.some((e) => e.property === "currency"), "Invalid currency code must be rejected");
});

test("CasesService: Route A intake creates case with RECEIVED_BY_OFFICE and SLA deadline", async () => {
  const mockPrisma = createMockPrisma();
  const service = new CasesService(mockPrisma);

  const res = await service.createCase("user-consumer-1", {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-1",
    incidentDate: "2026-10-15T09:00:00.000Z",
    itemDescription: "Broken kettle sold without warranty",
    disputedAmount: 850,
    desiredRemedy: "Full refund",
    officeId: "off-woreda",
  });

  assert.equal(res.status, "RECEIVED_BY_OFFICE");
  assert.equal(res.currentOfficeId, "off-woreda");
  assert.equal(res.route, "DIRECT_GOVERNMENT");
  assert.equal(res.complainantId, "user-consumer-1");
  assert.equal(res.referenceNumber, "CC-2026-00013");
  assert.ok(res.slaDeadline instanceof Date, "SLA deadline must be calculated for Route A");

  const history = mockPrisma.getInsertedHistory();
  assert.ok(history, "Initial CaseHistory must be created");
  assert.equal(history.toStatus, "RECEIVED_BY_OFFICE");
  assert.equal(history.handlingLevel, "woreda");
  assert.equal(history.actorUserId, "user-consumer-1");
});

test("CasesService: Route B intake creates case with SUBMITTED_TO_BUSINESS and null office", async () => {
  const mockPrisma = createMockPrisma();
  const service = new CasesService(mockPrisma);

  const res = await service.createCase("user-consumer-1", {
    route: "REGISTERED_BUSINESS",
    categoryId: "cat-1",
    incidentDate: "2026-10-15T09:00:00.000Z",
    itemDescription: "Spoiled milk bottles",
    disputedAmount: 420,
    desiredRemedy: "Replacement",
    merchantId: "merch-1",
  });

  assert.equal(res.status, "SUBMITTED_TO_BUSINESS");
  assert.equal(res.currentOfficeId, null);
  assert.equal(res.escalatedToGovAt, null);
  assert.equal(res.merchantId, "merch-1");
  assert.equal(res.route, "REGISTERED_BUSINESS");

  const history = mockPrisma.getInsertedHistory();
  assert.ok(history, "Initial CaseHistory must be created");
  assert.equal(history.toStatus, "SUBMITTED_TO_BUSINESS");
  assert.equal(history.handlingLevel, "business");
  assert.equal(history.officeId, null);
  assert.equal(history.actorUserId, "user-consumer-1");
});

test("CasesService: Preserves stable pseudonym for returning consumers and increments sequentially", async () => {
  const mockPrisma = createMockPrisma({
    existingCases: [
      { id: "c-1", complainantId: "existing-user-1", complainantAlias: "Consumer 00007" },
      { id: "c-2", complainantId: "existing-user-2", complainantAlias: "Consumer 00008" },
    ],
  });
  const service = new CasesService(mockPrisma);

  // 1. Returning consumer gets their existing alias
  const res1 = await service.createCase("existing-user-1", {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-1",
    incidentDate: "2026-10-15T09:00:00.000Z",
    itemDescription: "Second complaint from user 1",
    disputedAmount: 300,
    desiredRemedy: "Refund",
    officeId: "off-woreda",
  });
  assert.equal(res1.complainantAlias, "Consumer 00007", "Returning consumer must keep stable pseudonym");

  // 2. New consumer gets next sequence (highest 8 -> 9)
  const res2 = await service.createCase("brand-new-user-3", {
    route: "DIRECT_GOVERNMENT",
    categoryId: "cat-1",
    incidentDate: "2026-10-15T09:00:00.000Z",
    itemDescription: "First complaint from user 3",
    disputedAmount: 120,
    desiredRemedy: "Replacement",
    officeId: "off-woreda",
  });
  assert.equal(res2.complainantAlias, "Consumer 00009", "New consumer must get next sequential pseudonym");
});

test("CasesService: Rejects invalid routing combinations", async () => {
  const mockPrisma = createMockPrisma();
  const service = new CasesService(mockPrisma);

  // 1. Route A without office
  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
      });
    },
    (err) => err.response?.code === "OFFICE_REQUIRED"
  );

  // 2. Route A with both registered merchant and unregistered merchant
  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        officeId: "off-woreda",
        merchantId: "merch-1",
        unregisteredMerchantName: "Corner Shop",
      });
    },
    (err) => err.response?.code === "INVALID_ROUTING"
  );

  // 3. Route B without merchant
  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "REGISTERED_BUSINESS",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
      });
    },
    (err) => err.response?.code === "MERCHANT_REQUIRED"
  );

  // 4. Route B with office specified
  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "REGISTERED_BUSINESS",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        merchantId: "merch-1",
        officeId: "off-woreda",
      });
    },
    (err) => err.response?.code === "INVALID_ROUTING"
  );

  // 5. Route B with unregistered merchant fields
  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "REGISTERED_BUSINESS",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        merchantId: "merch-1",
        unregisteredMerchantName: "Fake Unregistered",
      });
    },
    (err) => err.response?.code === "INVALID_ROUTING"
  );
});

test("CasesService: Rejects inactive category, inactive office, office level mismatch, and unverified merchant", async () => {
  // 1. Inactive category
  const inactiveCatPrisma = createMockPrisma({
    category: { id: "cat-1", nameEn: "Inactive Cat", isActive: false },
  });
  const service1 = new CasesService(inactiveCatPrisma);
  await assert.rejects(
    async () => {
      await service1.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        officeId: "off-woreda",
      });
    },
    (err) => err.response?.code === "CATEGORY_INACTIVE"
  );

  // 2. Inactive office
  const inactiveOfficePrisma = createMockPrisma({
    office: { id: "off-woreda", nameEn: "Closed Office", level: "WOREDA", isActive: false },
  });
  const service2 = new CasesService(inactiveOfficePrisma);
  await assert.rejects(
    async () => {
      await service2.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        officeId: "off-woreda",
      });
    },
    (err) => err.response?.code === "OFFICE_INACTIVE"
  );

  // 3. Office level mismatch (e.g. targetLevel 'bureau' but office is WOREDA)
  const serviceMismatch = new CasesService(createMockPrisma());
  await assert.rejects(
    async () => {
      await serviceMismatch.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        officeId: "off-woreda",
        targetLevel: "bureau",
      });
    },
    (err) => err.response?.code === "OFFICE_LEVEL_MISMATCH"
  );

  // 4. Unverified merchant
  const unverifiedMerchantPrisma = createMockPrisma({
    merchant: { id: "merch-1", tradeName: "Unverified Merchant", isActive: true, verificationStatus: "PENDING" },
  });
  const service3 = new CasesService(unverifiedMerchantPrisma);
  await assert.rejects(
    async () => {
      await service3.createCase("user-1", {
        route: "REGISTERED_BUSINESS",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Test item",
        disputedAmount: 100,
        desiredRemedy: "Refund",
        merchantId: "merch-1",
      });
    },
    (err) => err.response?.code === "MERCHANT_INACTIVE_OR_UNVERIFIED"
  );
});

test("CasesService: Transaction rolls back when CaseHistory creation fails", async () => {
  let rolledBack = false;
  const failingPrisma = createMockPrisma({
    failHistory: true,
    failRollbackCallback: () => {
      rolledBack = true;
    },
  });
  const service = new CasesService(failingPrisma);

  await assert.rejects(
    async () => {
      await service.createCase("user-1", {
        route: "DIRECT_GOVERNMENT",
        categoryId: "cat-1",
        incidentDate: "2026-10-15T09:00:00.000Z",
        itemDescription: "Device exploded",
        disputedAmount: 2000,
        desiredRemedy: "Damages and refund",
        officeId: "off-woreda",
      });
    },
    (err) => err.message.includes("DB_HISTORY_INSERT_ERROR")
  );

  assert.equal(rolledBack, true, "Transaction must roll back when CaseHistory insert fails");
  assert.equal(failingPrisma.getInsertedCase(), null, "Case must not persist on transaction rollback");
});

test("PermissionGuard: Enforces complaints:create:own permission", async () => {
  const reflector = {
    getAllAndOverride: (key) => {
      if (key === "isPublic") return false;
      if (key === "permissions") return ["complaints:create:own"];
      return null;
    },
  };

  // 1. Unauthenticated request throws 401
  const mockAuthServiceUnauth = {
    auth: { api: { getSession: async () => null } },
  };
  const guardUnauth = new PermissionGuard(reflector, {}, mockAuthServiceUnauth);
  const contextUnauth = {
    getHandler: () => {},
    getClass: () => {},
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  };

  await assert.rejects(
    async () => guardUnauth.canActivate(contextUnauth),
    (err) => err.status === 401
  );

  // 2. User lacking complaints:create:own throws 403
  const mockPrismaForbidden = {
    session: {
      findUnique: async () => ({ id: "s-1", userId: "u-1", expiresAt: new Date(Date.now() + 60000) }),
    },
    user: {
      findUnique: async () => ({
        id: "u-1",
        status: "ACTIVE",
        roles: [
          {
            role: {
              permissions: [{ permission: { code: "complaints:read:own" } }],
            },
          },
        ],
      }),
    },
  };
  const mockAuthServiceForbidden = {
    auth: { api: { getSession: async () => ({ user: { id: "u-1" }, session: { token: "tok-1" } }) } },
  };
  const guardForbidden = new PermissionGuard(reflector, mockPrismaForbidden, mockAuthServiceForbidden);

  await assert.rejects(
    async () => guardForbidden.canActivate(contextUnauth),
    (err) => err.status === 403
  );

  // 3. User with complaints:create:own succeeds
  const mockPrismaAllowed = {
    session: {
      findUnique: async () => ({ id: "s-1", userId: "u-1", expiresAt: new Date(Date.now() + 60000) }),
    },
    user: {
      findUnique: async () => ({
        id: "u-1",
        status: "ACTIVE",
        roles: [
          {
            role: {
              permissions: [
                { permission: { code: "complaints:read:own" } },
                { permission: { code: "complaints:create:own" } },
              ],
            },
          },
        ],
      }),
    },
  };
  const reqObj = { headers: {} };
  const contextAllowed = {
    getHandler: () => {},
    getClass: () => {},
    switchToHttp: () => ({
      getRequest: () => reqObj,
    }),
  };
  const guardAllowed = new PermissionGuard(reflector, mockPrismaAllowed, mockAuthServiceForbidden);
  const result = await guardAllowed.canActivate(contextAllowed);

  assert.equal(result, true, "Guard must allow user with complaints:create:own permission");
  assert.equal(reqObj.user?.id, "u-1", "Guard must attach user id to request context");
});
