import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CaseStatus,
  ComplaintRoute,
  OfficeLevel,
  RoleCode,
} from "@prisma/client";
import { UploadEvidenceDto } from "../backend/dist/modules/cases/dto/upload-evidence.dto.js";
import { EvidenceService } from "../backend/dist/modules/cases/evidence.service.js";
import { EvidenceController } from "../backend/dist/modules/cases/evidence.controller.js";
import { StorageService } from "../backend/dist/lib/storage/storage.service.js";

function createMockStorage() {
  const fileStore = new Map();

  return {
    validateFile: (buffer, clientMime) => {
      if (buffer.length > 10 * 1024 * 1024) {
        const err = new Error("File size exceeds 10MB limit.");
        err.response = { code: "FILE_TOO_LARGE" };
        throw err;
      }
      // Check magic bytes or extension
      if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return "application/pdf";
      }
      if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
      }
      if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return "image/png";
      }
      if (clientMime === "application/pdf" || clientMime === "image/jpeg" || clientMime === "image/png") {
        return clientMime;
      }
      const err = new Error("Unsupported file type.");
      err.response = { code: "UNSUPPORTED_FILE_TYPE" };
      throw err;
    },
    generateSafeStoragePath: (caseId, originalFileName) => {
      const ext = originalFileName.endsWith(".pdf") ? ".pdf" : originalFileName.endsWith(".jpg") ? ".jpg" : ".bin";
      const cleanName = originalFileName.replace(/[^\w.\-\s]/g, "_");
      return {
        relativePath: `cases/${caseId}/safe-uuid-1234${ext}`,
        fileName: cleanName,
      };
    },
    saveFile: async (relativePath, buffer) => {
      fileStore.set(relativePath, buffer);
    },
    getFile: async (relativePath) => {
      const buf = fileStore.get(relativePath);
      if (!buf) {
        const err = new Error("File not found.");
        err.response = { code: "FILE_NOT_FOUND" };
        throw err;
      }
      return buf;
    },
    fileStore,
  };
}

function createMockPrisma({
  initialCases = [],
  initialOffices = [],
  initialUsers = [],
  initialEvidence = [],
  initialMerchantUsers = [],
  initialMerchants = [],
  initialInspections = [],
} = {}) {
  const cases = new Map(initialCases.map((c) => [c.id, { ...c }]));
  const offices = new Map(initialOffices.map((o) => [o.id, { ...o }]));
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  const evidenceStore = new Map(
    initialEvidence.map((e) => [
      e.id,
      { createdAt: e.createdAt || new Date(), isSanitizedCopy: false, isOfficerOnly: false, ...e },
    ]),
  );
  const merchantUsers = [...initialMerchantUsers];
  const merchants = new Map(initialMerchants.map((m) => [m.id, { ...m }]));
  const inspections = new Map(initialInspections.map((i) => [i.id, { ...i }]));
  const historyStore = [];
  const auditStore = [];

  const mock = {
    user: {
      findUnique: async ({ where, include }) => {
        const u = users.get(where.id);
        if (!u) return null;
        const res = { ...u };
        if (include?.roles) res.roles = u.roles || [];
        if (include?.offices) {
          res.offices = (u.offices || []).map((o) => ({
            ...o,
            office: offices.get(o.officeId),
          }));
        }
        return res;
      },
    },
    administrativeOffice: {
      findUnique: async ({ where }) => offices.get(where.id) || null,
    },
    case: {
      findUnique: async ({ where, include }) => {
        const c = Array.from(cases.values()).find(
          (x) => x.id === where.id || x.referenceNumber === where.referenceNumber,
        );
        if (!c) return null;
        const res = { ...c };
        if (include?.currentOffice) res.currentOffice = offices.get(c.currentOfficeId) || null;
        if (include?.evidenceFiles) {
          res.evidenceFiles = Array.from(evidenceStore.values())
            .filter((e) => e.caseId === c.id)
            .map((e) => ({ ...e, uploader: users.get(e.uploaderUserId) || { id: e.uploaderUserId, fullName: "Uploader" } }));
        }
        return res;
      },
    },
    evidenceFile: {
      create: async ({ data }) => {
        const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const record = { id, ...data, createdAt: new Date() };
        evidenceStore.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }) => {
        const ev = evidenceStore.get(where.id);
        if (!ev) return null;
        const res = { ...ev };
        if (include?.case) {
          const c = cases.get(ev.caseId);
          res.case = { ...c, currentOffice: offices.get(c?.currentOfficeId) };
        }
        if (include?.uploader) res.uploader = users.get(ev.uploaderUserId) || { id: ev.uploaderUserId, fullName: "Uploader" };
        return res;
      },
    },
    inspection: {
      findUnique: async ({ where }) => inspections.get(where.id) || null,
    },
    merchantUser: {
      findFirst: async ({ where }) => {
        const mu = merchantUsers.find(
          (x) => x.userId === where.userId && (!where.merchantId || x.merchantId === where.merchantId),
        );
        if (!mu) return null;
        return { ...mu, merchant: merchants.get(mu.merchantId) };
      },
    },
    caseHistory: {
      create: async ({ data }) => {
        const rec = { id: `hist-${Date.now()}`, ...data, createdAt: new Date() };
        historyStore.push(rec);
        return rec;
      },
    },
    caseAuditLog: {
      create: async ({ data }) => {
        const rec = { id: `audit-${Date.now()}`, ...data, timestamp: new Date() };
        auditStore.push(rec);
        return rec;
      },
    },
    $transaction: async (fn) => fn(mock),
  };

  return { mock, cases, evidenceStore, historyStore, auditStore };
}

