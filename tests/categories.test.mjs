import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { OfficeLevel } from "@prisma/client";
import { CreateCategoryDto } from "../backend/dist/modules/categories/dto/create-category.dto.js";
import { UpdateCategoryDto } from "../backend/dist/modules/categories/dto/update-category.dto.js";
import { CategoriesService } from "../backend/dist/modules/categories/categories.service.js";
import { CategoriesController } from "../backend/dist/modules/categories/categories.controller.js";

function createMockPrisma({ initialCategories = [], initialCases = [] } = {}) {
  const categories = new Map(initialCategories.map((c) => [c.id, { ...c }]));
  const cases = [...initialCases];

  return {
    complaintCategory: {
      findUnique: async ({ where }) => {
        const c = where.id
          ? categories.get(where.id)
          : Array.from(categories.values()).find((x) => x.code === where.code);
        return c ? { ...c } : null;
      },
      findMany: async ({ where, select }) => {
        let list = Array.from(categories.values());
        if (where?.isActive !== undefined) list = list.filter((c) => c.isActive === where.isActive);
        if (where?.defaultRemitLevel) list = list.filter((c) => c.defaultRemitLevel === where.defaultRemitLevel);
        if (where?.OR) {
          list = list.filter((c) =>
            where.OR.some((cond) => {
              const field = Object.keys(cond)[0];
              const term = cond[field].contains.toLowerCase();
              return c[field] && c[field].toLowerCase().includes(term);
            }),
          );
        }
        return list.map((c) => {
          if (select) {
            const res = {};
            for (const k of Object.keys(select)) res[k] = c[k];
            return res;
          }
          return { ...c, _count: { cases: cases.filter((x) => x.categoryId === c.id).length } };
        });
      },
      create: async ({ data }) => {
        const created = { id: `cat-${Date.now()}-${Math.random()}`, ...data };
        categories.set(created.id, created);
        return { ...created };
      },
      update: async ({ where, data }) => {
        const existing = categories.get(where.id);
        const updated = { ...existing, ...data };
        categories.set(where.id, updated);
        return { ...updated };
      },
      delete: async ({ where }) => {
        const existing = categories.get(where.id);
        categories.delete(where.id);
        return existing;
      },
    },
    case: {
      count: async ({ where }) => {
        return cases.filter((c) => c.categoryId === where.categoryId).length;
      },
    },
  };
}

test("Phase 3.6: Category DTO validation", async () => {
  const invalid = plainToInstance(CreateCategoryDto, {
    code: "",
    nameEn: "",
    nameAm: "",
    defaultSlaDays: 99, // exceeds max 60
  });
  const errors = await validate(invalid);
  assert.ok(errors.length > 0);

  const valid = plainToInstance(CreateCategoryDto, {
    code: "PRICE_GOUGING",
    nameEn: "Price Gouging",
    nameAm: "ያልተገባ የዋጋ ጭማሪ",
    defaultSlaDays: 3,
    defaultRemitLevel: OfficeLevel.WOREDA,
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 3.6: Prevents duplicate category code", async () => {
  const prisma = createMockPrisma({
    initialCategories: [{ id: "cat-1", code: "OVERPRICING", nameEn: "Overpricing", nameAm: "ዋጋ" }],
  });
  const service = new CategoriesService(prisma);

  await assert.rejects(
    () =>
      service.create({
        code: "OVERPRICING",
        nameEn: "Duplicate Overpricing",
        nameAm: "ዋጋ",
      }),
    (err) => err.response?.code === "CATEGORY_CODE_EXISTS",
  );
});

test("Phase 3.6: Public findPublicActive returns only active categories with multilingual fields", async () => {
  const prisma = createMockPrisma({
    initialCategories: [
      { id: "c1", code: "ACTIVE_CAT", nameEn: "Active", nameAm: "አክቲቭ", isActive: true },
      { id: "c2", code: "RETIRED_CAT", nameEn: "Retired", nameAm: "የተዘጋ", isActive: false },
    ],
  });
  const service = new CategoriesService(prisma);

  const list = await service.findPublicActive();
  assert.equal(list.length, 1);
  assert.equal(list[0].code, "ACTIVE_CAT");
});

test("Phase 3.6: Prevents hard delete of category with associated cases", async () => {
  const prisma = createMockPrisma({
    initialCategories: [{ id: "cat-in-use", code: "HOARDING", nameEn: "Hoarding", nameAm: "መደበቅ" }],
    initialCases: [{ id: "case-1", categoryId: "cat-in-use" }],
  });
  const service = new CategoriesService(prisma);

  await assert.rejects(
    () => service.remove("cat-in-use"),
    (err) => err.response?.code === "CATEGORY_IN_USE",
  );
});

test("Phase 3.6: Safe retirement / deactivation when cases exist", async () => {
  const prisma = createMockPrisma({
    initialCategories: [{ id: "cat-in-use", code: "HOARDING", nameEn: "Hoarding", nameAm: "መደበቅ", isActive: true }],
    initialCases: [{ id: "case-1", categoryId: "cat-in-use" }],
  });
  const service = new CategoriesService(prisma);

  const retired = await service.update("cat-in-use", { isActive: false });
  assert.equal(retired.isActive, false);
});

test("Phase 3.6: All controller routes have authorization decorators", () => {
  const proto = CategoriesController.prototype;
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
      `Method CategoriesController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

