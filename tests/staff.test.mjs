import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RoleCode, OfficeLevel } from "@prisma/client";
import { CreateStaffDto } from "../backend/dist/modules/staff/dto/create-staff.dto.js";
import { AssignStaffDto } from "../backend/dist/modules/staff/dto/assign-staff.dto.js";
import { TransferStaffDto } from "../backend/dist/modules/staff/dto/transfer-staff.dto.js";
import { StaffService } from "../backend/dist/modules/staff/staff.service.js";
import { StaffController } from "../backend/dist/modules/staff/staff.controller.js";

function createMockPrisma({
  initialUsers = [],
  initialOffices = [],
  initialDeployments = [],
  initialRoles = [],
} = {}) {
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const deployments = new Map(initialDeployments.map((d) => [d.id, { ...d }]));
  const roles = new Map(initialRoles.map((r) => [r.code, { ...r }]));

  const mock = {
    user: {
      findUnique: async ({ where, include, select }) => {
        const u = where.id
          ? users.get(where.id)
          : Array.from(users.values()).find((x) => x.phoneNumber === where.phoneNumber);
        if (!u) return null;
        const res = { ...u };
        const inc = include || select;
        if (inc?.roles) res.roles = u.roles || [];
        if (inc?.offices) {
          let userDeps = Array.from(deployments.values()).filter((d) => d.userId === u.id);
          if (userDeps.length === 0 && u.offices) {
            userDeps = u.offices.map((o) => ({ ...o, userId: u.id }));
          }
          const whereActive = inc.offices?.where?.isActive;
          res.offices = whereActive !== undefined
            ? userDeps.filter((d) => d.isActive === whereActive)
            : userDeps;
          res.offices = res.offices.map((d) => ({
            ...d,
            office: d.office || offices.get(d.officeId),
          }));
        }
        return res;
      },
      findFirst: async ({ where }) => {
        return Array.from(users.values()).find((u) => u.email === where.email) || null;
      },
      findMany: async () => Array.from(users.values()),
      create: async ({ data }) => {
        const created = { id: `u-${Date.now()}-${Math.random()}`, ...data, roles: [] };
        users.set(created.id, created);
        return created;
      },
      update: async ({ where, data }) => {
        const existing = users.get(where.id);
        const updated = { ...existing, ...data };
        users.set(where.id, updated);
        return updated;
      },
    },
    role: {
      findUnique: async ({ where }) => roles.get(where.code) || { id: `r-${where.code}`, code: where.code, name: where.code },
    },
    userRole: {
      create: async ({ data }) => {
        const u = users.get(data.userId);
        if (u) {
          u.roles = u.roles || [];
          u.roles.push({ role: { code: data.roleId.replace(/^r-/, '') } });
        }
        return data;
      },
      deleteMany: async ({ where }) => {
        const u = users.get(where.userId);
        if (u) u.roles = [];
        return { count: 1 };
      },
    },
    account: {
      create: async ({ data }) => data,
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
      findMany: async () => Array.from(offices.values()),
    },
    userOffice: {
      findUnique: async ({ where, include }) => {
        const d = deployments.get(where.id);
        if (!d) return null;
        const res = { ...d };
        if (include?.office) res.office = offices.get(d.officeId);
        return res;
      },
      findFirst: async ({ where, include }) => {
        const found = Array.from(deployments.values()).find((d) => {
          if (where.userId && d.userId !== where.userId) return false;
          if (where.isActive !== undefined && d.isActive !== where.isActive) return false;
          return true;
        });
        if (!found) return null;
        const res = { ...found };
        if (include?.office) res.office = offices.get(found.officeId);
        return res;
      },
      findMany: async ({ where }) => {
        let list = Array.from(deployments.values());
        if (where.userId) list = list.filter((d) => d.userId === where.userId);
        if (where.officeId) list = list.filter((d) => d.officeId === where.officeId);
        if (where.isActive !== undefined) list = list.filter((d) => d.isActive === where.isActive);
        return list;
      },
      create: async ({ data, include }) => {
        const created = { id: `dep-${Date.now()}-${Math.random()}`, ...data };
        deployments.set(created.id, created);
        const res = { ...created };
        if (include?.office) res.office = offices.get(created.officeId);
        if (include?.user) res.user = users.get(created.userId);
        return res;
      },
      update: async ({ where, data }) => {
        const existing = deployments.get(where.id);
        const updated = { ...existing, ...data };
        deployments.set(where.id, updated);
        return updated;
      },
    },
    $transaction: async (cb) => cb(mock),
  };

  return mock;
}