const mockOffices = [
  { id: "off-woreda-1", code: "WO-01", nameEn: "Woreda 01 Office", level: OfficeLevel.WOREDA, subcityCode: "BOLE" },
  { id: "off-woreda-2", code: "WO-02", nameEn: "Woreda 02 Office", level: OfficeLevel.WOREDA, subcityCode: "KIRKOS" },
];

const mockUsers = [
  { id: "u-citizen-1", fullName: "Tadesse Citizen", roles: [{ role: { code: RoleCode.CONSUMER } }], offices: [], status: "ACTIVE" },
  { id: "u-citizen-2", fullName: "Other Citizen", roles: [{ role: { code: RoleCode.CONSUMER } }], offices: [], status: "ACTIVE" },
  { id: "u-officer-woreda1", fullName: "Abebe Officer", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-1", isActive: true }], status: "ACTIVE" },
  { id: "u-officer-woreda2", fullName: "Chala Other Woreda", roles: [{ role: { code: RoleCode.WOREDA_OFFICER } }], offices: [{ officeId: "off-woreda-2", isActive: true }], status: "ACTIVE" },
  { id: "u-merchant-owner", fullName: "Almaz Business", roles: [{ role: { code: RoleCode.BUSINESS_OWNER } }], offices: [], status: "ACTIVE" },
  { id: "u-other-merchant", fullName: "Bekele Business", roles: [{ role: { code: RoleCode.BUSINESS_OWNER } }], offices: [], status: "ACTIVE" },
];

const mockMerchants = [
  { id: "merch-1", tradeName: "Almaz Flour Mill", isActive: true },
  { id: "merch-2", tradeName: "Bekele Grocery", isActive: true },
];

const mockMerchantUsers = [
  { userId: "u-merchant-owner", merchantId: "merch-1" },
  { userId: "u-other-merchant", merchantId: "merch-2" },
];

test("Phase 4.6: DTO validation rules", async () => {
  const invalid = plainToInstance(UploadEvidenceDto, {
    fileName: "a".repeat(300), // exceeds 255
    description: "b".repeat(600), // exceeds 500
  });
  const errors = await validate(invalid);
  assert.ok(errors.length >= 2);

  const valid = plainToInstance(UploadEvidenceDto, {
    fileName: "receipt-2026.pdf",
    fileType: "application/pdf",
    isOfficerOnly: false,
    description: "Purchase receipt for overcharged item.",
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
});

test("Phase 4.6: Consumer can upload evidence to own complaint", async () => {
  const { mock, evidenceStore, historyStore, auditStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00301",
        complainantId: "u-citizen-1",
        status: CaseStatus.OFFICER_ASSIGNED,
        currentOfficeId: "off-woreda-1",
      },
    ],
  });
  const storage = createMockStorage();
  const service = new EvidenceService(mock, storage);

  const pdfBuffer = Buffer.from("%PDF-1.4 simulated pdf document bytes");
  const result = await service.uploadConsumerEvidence(
    "u-citizen-1",
    "CC-2026-00301",
    { originalname: "receipt.pdf", buffer: pdfBuffer, size: pdfBuffer.length },
    {},
  );

  assert.ok(result.id);
  assert.equal(result.caseReference, "CC-2026-00301");
  assert.equal(result.isOfficerOnly, false);
  assert.equal(evidenceStore.size, 1);
  assert.equal(historyStore.length, 1);
  assert.equal(auditStore.some((a) => a.actionCode === "EVIDENCE_UPLOADED_CONSUMER"), true);
});

