// Development seed: roles, one permission, a small office tree, and the fictional test accounts from
// @consumer-rights/contracts. Safe to run again (every write is an upsert). Refuses to run in production.
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { DEV_TEST_ACCOUNTS, DEV_TEST_PASSWORD } from "@consumer-rights/contracts";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed test accounts in production.");
if (typeof process.loadEnvFile === "function") { try { process.loadEnvFile(new URL("../../.env", import.meta.url)); } catch { /* env may come from the host */ } }
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const ROLE_NAMES = {
  CONSUMER: "Consumer", BUSINESS_OWNER: "Business owner", WOREDA_OFFICER: "Woreda officer", WOREDA_ADMIN: "Woreda administrator",
  SUBCITY_COORDINATOR: "Sub-City coordinator", BUREAU_OFFICER: "City Bureau officer", BUREAU_ADMIN: "City Bureau administrator",
  CONTENT_ADMIN: "Content administrator", SYSTEM_SUPERADMIN: "System administrator"
};

async function main() {
  const permDefs = [
    { code: "profile.read.own", module: "profile", action: "read", scope: "OWN", description: "Read my own profile and role", forRoles: Object.keys(ROLE_NAMES) },
    { code: "notifications:read:own", module: "notifications", action: "read", scope: "OWN", description: "Read own notifications", forRoles: Object.keys(ROLE_NAMES) },
    { code: "notifications:manage:own", module: "notifications", action: "manage", scope: "OWN", description: "Manage and mark own notifications", forRoles: Object.keys(ROLE_NAMES) },
    { code: "complaints:create:own", module: "complaints", action: "create", scope: "OWN", description: "Submit complaint as consumer", forRoles: ["CONSUMER"] },
    { code: "complaints:read:own", module: "complaints", action: "read", scope: "OWN", description: "Read own complaints", forRoles: ["CONSUMER"] },
    { code: "complaints:read:all", module: "complaints", action: "read", scope: "ALL", description: "Read complaints in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "transfers:accept", module: "transfers", action: "accept", scope: "JURISDICTION", description: "Accept incoming case transfers in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "transfers:initiate", module: "transfers", action: "initiate", scope: "JURISDICTION", description: "Initiate case transfer to parent office in hierarchy", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "transfers:reject", module: "transfers", action: "reject", scope: "JURISDICTION", description: "Reject or return incoming case transfer to sending office", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "transfers:read", module: "transfers", action: "read", scope: "JURISDICTION", description: "View incoming, outgoing, and chronological case transfers", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "complaints:triage", module: "complaints", action: "triage", scope: "JURISDICTION", description: "Review and triage incoming complaints in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "complaints:assign", module: "complaints", action: "assign", scope: "JURISDICTION", description: "Assign and reassign officers to complaints", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "inspections:create", module: "inspections", action: "create", scope: "JURISDICTION", description: "Schedule inspections and start investigations in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "inspections:read", module: "inspections", action: "read", scope: "JURISDICTION", description: "Read inspection records and investigation details in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "inspections:manage", module: "inspections", action: "manage", scope: "JURISDICTION", description: "Update inspections, record findings, and submit investigations in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "decisions:create", module: "decisions", action: "create", scope: "JURISDICTION", description: "Issue decisions and verify compliance in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "decisions:read", module: "decisions", action: "read", scope: "JURISDICTION", description: "Read case decisions and resolution orders in jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "cases:close", module: "cases", action: "close", scope: "JURISDICTION", description: "Close resolved or non-actionable complaints", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "cases:reopen", module: "cases", action: "reopen", scope: "JURISDICTION", description: "Reopen closed complaints upon valid appeal", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "offices:manage", module: "offices", action: "manage", scope: "ALL", description: "Manage administrative offices", forRoles: ["BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "staff:manage", module: "staff", action: "manage", scope: "JURISDICTION", description: "Manage government staff within jurisdiction", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "staff:read", module: "staff", action: "read", scope: "JURISDICTION", description: "Read government staff details within jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "roles:manage", module: "roles", action: "manage", scope: "ALL", description: "Manage roles and permission bindings", forRoles: ["BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "roles:read", module: "roles", action: "read", scope: "ALL", description: "Read roles, assigned permissions and effective scope", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "markets:manage", module: "markets", action: "manage", scope: "JURISDICTION", description: "Manage public markets within jurisdiction", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "merchants:manage", module: "merchants", action: "manage", scope: "JURISDICTION", description: "Register, update and suspend merchants within jurisdiction", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "merchants:read", module: "merchants", action: "read", scope: "JURISDICTION", description: "Read merchant registry within jurisdiction", forRoles: ["WOREDA_OFFICER", "WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_OFFICER", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "merchants:verify", module: "merchants", action: "verify", scope: "JURISDICTION", description: "Verify or reject merchant registrations", forRoles: ["WOREDA_ADMIN", "SUBCITY_COORDINATOR", "BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] },
    { code: "business.profile:read", module: "business", action: "read", scope: "OWN", description: "Read own business profile", forRoles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE"] },
    { code: "business.profile:manage", module: "business", action: "manage", scope: "OWN", description: "Update own business profile", forRoles: ["BUSINESS_OWNER"] },
    { code: "business.staff:read", module: "business", action: "read", scope: "OWN", description: "View staff linked to own business", forRoles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE"] },
    { code: "business.staff:manage", module: "business", action: "manage", scope: "OWN", description: "Add, update or remove staff for own business", forRoles: ["BUSINESS_OWNER"] },
    { code: "complaints.business:read", module: "complaints", action: "read", scope: "OWN", description: "View complaints submitted against own business", forRoles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE"] },
    { code: "complaints.business:respond", module: "complaints", action: "respond", scope: "OWN", description: "Respond to and propose settlement offers on complaints", forRoles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE"] },
    { code: "categories:manage", module: "categories", action: "manage", scope: "ALL", description: "Manage complaint categories and SLAs", forRoles: ["BUREAU_ADMIN", "SYSTEM_SUPERADMIN"] }
  ];

  const roles = {};
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    roles[code] = await db.role.upsert({ where: { code }, update: { name }, create: { code, name } });
  }

  for (const p of permDefs) {
    const perm = await db.permission.upsert({
      where: { code: p.code }, update: {},
      create: { code: p.code, module: p.module, action: p.action, scope: p.scope, description: p.description }
    });
    for (const roleCode of p.forRoles) {
      if (roles[roleCode]) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: roles[roleCode].id, permissionId: perm.id } }, update: {},
          create: { roleId: roles[roleCode].id, permissionId: perm.id }
        });
      }
    }
  }

  const office = (code, data) => db.administrativeOffice.upsert({ where: { code }, update: {}, create: { code, ...data } });
  const bureau = await office("AA-BUREAU", { nameEn: "Addis Ababa Bureau of Trade and Market Development", nameAm: "የአዲስ አበባ ንግድና ገበያ ልማት ቢሮ", level: "CITY_BUREAU", address: "Addis Ababa", phone: "+251111000000" });
  const subcity = await office("SC-AKAKI-KALITY", { nameEn: "Akaki Kality Sub-City Trade Office", nameAm: "አቃቂ ቃሊቲ ክፍለ ከተማ ንግድ ጽሕፈት ቤት", level: "SUBCITY", parentOfficeId: bureau.id, subcityCode: "AKAKI-KALITY", address: "Akaki Kality", phone: "+251111000100" });
  const woreda = await office("WO-AKAKI-KALITY-07", { nameEn: "Akaki Kality Woreda 7 Trade Office", nameAm: "አቃቂ ቃሊቲ ወረዳ 7 ንግድ ጽሕፈት ቤት", level: "WOREDA", parentOfficeId: subcity.id, subcityCode: "AKAKI-KALITY", woredaCode: "07", address: "Akaki Kality, Woreda 7", phone: "+251111000107" });
  const offices = { woreda, subcity, bureau };

  const passwordHash = await hashPassword(DEV_TEST_PASSWORD);
  for (const a of DEV_TEST_ACCOUNTS) {
    const fields = { fullName: a.fullName, email: a.email, emailVerified: true, phoneNumberVerified: true, status: "ACTIVE", preferredLanguage: "en" };
    const user = await db.user.upsert({
      where: { phoneNumber: a.phone }, update: { ...fields, passwordHash },
      create: { phoneNumber: a.phone, passwordHash, ...fields }
    });
    const roleCode = a.role.toUpperCase();
    await db.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles[roleCode].id } }, update: {}, create: { userId: user.id, roleId: roles[roleCode].id } });
    const existing = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (existing) await db.account.update({ where: { id: existing.id }, data: { password: passwordHash } });
    else await db.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash } });
    if (a.office && !(await db.userOffice.findFirst({ where: { userId: user.id, isActive: true } }))) {
      await db.userOffice.create({ data: { userId: user.id, officeId: offices[a.office].id, roleInOffice: roleCode, isPrimary: true } });
    }
    if (a.key === "business") {
      const merchant = await db.merchant.upsert({
        where: { registrationNumber: "AA-TRD-0001" }, update: {},
        create: { registrationNumber: "AA-TRD-0001", tradeName: "Gebriel Grain Traders", legalName: "Gebriel Grain Traders PLC", businessType: "Wholesale", businessCategory: "Grain", woredaOfficeId: woreda.id, phoneNumber: a.phone }
      });
      await db.merchantUser.upsert({ where: { merchantId_userId: { merchantId: merchant.id, userId: user.id } }, update: {}, create: { merchantId: merchant.id, userId: user.id } });
    }
  }

  const defaultCategories = [
    { code: "OVERPRICING", nameEn: "Overpricing / Price Gouging", nameAm: "ያልተገባ የዋጋ ጭማሪ", defaultSlaDays: 3, defaultRemitLevel: "WOREDA" },
    { code: "HOARDING", nameEn: "Hoarding / Withholding Goods", nameAm: "ሸቀጥ መደበቅ", defaultSlaDays: 2, defaultRemitLevel: "WOREDA" },
    { code: "DEFECTIVE_GOODS", nameEn: "Defective or Damaged Goods", nameAm: "ጉድለት ያለበት ዕቃ", defaultSlaDays: 5, defaultRemitLevel: "WOREDA" },
    { code: "EXPIRED_GOODS", nameEn: "Expired or Substandard Goods", nameAm: "ጊዜው ያለፈበት ዕቃ", defaultSlaDays: 2, defaultRemitLevel: "WOREDA" },
    { code: "FALSE_ADVERTISING", nameEn: "Misleading or False Advertising", nameAm: "አሳሳች ማስታወቂያ", defaultSlaDays: 7, defaultRemitLevel: "SUBCITY" },
    { code: "REFUSAL_OF_RECEIPT", nameEn: "Refusal to Issue Legal Receipt", nameAm: "ደረሰኝ አለመስጠት", defaultSlaDays: 3, defaultRemitLevel: "WOREDA" },
    { code: "WEIGHT_MEASURE", nameEn: "Inaccurate Weights and Measures", nameAm: "የክብደት ወይም መለኪያ ማጭበርበር", defaultSlaDays: 3, defaultRemitLevel: "WOREDA" },
    { code: "OTHER", nameEn: "Other Consumer Rights Violation", nameAm: "ሌላ የሸማቾች መብት ጥሰት", defaultSlaDays: 5, defaultRemitLevel: "WOREDA" }
  ];
  for (const cat of defaultCategories) {
    await db.complaintCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { ...cat, isActive: true }
    });
  }
  console.log(`Seeded ${Object.keys(ROLE_NAMES).length} roles, 3 offices and ${DEV_TEST_ACCOUNTS.length} test accounts (password: ${DEV_TEST_PASSWORD}).`);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); await pool.end(); });
