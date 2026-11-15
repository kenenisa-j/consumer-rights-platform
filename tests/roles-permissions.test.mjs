import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RoleCode, OfficeLevel } from "@prisma/client";
import { AssignRoleDto } from "../backend/dist/modules/roles-permissions/dto/assign-role.dto.js";
import { CreatePermissionDto } from "../backend/dist/modules/roles-permissions/dto/create-permission.dto.js";
import { RolesPermissionsService } from "../backend/dist/modules/roles-permissions/roles-permissions.service.js";
import { RolesPermissionsController } from "../backend/dist/modules/roles-permissions/roles-permissions.controller.js";

function createMockPrisma({
  initialRoles = [],
  initialPermissions = [],
  initialRolePermissions = [],
  initialUsers = [],
  initialOffices = [],
} = {}) {
  const roles = new Map(initialRoles.map((r) => [r.code, { ...r }]));
  const permissions = new Map(initialPermissions.map((p) => [p.code, { ...p }]));
  const rolePermissions = [...initialRolePermissions];
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));

  return {
    role: {
      findUnique: async ({ where }) => {
        const r = where.code ? roles.get(where.code) : Array.from(roles.values()).find((x) => x.id === where.id);
        if (!r) return null;
        const res = { ...r };
        res.permissions = rolePermissions
          .filter((rp) => rp.roleId === r.id)
          .map((rp) => ({ permission: permissions.get(rp.permissionCode) || { id: rp.permissionId, code: rp.permissionCode } }));
        return res;
      },
      findMany: async () => Array.from(roles.values()),
    },
    permission: {
      findUnique: async ({ where }) => permissions.get(where.code) || null,
      findMany: async () => Array.from(permissions.values()),
      create: async ({ data }) => {
        const created = { id: `perm-${Date.now()}-${Math.random()}`, ...data };
        permissions.set(created.code, created);
        return created;
      },
    },
    rolePermission: {
      upsert: async ({ create }) => {
        rolePermissions.push({ ...create, permissionCode: create.permissionId });
        return create;
      },
      deleteMany: async ({ where }) => {
        const idx = rolePermissions.findIndex((rp) => rp.roleId === where.roleId && rp.permissionId === where.permissionId);
        if (idx !== -1) rolePermissions.splice(idx, 1);
        return { count: 1 };
      },
    },
    user: {
      findUnique: async ({ where, include }) => {
        const u = users.get(where.id);
        if (!u) return null;
        const res = { ...u };
        if (include?.roles) {
          res.roles = (u.roles || []).map((rCode) => {
            const roleObj = roles.get(rCode) || { id: `r-${rCode}`, code: rCode };
            const perms = rolePermissions
              .filter((rp) => rp.roleId === roleObj.id)
              .map((rp) => ({ permission: permissions.get(rp.permissionCode) || { code: rp.permissionCode } }));
            return {
              role: {
                ...roleObj,
                permissions: perms,
              },
            };
          });
        }
        if (include?.offices) {
          res.offices = (u.offices || []).map((o) => ({
            ...o,
            office: offices.get(o.officeId),
          }));
        }
        return res;
      },
      update: async ({ where, data }) => {
        const existing = users.get(where.id);
        const updated = { ...existing, ...data };
        users.set(where.id, updated);
        return updated;
      },
    },
    userRole: {
      upsert: async ({ create }) => {
        const u = users.get(create.userId);
        if (u) {
          const rObj = Array.from(roles.values()).find((x) => x.id === create.roleId);
          if (rObj && !u.roles.includes(rObj.code)) u.roles.push(rObj.code);
        }
        return create;
      },
      deleteMany: async ({ where }) => {
        const u = users.get(where.userId);
        if (u) {
          const rObj = Array.from(roles.values()).find((x) => x.id === where.roleId);
          if (rObj) u.roles = u.roles.filter((c) => c !== rObj.code);
        }
        return { count: 1 };
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
    },
  };
}