test("Phase 4.6: Consumer cannot upload to another consumer's case", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00301",
        complainantId: "u-citizen-1",
        status: CaseStatus.OFFICER_ASSIGNED,
        currentOfficeId: "off-woreda-1",
      },
    ],
  });
  const storage = createMockStorage();
  const service = new EvidenceService(mock, storage);

  const pdfBuffer = Buffer.from("%PDF-1.4 simulated pdf document bytes");
  await assert.rejects(
    () =>
      service.uploadConsumerEvidence(
        "u-citizen-2", // different citizen
        "CC-2026-00301",
        { originalname: "sneaky.pdf", buffer: pdfBuffer, size: pdfBuffer.length },
        {},
      ),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );
});

test("Phase 4.6: Business can upload only to its associated case", async () => {
  const { mock, evidenceStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialMerchants: mockMerchants,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00302",
        merchantId: "merch-1",
        complainantId: "u-citizen-1",
        status: CaseStatus.OFFICER_ASSIGNED,
        currentOfficeId: "off-woreda-1",
      },
    ],
  });
  const storage = createMockStorage();
  const service = new EvidenceService(mock, storage);

  const pdfBuffer = Buffer.from("%PDF-1.4 simulated calibration report");

  // 1. Unassociated merchant rejected
  await assert.rejects(
    () =>
      service.uploadBusinessEvidence(
        "u-other-merchant", // belongs to merch-2
        "CC-2026-00302",
        { originalname: "response.pdf", buffer: pdfBuffer, size: pdfBuffer.length },
        {},
      ),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );

  // 2. Associated merchant succeeds
  const result = await service.uploadBusinessEvidence(
    "u-merchant-owner",
    "CC-2026-00302",
    { originalname: "calibration-certificate.pdf", buffer: pdfBuffer, size: pdfBuffer.length },
    {},
  );
  assert.ok(result.id);
  assert.equal(result.isOfficerOnly, false);
  assert.equal(evidenceStore.size, 1);
});

test("Phase 4.6: Government officer upload and jurisdiction enforcement", async () => {
  const { mock, evidenceStore } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00303",
        currentOfficeId: "off-woreda-1",
        status: CaseStatus.INSPECTION_ACTIVE,
      },
    ],
  });
  const storage = createMockStorage();
  const service = new EvidenceService(mock, storage);
  const imgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic bytes

  // 1. Cross-office officer rejected
  await assert.rejects(
    () =>
      service.uploadGovernmentEvidence(
        "u-officer-woreda2",
        "CC-2026-00303",
        { originalname: "photo.jpg", buffer: imgBuffer, size: imgBuffer.length },
        { isOfficerOnly: true },
      ),
    (err) => err.response?.code === "CASE_NOT_FOUND",
  );

  // 2. Officer in jurisdiction uploads internal confidential evidence
  const result = await service.uploadGovernmentEvidence(
    "u-officer-woreda1",
    "CC-2026-00303",
    { originalname: "scale-tamper-photo.jpg", buffer: imgBuffer, size: imgBuffer.length },
    { isOfficerOnly: true },
  );
  assert.ok(result.id);
  assert.equal(result.isOfficerOnly, true);
  assert.equal(evidenceStore.get(result.id).isOfficerOnly, true);
});

test("Phase 4.6: Unsupported file types and oversized files are rejected", async () => {
  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialCases: [
      { id: "case-1", referenceNumber: "CC-2026-00304", complainantId: "u-citizen-1" },
    ],
  });
  const storage = createMockStorage();
  const service = new EvidenceService(mock, storage);

  // 1. Unsupported executable rejected
  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header
  await assert.rejects(
    () =>
      service.uploadConsumerEvidence(
        "u-citizen-1",
        "CC-2026-00304",
        { originalname: "malware.exe", buffer: exeBuffer, size: exeBuffer.length },
        {},
      ),
    (err) => err.response?.code === "UNSUPPORTED_FILE_TYPE",
  );

  // 2. Oversized file (>10MB) rejected
  const bigBuffer = Buffer.alloc(11 * 1024 * 1024);
  await assert.rejects(
    () =>
      service.uploadConsumerEvidence(
        "u-citizen-1",
        "CC-2026-00304",
        { originalname: "huge.pdf", buffer: bigBuffer, size: bigBuffer.length },
        {},
      ),
    (err) => err.response?.code === "FILE_TOO_LARGE",
  );
});

