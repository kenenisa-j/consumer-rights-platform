// Development seed: roles and their permissions, the office tree, reference data, public content, the fictional test accounts
// from @consumer-rights/contracts and a few demo complaints. Safe to run again (every write is an upsert or checked first).
// Refuses to run in production.
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { DEV_TEST_ACCOUNTS, DEV_TEST_PASSWORD, consumerAlias } from "@consumer-rights/contracts";
import { seedReference } from "./seed-reference.mjs";

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

const PERMISSIONS = {
  "profile.read.own": ["profile", "read", "OWN", "Read my own profile and role"],
  "complaints.create.own": ["complaints", "create", "OWN", "Make a complaint"],
  "complaints.read.own": ["complaints", "read", "OWN", "Read my own complaints"],
  "cases.read.business": ["cases", "read", "BUSINESS", "Read complaints made against my business (pseudonymous)"],
  "cases.read.office": ["cases", "read", "OFFICE", "Read the cases held by my office"],
  "tips.read.office": ["tips", "read", "OFFICE", "Read the tips sent to my office"],
  "messages.use": ["messages", "use", "OWN", "Read and write in the conversations I am allowed in"],
  "evidence.upload.own": ["evidence", "upload", "OWN", "Add evidence files to my own complaints"],
  "evidence.read": ["evidence", "read", "SCOPED", "Open evidence files I am allowed to see"],
  "business.read.own": ["business", "read", "BUSINESS", "Read my own business profile"]
};
const STAFF = ["profile.read.own", "cases.read.office", "tips.read.office", "messages.use", "evidence.read"];
const GRANTS = {
  CONSUMER: ["profile.read.own", "complaints.create.own", "complaints.read.own", "messages.use", "evidence.upload.own", "evidence.read"],
  BUSINESS_OWNER: ["profile.read.own", "cases.read.business", "messages.use", "business.read.own", "evidence.read"],
  WOREDA_OFFICER: STAFF, WOREDA_ADMIN: STAFF, SUBCITY_COORDINATOR: STAFF, BUREAU_OFFICER: STAFF, BUREAU_ADMIN: STAFF,
  CONTENT_ADMIN: ["profile.read.own"], SYSTEM_SUPERADMIN: Object.keys(PERMISSIONS)
};

// Where each test account works. The Woreda officer and administrator share Woreda 7.
const OFFICE_CODE = { woreda: "WO-AKAKI-KALITY-07", subcity: "SC-AKAKI-KALITY", bureau: "AA-BUREAU" };

