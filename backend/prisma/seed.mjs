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
  const permission = await db.permission.upsert({
    where: { code: "profile.read.own" }, update: {},
    create: { code: "profile.read.own", module: "profile", action: "read", scope: "OWN", description: "Read my own profile and role" }
  });
  const roles = {};
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    roles[code] = await db.role.upsert({ where: { code }, update: { name }, create: { code, name } });
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles[code].id, permissionId: permission.id } }, update: {},
      create: { roleId: roles[code].id, permissionId: permission.id }
    });
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
  console.log(`Seeded ${Object.keys(ROLE_NAMES).length} roles, 3 offices and ${DEV_TEST_ACCOUNTS.length} test accounts (password: ${DEV_TEST_PASSWORD}).`);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); await pool.end(); });
