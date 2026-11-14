/**
 * Seed script: creates fictional demo users, roles, permissions, offices, merchants, and cases.
 * All people and businesses are fictional (see documentation/prototype-guide.md).
 *
 * Usage: npx tsx backend/prisma/seed.ts
 * Requires: DATABASE_URL in .env, migrations applied.
 */
import { PrismaClient, RoleCode, OfficeLevel, ComplaintRoute, CaseStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
  try {
    process.loadEnvFile('../.env');
  } catch {}
}

const databaseUrl = process.env.DATABASE_URL || 'postgresql://consumer_rights:REPLACE_WITH_RANDOM_PASSWORD@127.0.0.1:5546/consumer_rights';
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with fictional demo data...');

  // 1. Roles
  const roles = await Promise.all(
    Object.values(RoleCode).map((code) =>
      prisma.role.upsert({
        where: { code },
        update: {},
        create: { code, name: code.replace(/_/g, ' ').toLowerCase() },
      }),
    ),
  );
  const consumerRole = roles.find((r) => r.code === RoleCode.CONSUMER)!;
  const woredaOfficerRole = roles.find((r) => r.code === RoleCode.WOREDA_OFFICER)!;

  // 2. Permissions
  const complaintsReadOwn = await prisma.permission.upsert({
    where: { code: 'complaints:read:own' },
    update: {},
    create: { code: 'complaints:read:own', module: 'complaints', action: 'read', scope: 'OWN' },
  });
  const complaintsReadAll = await prisma.permission.upsert({
    where: { code: 'complaints:read:all' },
    update: {},
    create: { code: 'complaints:read:all', module: 'complaints', action: 'read', scope: 'ALL' },
  });

  // Bind permissions to roles
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: consumerRole.id, permissionId: complaintsReadOwn.id } },
    update: {},
    create: { roleId: consumerRole.id, permissionId: complaintsReadOwn.id },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: woredaOfficerRole.id, permissionId: complaintsReadAll.id } },
    update: {},
    create: { roleId: woredaOfficerRole.id, permissionId: complaintsReadAll.id },
  });

  // 3. Administrative Offices
  const bureau = await prisma.administrativeOffice.upsert({
    where: { code: 'BUREAU-AA' },
    update: {},
    create: {
      code: 'BUREAU-AA', nameEn: 'Addis Ababa Trade and Market Bureau', nameAm: 'የአዲስ አበባ ንግድና ገበያ ልማት ቢሮ',
      level: OfficeLevel.CITY_BUREAU, address: 'Mexico, Addis Ababa', phone: '0111-234567',
    },
  });
  const subcityOffice = await prisma.administrativeOffice.upsert({
    where: { code: 'SC-AKAKI' },
    update: {},
    create: {
      code: 'SC-AKAKI', nameEn: 'Akaki Kality Sub-City Trade Office', nameAm: 'አቃቂ ቃሊቲ ክ/ከ ንግድ ጽ/ቤት',
      level: OfficeLevel.SUBCITY, subcityCode: 'AKAKI', parentOfficeId: bureau.id,
      address: 'Akaki Kality, Addis Ababa', phone: '0111-345678',
    },
  });
  const woredaOffice = await prisma.administrativeOffice.upsert({
    where: { code: 'W7-AKAKI' },
    update: {},
    create: {
      code: 'W7-AKAKI', nameEn: 'Woreda 7 Trade Office, Akaki Kality', nameAm: 'ወረዳ 7 ንግድ ጽ/ቤት',
      level: OfficeLevel.WOREDA, woredaCode: 'W7', subcityCode: 'AKAKI', parentOfficeId: subcityOffice.id,
      address: 'Woreda 7, Akaki Kality', phone: '0111-456789',
    },
  });

  // 4. Users (fictional)
  const pw = await hashPassword('demo12345678');

  const hirut = await prisma.user.upsert({
    where: { phoneNumber: '+251911000001' },
    update: { passwordHash: pw, status: 'ACTIVE', phoneNumberVerified: true },
    create: {
      phoneNumber: '+251911000001', fullName: 'Hirut Alemu', email: '251911000001@consumer.local',
      passwordHash: pw, phoneNumberVerified: true, status: 'ACTIVE',
    },
  });
  await prisma.account.upsert({
    where: { id: hirut.id + '-cred' },
    update: { password: pw },
    create: { id: hirut.id + '-cred', accountId: hirut.id, providerId: 'credential', userId: hirut.id, password: pw },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hirut.id, roleId: consumerRole.id } },
    update: {},
    create: { userId: hirut.id, roleId: consumerRole.id },
  });

  const meron = await prisma.user.upsert({
    where: { phoneNumber: '+251911000002' },
    update: { passwordHash: pw, status: 'ACTIVE', phoneNumberVerified: true },
    create: {
      phoneNumber: '+251911000002', fullName: 'Meron Tadesse', email: '251911000002@officer.local',
      passwordHash: pw, phoneNumberVerified: true, status: 'ACTIVE',
    },
  });
  await prisma.account.upsert({
    where: { id: meron.id + '-cred' },
    update: { password: pw },
    create: { id: meron.id + '-cred', accountId: meron.id, providerId: 'credential', userId: meron.id, password: pw },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: meron.id, roleId: woredaOfficerRole.id } },
    update: {},
    create: { userId: meron.id, roleId: woredaOfficerRole.id },
  });

  // 5. Complaint category
  const cat = await prisma.complaintCategory.upsert({
    where: { code: 'DEFECTIVE_GOODS' },
    update: {},
    create: { code: 'DEFECTIVE_GOODS', nameEn: 'Defective or substandard goods', nameAm: 'ጉድለት ያለበት ወይም ደረጃውን ያልጠበቀ ዕቃ' },
  });

  // 6. Merchant
  const merchant = await prisma.merchant.upsert({
    where: { registrationNumber: 'AA-2024-GGT-001' },
    update: {},
    create: {
      registrationNumber: 'AA-2024-GGT-001', tradeName: 'Gebriel Grain Traders', legalName: 'Gebriel Grain Traders PLC',
      businessType: 'Retail', businessCategory: 'Groceries', woredaOfficeId: woredaOffice.id,
      phoneNumber: '+251911223344',
    },
  });

  // 7. Cases (fictional, matching the prototype demo data)
  const existingCase = await prisma.case.findFirst({ where: { complainantId: hirut.id } });
  if (!existingCase) {
    await prisma.case.create({
      data: {
        route: ComplaintRoute.REGISTERED_BUSINESS,
        complainantId: hirut.id,
        complainantAlias: 'Consumer 00001',
        merchantId: merchant.id,
        categoryId: cat.id,
        incidentDate: new Date('2026-10-28'),
        itemDescription: 'Rice sold short and mixed with stones',
        disputedAmount: 2400,
        desiredRemedy: 'Full refund',
        status: CaseStatus.BUSINESS_OFFER_PENDING,
      },
    });

    await prisma.case.create({
      data: {
        route: ComplaintRoute.DIRECT_GOVERNMENT,
        complainantId: hirut.id,
        complainantAlias: 'Consumer 00001',
        unregisteredMerchantName: 'Kality Electronics',
        unregisteredMerchantLocation: 'Akaki Kality, Woreda 7',
        categoryId: cat.id,
        incidentDate: new Date('2026-10-31'),
        itemDescription: 'Electric kettle stopped working after three days',
        disputedAmount: 1450,
        desiredRemedy: 'A replacement',
        status: CaseStatus.UNDER_INITIAL_REVIEW,
        currentOfficeId: woredaOffice.id,
      },
    });
  }

  console.log('Seed complete. Demo users: Hirut (+251911000001), Meron (+251911000002). Password: demo12345678');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