async function main() {
  const permissions = {};
  for (const [code, [module, action, scope, description]] of Object.entries(PERMISSIONS)) {
    permissions[code] = await db.permission.upsert({ where: { code }, update: { description }, create: { code, module, action, scope, description } });
  }
  const roles = {};
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    roles[code] = await db.role.upsert({ where: { code }, update: { name }, create: { code, name } });
    for (const p of GRANTS[code]) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[code].id, permissionId: permissions[p].id } }, update: {},
        create: { roleId: roles[code].id, permissionId: permissions[p].id }
      });
    }
  }

  const ref = await seedReference(db);
  const merchant = await db.merchant.findUniqueOrThrow({ where: { registrationNumber: "AA-TRD-0001" } });

  const passwordHash = await hashPassword(DEV_TEST_PASSWORD);
  const users = {};
  for (const a of DEV_TEST_ACCOUNTS) {
    const fields = { fullName: a.fullName, email: a.email, emailVerified: true, phoneNumberVerified: true, status: "ACTIVE", preferredLanguage: "en" };
    const user = await db.user.upsert({
      where: { phoneNumber: a.phone }, update: { ...fields, passwordHash },
      create: { phoneNumber: a.phone, passwordHash, ...fields }
    });
    users[a.key] = user;
    const roleCode = a.role.toUpperCase();
    await db.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles[roleCode].id } }, update: {}, create: { userId: user.id, roleId: roles[roleCode].id } });
    const existing = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (existing) await db.account.update({ where: { id: existing.id }, data: { password: passwordHash } });
    else await db.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash } });
    if (a.office && !(await db.userOffice.findFirst({ where: { userId: user.id, isActive: true } }))) {
      await db.userOffice.create({ data: { userId: user.id, officeId: ref.offices[OFFICE_CODE[a.office]].id, roleInOffice: roleCode, isPrimary: true } });
    }
    if (a.key === "business") {
      await db.merchantUser.upsert({ where: { merchantId_userId: { merchantId: merchant.id, userId: user.id } }, update: {}, create: { merchantId: merchant.id, userId: user.id } });
    }
  }

  // Demo complaints for the consumer test account, so the lists and dashboards have something real to show.
  const consumer = users.consumer;
  const category = code => db.complaintCategory.findUniqueOrThrow({ where: { code } });
  const demo = [
    { subject: "Rice sold short and mixed with stones", cat: "wrong_weight_measure", item: "White rice, 25 kg sack", amount: 3100, want: "refund:3100", status: "SUBMITTED_TO_BUSINESS", route: "REGISTERED_BUSINESS", merchantId: merchant.id, office: null, level: "business",
      narrative: "I bought a 25 kg sack of white rice. At home it weighed 21 kg and had small stones in it." },
    { subject: "Electric kettle stopped working after three days", cat: "defective_goods", item: "Electric kettle, 1.7 litre", amount: 1450, want: "replacement", status: "UNDER_INITIAL_REVIEW", route: "DIRECT_GOVERNMENT", unregistered: "Kality Electronics (not registered)", office: "WO-AKAKI-KALITY-07", level: "woreda",
      narrative: "The kettle stopped heating on the third day. I took it back and the seller said it was my fault." },
    { subject: "Sugar sold above the posted price", cat: "price_above_ceiling", item: "Sugar, 5 kg", amount: 800, want: "refund:150", status: "RECEIVED_BY_OFFICE", route: "DIRECT_GOVERNMENT", unregistered: "Market stall 14", office: "AA-BUREAU", level: "bureau",
      narrative: "The stall charged 160 ETB a kilo. The official price list at the market says 125." }
  ];
  for (const d of demo) {
    if (await db.case.findFirst({ where: { complainantId: consumer.id, subject: d.subject } })) continue;
    const cat = await category(d.cat);
    const office = d.office ? ref.offices[d.office] : null;
    const made = await db.case.create({
      data: {
        route: d.route, complainantId: consumer.id, complainantAlias: "Consumer", merchantId: d.merchantId ?? null, unregisteredMerchantName: d.unregistered ?? null,
        categoryId: cat.id, incidentDate: new Date("2026-11-01"), itemDescription: d.item, disputedAmount: d.amount, desiredRemedy: d.want,
        subject: d.subject, narrative: d.narrative, status: d.status, currentOfficeId: office?.id ?? null, 
        slaDeadline: new Date(Date.now() + cat.defaultSlaDays * 86_400_000)
      }
    });
    await db.case.update({ where: { id: made.id }, data: { complainantAlias: consumerAlias(Number(made.referenceNumber.split("-")[2])) } });
    await db.caseHistory.create({ data: { caseId: made.id, toStatus: d.status, handlingLevel: d.level, officeId: office?.id ?? null, actorUserId: consumer.id, publicNote: "Complaint received." } });
    const conv = await db.conversation.create({ data: { caseId: made.id, kind: d.route === "REGISTERED_BUSINESS" ? "CONSUMER_BUSINESS" : "CONSUMER_GOVERNMENT", participants: { create: { userId: consumer.id, role: "CONSUMER" } } } });
    await db.message.create({ data: { conversationId: conv.id, senderUserId: consumer.id, content: d.narrative } });
  }

  console.log(`Seeded ${Object.keys(ROLE_NAMES).length} roles, ${Object.keys(PERMISSIONS).length} permissions, ${Object.keys(ref.offices).length} offices, ${ref.merchants} businesses, public content and ${DEV_TEST_ACCOUNTS.length} test accounts (password: ${DEV_TEST_PASSWORD}).`);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); await pool.end(); });
