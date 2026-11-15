import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('UPLOAD_DIRECTORY');
    this.uploadDir = configured && configured.trim()
      ? path.resolve(configured.trim())
      : path.resolve(process.cwd(), '.runtime', 'uploads');
  }

  getUploadDirectory(): string {
    return this.uploadDir;
  }

  detectMimeType(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // PDF: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }

    // WEBP: RIFF....WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // DOCX (ZIP archive with PK..)
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06)
    ) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Text check: printable ASCII / UTF-8 without NUL bytes
    let isText = true;
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      const byte = buffer[i];
      if (byte === 0) {
        isText = false;
        break;
      }
    }
    if (isText) return 'text/plain';

    return null;
  }

  validateFile(buffer: Buffer, clientMimeType?: string): string {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds the 10MB limit (size: ${buffer.length} bytes).`,
      });
    }

    const detected = this.detectMimeType(buffer);
    const finalType = detected || clientMimeType;

    if (!finalType || !ALLOWED_MIME_TYPES.has(finalType)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `File type '${finalType || 'unknown'}' is not supported. Allowed: JPEG, PNG, WEBP, PDF, DOCX, TXT.`,
      });
    }

    return finalType;
  }

  generateSafeStoragePath(caseId: string, originalFileName: string): { relativePath: string; fileName: string } {
    const rawExt = path.extname(originalFileName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const ext = rawExt.length > 0 ? rawExt : '.bin';
    const safeDiskName = `${randomUUID()}${ext}`;
    const relativePath = path.posix.join('cases', caseId, safeDiskName);
    const cleanOriginalName = path.basename(originalFileName || `evidence-${safeDiskName}`).replace(/[^\w.\-\s]/g, '_');

    return { relativePath, fileName: cleanOriginalName };
  }

  async saveFile(relativePath: string, buffer: Buffer): Promise<void> {
    const fullPath = path.resolve(this.uploadDir, relativePath);
    if (!fullPath.startsWith(path.resolve(this.uploadDir))) {
      throw new BadRequestException({ code: 'INVALID_PATH', message: 'Path traversal attempt detected.' });
    }

    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async getFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.resolve(this.uploadDir, relativePath);
    if (!fullPath.startsWith(path.resolve(this.uploadDir))) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found.' });
    }

    try {
      await stat(fullPath);
      return await readFile(fullPath);
    } catch {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found on storage.' });
    }
  }
}

