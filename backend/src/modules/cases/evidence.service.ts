import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { StorageService } from '../../lib/storage/storage.service';
import {
  resolveOfficerContext,
  assertOfficerJurisdiction,
} from './government-cases.helpers';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';

export interface FilePayload {
  originalname?: string;
  mimetype?: string;
  buffer: Buffer;
  size?: number;
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private extractBuffer(filePayload?: FilePayload, dto?: UploadEvidenceDto): { buffer: Buffer; fileName: string; clientMime?: string } {
    if (filePayload && filePayload.buffer) {
      return {
        buffer: filePayload.buffer,
        fileName: filePayload.originalname || dto?.fileName || 'upload.bin',
        clientMime: filePayload.mimetype || dto?.fileType,
      };
    }

    if (dto?.contentBase64) {
      const buffer = Buffer.from(dto.contentBase64, 'base64');
      return {
        buffer,
        fileName: dto.fileName || 'upload.bin',
        clientMime: dto.fileType,
      };
    }

    throw new BadRequestException({
      code: 'MISSING_FILE_PAYLOAD',
      message: 'No file buffer or base64 content was provided for upload.',
    });
  }

  async uploadConsumerEvidence(
    actorUserId: string,
    reference: string,
    filePayload?: FilePayload,
    dto?: UploadEvidenceDto,
  ) {
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });
    if (!c || c.complainantId !== actorUserId) {
      throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    }

    const { buffer, fileName, clientMime } = this.extractBuffer(filePayload, dto);
    const validatedMime = this.storage.validateFile(buffer, clientMime);
    const { relativePath, fileName: cleanFileName } = this.storage.generateSafeStoragePath(c.id, fileName);

    await this.storage.saveFile(relativePath, buffer);

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidenceFile.create({
        data: {
          caseId: c.id,
          uploaderUserId: actorUserId,
          fileName: cleanFileName,
          fileType: validatedMime,
          fileSizeBytes: buffer.length,
          storagePath: relativePath,
          isSanitizedCopy: false,
          isOfficerOnly: false,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Consumer uploaded evidence file: ${cleanFileName}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'EVIDENCE_UPLOADED_CONSUMER',
          fieldName: 'evidenceId',
          newValue: evidence.id,
        },
      });

      return {
        id: evidence.id,
        caseReference: c.referenceNumber,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSizeBytes: evidence.fileSizeBytes,
        isOfficerOnly: evidence.isOfficerOnly,
        createdAt: evidence.createdAt.toISOString(),
      };
    });
  }

  async uploadBusinessEvidence(
    actorUserId: string,
    reference: string,
    filePayload?: FilePayload,
    dto?: UploadEvidenceDto,
  ) {
    const mu = await this.prisma.merchantUser.findFirst({
      where: { userId: actorUserId },
      include: { merchant: true },
    });
    if (!mu || !mu.merchant || !mu.merchant.isActive) {
      throw new ForbiddenException({
        code: 'NOT_AUTHORIZED_MERCHANT',
        message: 'Authenticated user is not linked to an active merchant.',
      });
    }

    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });
    if (!c || c.merchantId !== mu.merchantId) {
      throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found for your business.' });
    }

    const { buffer, fileName, clientMime } = this.extractBuffer(filePayload, dto);
    const validatedMime = this.storage.validateFile(buffer, clientMime);
    const { relativePath, fileName: cleanFileName } = this.storage.generateSafeStoragePath(c.id, fileName);

    await this.storage.saveFile(relativePath, buffer);

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidenceFile.create({
        data: {
          caseId: c.id,
          uploaderUserId: actorUserId,
          fileName: cleanFileName,
          fileType: validatedMime,
          fileSizeBytes: buffer.length,
          storagePath: relativePath,
          isSanitizedCopy: false,
          isOfficerOnly: false,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Business uploaded evidence file: ${cleanFileName}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'EVIDENCE_UPLOADED_BUSINESS',
          fieldName: 'evidenceId',
          newValue: evidence.id,
        },
      });

      return {
        id: evidence.id,
        caseReference: c.referenceNumber,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSizeBytes: evidence.fileSizeBytes,
        isOfficerOnly: evidence.isOfficerOnly,
        createdAt: evidence.createdAt.toISOString(),
      };
    });
  }

  async uploadGovernmentEvidence(
    actorUserId: string,
    reference: string,
    filePayload?: FilePayload,
    dto?: UploadEvidenceDto,
    inspectionId?: string,
  ) {
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: { currentOffice: true },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    assertOfficerJurisdiction(actor, c.currentOffice);

    if (inspectionId) {
      const insp = await this.prisma.inspection.findUnique({ where: { id: inspectionId } });
      if (!insp || insp.caseId !== c.id) {
        throw new NotFoundException({ code: 'INSPECTION_NOT_FOUND', message: 'Inspection not found for this case.' });
      }
    }

    const { buffer, fileName, clientMime } = this.extractBuffer(filePayload, dto);
    const validatedMime = this.storage.validateFile(buffer, clientMime);
    const { relativePath, fileName: cleanFileName } = this.storage.generateSafeStoragePath(c.id, fileName);

    await this.storage.saveFile(relativePath, buffer);

    const isOfficerOnly = dto?.isOfficerOnly !== undefined ? dto.isOfficerOnly : true;

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidenceFile.create({
        data: {
          caseId: c.id,
          uploaderUserId: actorUserId,
          fileName: cleanFileName,
          fileType: validatedMime,
          fileSizeBytes: buffer.length,
          storagePath: relativePath,
          isSanitizedCopy: false,
          isOfficerOnly,
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: c.id,
          fromStatus: c.status,
          toStatus: c.status,
          handlingLevel: c.currentOffice?.level.toLowerCase() || 'woreda',
          officeId: c.currentOfficeId,
          actorUserId,
          publicNote: `Officer uploaded evidence file: ${cleanFileName}${isOfficerOnly ? ' [Officer Only]' : ''}`,
        },
      });

      await tx.caseAuditLog.create({
        data: {
          caseId: c.id,
          actorId: actorUserId,
          actionCode: 'EVIDENCE_UPLOADED_GOVERNMENT',
          fieldName: inspectionId ? 'inspectionEvidenceId' : 'evidenceId',
          newValue: evidence.id,
        },
      });

      return {
        id: evidence.id,
        caseReference: c.referenceNumber,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSizeBytes: evidence.fileSizeBytes,
        isOfficerOnly: evidence.isOfficerOnly,
        createdAt: evidence.createdAt.toISOString(),
      };
    });
  }

  async listEvidence(actorUserId: string, reference: string, party: 'CONSUMER' | 'BUSINESS' | 'GOVERNMENT') {
    const c = await this.prisma.case.findUnique({
      where: { referenceNumber: reference },
      include: {
        currentOffice: true,
        evidenceFiles: {
          orderBy: { createdAt: 'desc' },
          include: { uploader: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });

    if (party === 'CONSUMER') {
      if (c.complainantId !== actorUserId) {
        throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
      }
      return c.evidenceFiles
        .filter((e) => !e.isOfficerOnly)
        .map((e) => ({
          id: e.id,
          fileName: e.fileName,
          fileType: e.fileType,
          fileSizeBytes: e.fileSizeBytes,
          isOfficerOnly: e.isOfficerOnly,
          uploader: e.uploader.fullName,
          createdAt: new Date(e.createdAt).toISOString(),
        }));
    }

    if (party === 'BUSINESS') {
      const mu = await this.prisma.merchantUser.findFirst({
        where: { userId: actorUserId },
        include: { merchant: true },
      });
      if (!mu || !mu.merchant || c.merchantId !== mu.merchantId) {
        throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
      }
      return c.evidenceFiles
        .filter((e) => !e.isOfficerOnly)
        .map((e) => ({
          id: e.id,
          fileName: e.fileName,
          fileType: e.fileType,
          fileSizeBytes: e.fileSizeBytes,
          isOfficerOnly: e.isOfficerOnly,
          uploader: e.uploader.fullName,
          createdAt: new Date(e.createdAt).toISOString(),
        }));
    }

    // GOVERNMENT
    const actor = await resolveOfficerContext(this.prisma, actorUserId);
    assertOfficerJurisdiction(actor, c.currentOffice);

    return c.evidenceFiles.map((e) => ({
      id: e.id,
      fileName: e.fileName,
      fileType: e.fileType,
      fileSizeBytes: e.fileSizeBytes,
      isOfficerOnly: e.isOfficerOnly,
      uploader: e.uploader.fullName,
      createdAt: new Date(e.createdAt).toISOString(),
    }));
  }

  async downloadEvidence(actorUserId: string, evidenceId: string) {
    const evidence = await this.prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
      include: {
        case: { include: { currentOffice: true } },
        uploader: { select: { id: true, fullName: true } },
      },
    });
    if (!evidence) {
      throw new NotFoundException({ code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' });
    }

    const c = evidence.case;
    let isAuthorized = false;

    // Check Consumer ownership
    if (c.complainantId === actorUserId) {
      if (!evidence.isOfficerOnly) isAuthorized = true;
    }

    // Check Business membership
    if (!isAuthorized && c.merchantId) {
      const mu = await this.prisma.merchantUser.findFirst({
        where: { userId: actorUserId, merchantId: c.merchantId },
      });
      if (mu && !evidence.isOfficerOnly) isAuthorized = true;
    }

    // Check Government jurisdiction
    if (!isAuthorized) {
      try {
        const actor = await resolveOfficerContext(this.prisma, actorUserId);
        assertOfficerJurisdiction(actor, c.currentOffice);
        isAuthorized = true;
      } catch {
        // Not authorized government officer
      }
    }

    if (!isAuthorized) {
      throw new NotFoundException({ code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' });
    }

    const buffer = await this.storage.getFile(evidence.storagePath);

    return {
      buffer,
      fileName: evidence.fileName,
      fileType: evidence.fileType,
      fileSizeBytes: evidence.fileSizeBytes,
    };
  }
}

