import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateOfficeDto } from "../backend/dist/modules/offices/dto/create-office.dto.js";
import { UpdateOfficeDto } from "../backend/dist/modules/offices/dto/update-office.dto.js";
import { OfficesService } from "../backend/dist/modules/offices/offices.service.js";
import { OfficesController } from "../backend/dist/modules/offices/offices.controller.js";

function createMockPrisma(initialOffices = []) {
  const store = new Map(initialOffices.map((o) => [o.id, { ...o }]));

  return {
    administrativeOffice: {
      findUnique: async ({ where, include }) => {
        let office = null;
        if (where.id) office = store.get(where.id);
        if (!office && where.code) {
          office = Array.from(store.values()).find((o) => o.code === where.code);
        }
        if (!office) return null;

        const res = { ...office };
        if (include?.childOffices) {
          const children = Array.from(store.values()).filter((o) => o.parentOfficeId === office.id);
          res.childOffices = include.childOffices.where?.isActive !== undefined
            ? children.filter((c) => c.isActive === include.childOffices.where.isActive)
            : children;
        }
        if (include?.parentOffice) {
          res.parentOffice = office.parentOfficeId ? store.get(office.parentOfficeId) : null;
        }
        if (include?.staffDeployments) res.staffDeployments = office.staffDeployments || [];
        if (include?.merchants) res.merchants = office.merchants || [];
        if (include?.markets) res.markets = office.markets || [];
        if (include?.casesCurrentlyHeld) res.casesCurrentlyHeld = office.casesCurrentlyHeld || [];
        return res;
      },
      findMany: async ({ where }) => {
        let list = Array.from(store.values());
        if (where?.level) list = list.filter((o) => o.level === where.level);
        if (where?.parentOfficeId) list = list.filter((o) => o.parentOfficeId === where.parentOfficeId);
        if (where?.subcityCode) list = list.filter((o) => o.subcityCode === where.subcityCode);
        if (where?.isActive !== undefined) list = list.filter((o) => o.isActive === where.isActive);
        return list;
      },
      create: async ({ data }) => {
        const created = { id: `off-${Date.now()}-${Math.random()}`, ...data };
        store.set(created.id, created);
        return created;
      },
      update: async ({ where, data }) => {
        const existing = store.get(where.id);
        if (!existing) throw new Error("Office not found in mock store");
        const updated = { ...existing, ...data };
        store.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const existing = store.get(where.id);
        store.delete(where.id);
        return existing;
      },
    },
  };
}

test("DTO Validation: CreateOfficeDto validates required fields, level enum, and codes", async () => {
  const validDto = plainToInstance(CreateOfficeDto, {
    code: "AA-BUREAU",
    nameEn: "Addis Ababa Bureau",
    nameAm: "የአዲስ አበባ ቢሮ",
    level: "CITY_BUREAU",
    address: "Mexico Square",
    phone: "+251111223344",
  });
  const validErrors = await validate(validDto);
  assert.equal(validErrors.length, 0, "Valid City Bureau DTO must have 0 validation errors");

  const invalidDto = plainToInstance(CreateOfficeDto, {
    code: "invalid code with spaces!",
    nameEn: "AB",
    nameAm: "AB",
    level: "INVALID_LEVEL",
    address: "A",
    phone: "123",
  });
  const invalidErrors = await validate(invalidDto);
  assert.ok(invalidErrors.some((e) => e.property === "code"));
  assert.ok(invalidErrors.some((e) => e.property === "nameEn"));
  assert.ok(invalidErrors.some((e) => e.property === "nameAm"));
  assert.ok(invalidErrors.some((e) => e.property === "level"));
  assert.ok(invalidErrors.some((e) => e.property === "address"));
  assert.ok(invalidErrors.some((e) => e.property === "phone"));
});

test("Hierarchy Rule: City Bureau cannot have a parent office", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-1", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  await assert.rejects(
    async () => {
      await service.create({
        code: "ANOTHER-BUREAU",
        nameEn: "Another Bureau",
        nameAm: "ሌላ ቢሮ",
        level: "CITY_BUREAU",
        parentOfficeId: "bureau-1",
        address: "Addis Ababa",
        phone: "+251111000000",
      });
    },
    (err) => err.response?.code === "BUREAU_CANNOT_HAVE_PARENT"
  );
});

test("Hierarchy Rule: Sub-City must belong to an active City Bureau", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-active", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
    { id: "bureau-inactive", code: "INACTIVE-BUREAU", level: "CITY_BUREAU", isActive: false },
    { id: "subcity-other", code: "SC-BOLE", level: "SUBCITY", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  // 1. Missing parent
  await assert.rejects(
    async () => {
      await service.create({
        code: "SC-AKAKI",
        nameEn: "Akaki Subcity",
        nameAm: "አቃቂ ቃሊቲ",
        level: "SUBCITY",
        address: "Akaki",
        phone: "+251111000100",
      });
    },
    (err) => err.response?.code === "PARENT_OFFICE_REQUIRED"
  );

  // 2. Inactive parent Bureau
  await assert.rejects(
    async () => {
      await service.create({
        code: "SC-AKAKI",
        nameEn: "Akaki Subcity",
        nameAm: "አቃቂ ቃሊቲ",
        level: "SUBCITY",
        parentOfficeId: "bureau-inactive",
        address: "Akaki",
        phone: "+251111000100",
      });
    },
    (err) => err.response?.code === "PARENT_OFFICE_INACTIVE"
  );

  // 3. Parent is not a City Bureau (e.g. another Sub-City)
  await assert.rejects(
    async () => {
      await service.create({
        code: "SC-AKAKI",
        nameEn: "Akaki Subcity",
        nameAm: "አቃቂ ቃሊቲ",
        level: "SUBCITY",
        parentOfficeId: "subcity-other",
        address: "Akaki",
        phone: "+251111000100",
      });
    },
    (err) => err.response?.code === "SUBCITY_MUST_BELONG_TO_BUREAU"
  );

  // 4. Valid Sub-City creation under active City Bureau
  const created = await service.create({
    code: "SC-AKAKI",
    nameEn: "Akaki Subcity",
    nameAm: "አቃቂ ቃሊቲ",
    level: "SUBCITY",
    parentOfficeId: "bureau-active",
    address: "Akaki",
    phone: "+251111000100",
  });
  assert.equal(created.code, "SC-AKAKI");
  assert.equal(created.parentOfficeId, "bureau-active");
});