test("Phase 4.6: Internal officer-only evidence privacy and download authorization", async () => {
  const pdfBuffer = Buffer.from("%PDF-1.4 confidential investigation report");
  const publicPdfBuffer = Buffer.from("%PDF-1.4 shared receipt");

  const storage = createMockStorage();
  await storage.saveFile("cases/case-1/safe-confidential.pdf", pdfBuffer);
  await storage.saveFile("cases/case-1/safe-public.pdf", publicPdfBuffer);

  const { mock } = createMockPrisma({
    initialOffices: mockOffices,
    initialUsers: mockUsers,
    initialMerchants: mockMerchants,
    initialMerchantUsers: mockMerchantUsers,
    initialCases: [
      {
        id: "case-1",
        referenceNumber: "CC-2026-00305",
        complainantId: "u-citizen-1",
        merchantId: "merch-1",
        currentOfficeId: "off-woreda-1",
      },
    ],
    initialEvidence: [
      {
        id: "ev-internal",
        caseId: "case-1",
        uploaderUserId: "u-officer-woreda1",
        fileName: "internal-notes.pdf",
        fileType: "application/pdf",
        fileSizeBytes: pdfBuffer.length,
        storagePath: "cases/case-1/safe-confidential.pdf",
        isOfficerOnly: true,
        createdAt: new Date(),
      },
      {
        id: "ev-public",
        caseId: "case-1",
        uploaderUserId: "u-citizen-1",
        fileName: "public-receipt.pdf",
        fileType: "application/pdf",
        fileSizeBytes: publicPdfBuffer.length,
        storagePath: "cases/case-1/safe-public.pdf",
        isOfficerOnly: false,
        createdAt: new Date(),
      },
    ],
  });

  const service = new EvidenceService(mock, storage);

  // 1. Consumer listing filters out officer-only files
  const consumerList = await service.listEvidence("u-citizen-1", "CC-2026-00305", "CONSUMER");
  assert.equal(consumerList.length, 1);
  assert.equal(consumerList[0].id, "ev-public");

  // 2. Business listing filters out officer-only files
  const businessList = await service.listEvidence("u-merchant-owner", "CC-2026-00305", "BUSINESS");
  assert.equal(businessList.length, 1);
  assert.equal(businessList[0].id, "ev-public");

  // 3. Government officer listing includes all files
  const govList = await service.listEvidence("u-officer-woreda1", "CC-2026-00305", "GOVERNMENT");
  assert.equal(govList.length, 2);

  // 4. Consumer cannot download internal evidence (returns 404)
  await assert.rejects(
    () => service.downloadEvidence("u-citizen-1", "ev-internal"),
    (err) => err.response?.code === "EVIDENCE_NOT_FOUND",
  );

  // 5. Business cannot download internal evidence (returns 404)
  await assert.rejects(
    () => service.downloadEvidence("u-merchant-owner", "ev-internal"),
    (err) => err.response?.code === "EVIDENCE_NOT_FOUND",
  );

  // 6. Authorized officer downloads internal evidence successfully
  const downloaded = await service.downloadEvidence("u-officer-woreda1", "ev-internal");
  assert.equal(downloaded.fileName, "internal-notes.pdf");
  assert.ok(downloaded.buffer);
});

test("Phase 4.6: All EvidenceController routes have authorization decorators", () => {
  const proto = EvidenceController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter(
    (m) => m !== "constructor" && typeof proto[m] === "function",
  );
  assert.equal(methods.length, 8, "EvidenceController must have exactly 8 endpoints");
  for (const method of methods) {
    const hasPermission =
      Reflect.hasMetadata("permissions", proto[method]) ||
      Reflect.hasMetadata("requirePermission", proto[method]);
    const isPublic = Reflect.hasMetadata("isPublic", proto[method]);
    assert.ok(
      hasPermission || isPublic,
      `Method EvidenceController.${method} missing @RequirePermission or @Public decorator`,
    );
  }
});