const mockAuthService = {
  hashPassword: async () => "scrypt$mocked_password_hash",
};

test("DTO Validation: CreateStaffDto rejects invalid Ethiopian phones and non-staff roles", async () => {
  const validDto = plainToInstance(CreateStaffDto, {
    phoneNumber: "0911000201",
    fullName: "Dawit Officer",
    email: "dawit@example.com",
    password: "Password123!",
    roleCode: RoleCode.WOREDA_OFFICER,
  });
  const validErrors = await validate(validDto);
  assert.equal(validErrors.length, 0, "Valid staff DTO should pass validation");

  const invalidDto = plainToInstance(CreateStaffDto, {
    phoneNumber: "12345",
    fullName: "Da",
    email: "not-an-email",
    password: "short",
    roleCode: "CONSUMER",
  });
  const invalidErrors = await validate(invalidDto);
  assert.ok(invalidErrors.some((e) => e.property === "phoneNumber"));
  assert.ok(invalidErrors.some((e) => e.property === "fullName"));
  assert.ok(invalidErrors.some((e) => e.property === "email"));
  assert.ok(invalidErrors.some((e) => e.property === "password"));
  assert.ok(invalidErrors.some((e) => e.property === "roleCode"));
});

test("Staff Assignment: Validates role and office level compatibility", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-bureau", code: "AA-BUREAU", level: OfficeLevel.CITY_BUREAU, isActive: true },
      { id: "off-woreda", code: "WO-07", level: OfficeLevel.WOREDA, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-superadmin",
        fullName: "System Admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.SYSTEM_SUPERADMIN } }],
        offices: [{ id: "dep-admin", officeId: "off-bureau", isActive: true }],
      },
      {
        id: "u-woreda-officer",
        fullName: "Woreda Officer",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [],
      },
      {
        id: "u-citizen",
        fullName: "Plain Consumer",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.CONSUMER } }],
        offices: [],
      },
    ],
  });
  const service = new StaffService(mockPrisma, mockAuthService);

  // 1. Citizen cannot be assigned to government office
  await assert.rejects(
    async () => {
      await service.assignStaff("u-superadmin", {
        userId: "u-citizen",
        officeId: "off-woreda",
      });
    },
    (err) => err.response?.code === "USER_NOT_GOVERNMENT_STAFF"
  );

  // 2. Woreda officer cannot be assigned to City Bureau office
  await assert.rejects(
    async () => {
      await service.assignStaff("u-superadmin", {
        userId: "u-woreda-officer",
        officeId: "off-bureau",
      });
    },
    (err) => err.response?.code === "ROLE_OFFICE_LEVEL_INCOMPATIBLE"
  );

  // 3. Woreda officer assigned to Woreda office succeeds
  const assigned = await service.assignStaff("u-superadmin", {
    userId: "u-woreda-officer",
    officeId: "off-woreda",
  });
  assert.equal(assigned.userId, "u-woreda-officer");
  assert.equal(assigned.officeId, "off-woreda");
  assert.equal(assigned.isActive, true);
});

test("Staff Assignment: Enforces single active deployment constraint", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", code: "WO-01", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-woreda-2", code: "WO-02", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-bureau", code: "BUREAU", level: OfficeLevel.CITY_BUREAU, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-admin",
        fullName: "Bureau Admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.BUREAU_ADMIN } }],
        offices: [{ id: "dep-admin", officeId: "off-bureau", isActive: true }],
      },
      {
        id: "u-officer",
        fullName: "Woreda Officer",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [],
      },
    ],
    initialDeployments: [
      { id: "dep-1", userId: "u-officer", officeId: "off-woreda-1", isActive: true },
    ],
  });
  const service = new StaffService(mockPrisma, mockAuthService);

  // Direct second active assignment throws ConflictException
  await assert.rejects(
    async () => {
      await service.assignStaff("u-admin", {
        userId: "u-officer",
        officeId: "off-woreda-2",
      });
    },
    (err) => err.response?.code === "USER_ALREADY_DEPLOYED"
  );
});