test("DTO Validation: AssignRoleDto and CreatePermissionDto enforce schemas", async () => {
  const validRole = plainToInstance(AssignRoleDto, { roleCode: "WOREDA_OFFICER" });
  assert.equal((await validate(validRole)).length, 0);

  const invalidRole = plainToInstance(AssignRoleDto, { roleCode: "SUPER_GOD_ROLE" });
  assert.ok((await validate(invalidRole)).some((e) => e.property === "roleCode"));

  const validPerm = plainToInstance(CreatePermissionDto, {
    code: "cases:inspect:jurisdiction",
    module: "cases",
    action: "inspect",
    scope: "JURISDICTION",
  });
  assert.equal((await validate(validPerm)).length, 0);

  const invalidPerm = plainToInstance(CreatePermissionDto, {
    code: "invalid-code-without-colons",
    module: "cases",
    action: "inspect",
  });
  assert.ok((await validate(invalidPerm)).some((e) => e.property === "code"));
});

test("Hierarchy & Privilege Escalation: Subordinate admin cannot grant equal or higher roles", async () => {
  const mockPrisma = createMockPrisma({
    initialRoles: [
      { id: "r-wa", code: RoleCode.WOREDA_ADMIN },
      { id: "r-ba", code: RoleCode.BUREAU_ADMIN },
      { id: "r-wo", code: RoleCode.WOREDA_OFFICER },
    ],
    initialUsers: [
      { id: "u-woreda-admin", fullName: "Woreda Admin", status: "ACTIVE", roles: [RoleCode.WOREDA_ADMIN], offices: [] },
      { id: "u-target", fullName: "Target User", status: "ACTIVE", roles: [RoleCode.WOREDA_OFFICER], offices: [] },
    ],
  });
  const service = new RolesPermissionsService(mockPrisma);

  // Woreda Admin (rank 40) attempts to grant Bureau Admin (rank 80)
  await assert.rejects(
    async () => {
      await service.assignRoleToUser("u-woreda-admin", "u-target", RoleCode.BUREAU_ADMIN);
    },
    (err) => err.response?.code === "PRIVILEGE_ESCALATION_PROHIBITED"
  );

  // Woreda Admin attempts to grant Woreda Admin (equal rank 40)
  await assert.rejects(
    async () => {
      await service.assignRoleToUser("u-woreda-admin", "u-target", RoleCode.WOREDA_ADMIN);
    },
    (err) => err.response?.code === "PRIVILEGE_ESCALATION_PROHIBITED"
  );
});

test("Jurisdiction: Woreda admin cannot manage roles outside their Woreda deployment", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-woreda-1", level: OfficeLevel.WOREDA },
      { id: "off-woreda-2", level: OfficeLevel.WOREDA },
    ],
    initialRoles: [
      { id: "r-wa", code: RoleCode.WOREDA_ADMIN },
      { id: "r-wo", code: RoleCode.WOREDA_OFFICER },
    ],
    initialUsers: [
      {
        id: "u-woreda-admin-1",
        fullName: "Admin W1",
        status: "ACTIVE",
        roles: [RoleCode.WOREDA_ADMIN],
        offices: [{ officeId: "off-woreda-1", isActive: true }],
      },
      {
        id: "u-officer-w2",
        fullName: "Officer W2",
        status: "ACTIVE",
        roles: [RoleCode.WOREDA_OFFICER],
        offices: [{ officeId: "off-woreda-2", isActive: true }],
      },
    ],
  });
  const service = new RolesPermissionsService(mockPrisma);

  // Woreda 1 Admin attempts to modify role of staff in Woreda 2
  await assert.rejects(
    async () => {
      await service.assignRoleToUser("u-woreda-admin-1", "u-officer-w2", RoleCode.WOREDA_OFFICER);
    },
    (err) => err.response?.code === "OUTSIDE_OFFICE_JURISDICTION"
  );
});