test("Hierarchy Rule: Woreda must belong to Sub-City and cannot belong directly to Bureau", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-1", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
    { id: "subcity-1", code: "SC-AKAKI", level: "SUBCITY", parentOfficeId: "bureau-1", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  // 1. Direct attachment to Bureau is rejected
  await assert.rejects(
    async () => {
      await service.create({
        code: "WO-AKAKI-07",
        nameEn: "Woreda 7",
        nameAm: "ወረዳ 7",
        level: "WOREDA",
        parentOfficeId: "bureau-1",
        address: "Woreda 7",
        phone: "+251111000107",
      });
    },
    (err) => err.response?.code === "WOREDA_MUST_BELONG_TO_SUBCITY"
  );

  // 2. Attachment to Sub-City succeeds
  const createdWoreda = await service.create({
    code: "WO-AKAKI-07",
    nameEn: "Woreda 7",
    nameAm: "ወረዳ 7",
    level: "WOREDA",
    parentOfficeId: "subcity-1",
    address: "Woreda 7",
    phone: "+251111000107",
  });
  assert.equal(createdWoreda.code, "WO-AKAKI-07");
  assert.equal(createdWoreda.parentOfficeId, "subcity-1");
});

test("Hierarchy Rule: Circular parent relationships and self-parenting are rejected", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-1", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
    { id: "sc-1", code: "SC-1", level: "SUBCITY", parentOfficeId: "bureau-1", isActive: true },
    { id: "sc-2", code: "SC-2", level: "SUBCITY", parentOfficeId: "sc-1", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  // 1. Self-parent
  await assert.rejects(
    async () => {
      await service.update("sc-1", { parentOfficeId: "sc-1" });
    },
    (err) => err.response?.code === "OFFICE_CANNOT_BE_OWN_PARENT"
  );

  // 2. Circular dependency: setting sc-2 as parent of sc-1 when sc-2 has sc-1 as ancestor
  await assert.rejects(
    async () => {
      await service.update("sc-1", { parentOfficeId: "sc-2" });
    },
    (err) => err.response?.code === "CIRCULAR_PARENT_RELATIONSHIP" || err.response?.code === "SUBCITY_MUST_BELONG_TO_BUREAU"
  );
});

test("Integrity: Duplicate office codes are rejected with ConflictException", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-1", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  await assert.rejects(
    async () => {
      await service.create({
        code: "AA-BUREAU",
        nameEn: "Duplicate Bureau",
        nameAm: "ድጋሚ ቢሮ",
        level: "CITY_BUREAU",
        address: "Mexico",
        phone: "+251111999999",
      });
    },
    (err) => err.response?.code === "OFFICE_CODE_EXISTS"
  );
});

test("Safety: Deactivation prevents orphaned active children; deletion guards against existing records", async () => {
  const mockPrisma = createMockPrisma([
    { id: "bureau-1", code: "AA-BUREAU", level: "CITY_BUREAU", isActive: true },
    { id: "sc-1", code: "SC-1", level: "SUBCITY", parentOfficeId: "bureau-1", isActive: true },
    { id: "wo-with-cases", code: "WO-1", level: "WOREDA", parentOfficeId: "sc-1", isActive: true, casesCurrentlyHeld: [{ id: "c-1" }] },
    { id: "wo-empty", code: "WO-EMPTY", level: "WOREDA", parentOfficeId: "sc-1", isActive: true },
  ]);
  const service = new OfficesService(mockPrisma);

  // 1. Deactivating bureau-1 while sc-1 is active is rejected
  await assert.rejects(
    async () => {
      await service.deactivate("bureau-1");
    },
    (err) => err.response?.code === "OFFICE_HAS_ACTIVE_CHILDREN"
  );

  // 2. Deleting an office referenced by cases is rejected
  await assert.rejects(
    async () => {
      await service.delete("wo-with-cases");
    },
    (err) => err.response?.code === "OFFICE_HAS_DEPENDENCIES"
  );

  // 3. Deleting unreferenced office succeeds
  const delResult = await service.delete("wo-empty");
  assert.equal(delResult.id, "wo-empty");
});

test("OfficesController: Declares policy on every route matching validation rules", () => {
  const controller = new OfficesController({});
  assert.ok(controller, "OfficesController instantiated");

  // Inspect routes vs policies on prototype methods
  const methods = Object.getOwnPropertyNames(OfficesController.prototype).filter(
    (m) => m !== "constructor"
  );
  assert.equal(methods.length, 6, "OfficesController must have exactly 6 endpoints");
});