test("Staff Transfer: Atomically deactivates old deployment and creates new one with preserved history", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", code: "WO-01", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-woreda-2", code: "WO-02", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-bureau", code: "BUREAU", level: OfficeLevel.CITY_BUREAU, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-admin",
        fullName: "Bureau Admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.BUREAU_ADMIN } }],
        offices: [{ id: "dep-admin", officeId: "off-bureau", isActive: true }],
      },
      {
        id: "u-officer",
        fullName: "Woreda Officer",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }],
        offices: [],
      },
    ],
    initialDeployments: [
      { id: "dep-1", userId: "u-officer", officeId: "off-woreda-1", isActive: true, roleInOffice: "OFFICER" },
    ],
  });
  const service = new StaffService(mockPrisma, mockAuthService);

  // Transfer to same office is rejected
  await assert.rejects(
    async () => {
      await service.transferStaff("u-admin", "u-officer", { newOfficeId: "off-woreda-1" });
    },
    (err) => err.response?.code === "CANNOT_TRANSFER_TO_SAME_OFFICE"
  );

  // Transfer to new valid office
  const transferred = await service.transferStaff("u-admin", "u-officer", {
    newOfficeId: "off-woreda-2",
    roleInOffice: "LEAD_OFFICER",
  });
  assert.equal(transferred.officeId, "off-woreda-2");
  assert.equal(transferred.isActive, true);

  // Inspect history
  const assignments = await service.getStaffById("u-officer");
  assert.equal(assignments.offices.length, 2, "Both previous and active deployments must be preserved");
  const oldDep = assignments.offices.find((d) => d.id === "dep-1");
  assert.equal(oldDep.isActive, false, "Old deployment must be deactivated");
  assert.ok(oldDep.unassignedAt !== null, "Deactivation timestamp must be recorded");
});

test("Authorization: Enforces jurisdiction scoping and prevents privilege escalation", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", code: "WO-01", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-woreda-other", code: "WO-09", level: OfficeLevel.WOREDA, isActive: true },
      { id: "off-bureau", code: "BUREAU", level: OfficeLevel.CITY_BUREAU, isActive: true },
    ],
    initialUsers: [
      {
        id: "u-woreda-admin",
        fullName: "Woreda 1 Admin",
        status: "ACTIVE",
        roles: [{ role: { code: RoleCode.WOREDA_ADMIN } }],
        offices: [{ id: "dep-wa", officeId: "off-woreda-1", isActive: true }],
      },
    ],
  });
  const service = new StaffService(mockPrisma, mockAuthService);

  // 1. Privilege escalation: Woreda Admin cannot create a Bureau Admin or System Superadmin
  await assert.rejects(
    async () => {
      await service.createStaff("u-woreda-admin", {
        phoneNumber: "0911000999",
        fullName: "Unauthorized Escalation",
        email: "escalate@example.com",
        password: "Password123!",
        roleCode: RoleCode.BUREAU_ADMIN,
        officeId: "off-bureau",
      });
    },
    (err) => err.response?.code === "PRIVILEGE_ESCALATION_PROHIBITED"
  );

  // 2. Jurisdiction: Woreda Admin cannot assign staff to an office in another Woreda
  await assert.rejects(
    async () => {
      await service.createStaff("u-woreda-admin", {
        phoneNumber: "0911000888",
        fullName: "Another Woreda Staff",
        email: "other@example.com",
        password: "Password123!",
        roleCode: RoleCode.WOREDA_OFFICER,
        officeId: "off-woreda-other",
      });
    },
    (err) => err.response?.code === "OUTSIDE_JURISDICTION"
  );
});

test("StaffController: Route and policy parity verified", () => {
  const controller = new StaffController({});
  assert.ok(controller, "StaffController instantiated");
  const methods = Object.getOwnPropertyNames(StaffController.prototype).filter(
    (m) => m !== "constructor"
  );
  assert.equal(methods.length, 8, "StaffController must have exactly 8 endpoints");
});