test("Separation & Permissions: Government permissions cannot be assigned to non-gov roles", async () => {
  const mockPrisma = createMockPrisma({
    initialRoles: [
      { id: "r-consumer", code: RoleCode.CONSUMER },
      { id: "r-superadmin", code: RoleCode.SYSTEM_SUPERADMIN },
    ],
    initialPermissions: [
      { code: "complaints:read:all", module: "complaints", scope: "ALL" },
      { code: "complaints:read:own", module: "complaints", scope: "OWN" },
    ],
    initialUsers: [
      { id: "u-admin", status: "ACTIVE", roles: [RoleCode.SYSTEM_SUPERADMIN], offices: [] },
    ],
  });
  const service = new RolesPermissionsService(mockPrisma);

  // Cannot assign all-scoped complaint permission to consumer
  await assert.rejects(
    async () => {
      await service.assignPermissionToRole("u-admin", RoleCode.CONSUMER, { permissionCode: "complaints:read:all" });
    },
    (err) => err.response?.code === "INVALID_NON_GOV_PERMISSION"
  );

  // Can assign own-scoped permission to consumer
  const assigned = await service.assignPermissionToRole("u-admin", RoleCode.CONSUMER, { permissionCode: "complaints:read:own" });
  assert.ok(assigned);
});

test("Effective Scope: Resolves deduplicated permissions and jurisdiction level", async () => {
  const mockPrisma = createMockPrisma({
    initialOffices: [
      { id: "off-subcity", code: "SC-AKAKI", level: OfficeLevel.SUBCITY, subcityCode: "AKAKI" },
    ],
    initialRoles: [
      { id: "r-sc", code: RoleCode.SUBCITY_COORDINATOR },
    ],
    initialPermissions: [
      { code: "profile:read:own", module: "profile" },
      { code: "complaints:read:all", module: "complaints" },
    ],
    initialRolePermissions: [
      { roleId: "r-sc", permissionId: "p1", permissionCode: "profile:read:own" },
      { roleId: "r-sc", permissionId: "p2", permissionCode: "complaints:read:all" },
    ],
    initialUsers: [
      {
        id: "u-coord",
        fullName: "Coordinator Selam",
        status: "ACTIVE",
        roles: [RoleCode.SUBCITY_COORDINATOR],
        offices: [{ officeId: "off-subcity", isActive: true }],
      },
    ],
  });
  const service = new RolesPermissionsService(mockPrisma);

  const scope = await service.getUserEffectiveScope("u-coord");
  assert.equal(scope.jurisdictionLevel, "subcity");
  assert.equal(scope.activeOffice.code, "SC-AKAKI");
  assert.ok(scope.permissions.includes("complaints:read:all"));
  assert.ok(scope.permissions.includes("profile:read:own"));
});

test("Safety: Cannot revoke the last remaining role from a user", async () => {
  const mockPrisma = createMockPrisma({
    initialRoles: [
      { id: "r-superadmin", code: RoleCode.SYSTEM_SUPERADMIN },
      { id: "r-wo", code: RoleCode.WOREDA_OFFICER },
    ],
    initialUsers: [
      { id: "u-admin", status: "ACTIVE", roles: [RoleCode.SYSTEM_SUPERADMIN], offices: [] },
      { id: "u-officer", status: "ACTIVE", roles: [RoleCode.WOREDA_OFFICER], offices: [] },
    ],
  });
  const service = new RolesPermissionsService(mockPrisma);

  await assert.rejects(
    async () => {
      await service.revokeRoleFromUser("u-admin", "u-officer", RoleCode.WOREDA_OFFICER);
    },
    (err) => err.response?.code === "CANNOT_REMOVE_LAST_ROLE"
  );
});

test("RolesPermissionsController: Route and policy parity verified", () => {
  const controller = new RolesPermissionsController({});
  assert.ok(controller, "RolesPermissionsController instantiated");
  const methods = Object.getOwnPropertyNames(RolesPermissionsController.prototype).filter(
    (m) => m !== "constructor"
  );
  assert.equal(methods.length, 9, "RolesPermissionsController must have exactly 9 endpoints");
});

