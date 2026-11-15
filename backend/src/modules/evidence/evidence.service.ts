import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../lib/database/prisma.service';
import { officeScopeOf } from '../../lib/common/office-scope';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_CASE = 8;

/** What a file really is, from its first bytes, not from the name or the type the browser claims. */
function sniff(b: Buffer): { type: 'image/jpeg' | 'image/png' | 'application/pdf'; ext: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png', ext: 'png' };
  if (b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return { type: 'application/pdf', ext: 'pdf' };
  return null;
}

const safeName = (n: string) => n.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').trim().slice(0, 120) || 'file';

/** Evidence files of a complaint: receipts, photos, PDFs. Stored on disk outside the web folder; the database keeps the record. */
@Injectable()
export class EvidenceService {
  private readonly root = resolve(process.env.UPLOAD_DIRECTORY || join(process.cwd(), '.runtime', 'uploads'));

  constructor(private readonly prisma: PrismaService) {}

  /** Only the person who made the complaint adds files to it. `shared` lets the business see the file; otherwise only officers do. */
  async upload(userId: string, reference: string, name: string, shared: boolean, body: unknown) {
    const bytes = Buffer.isBuffer(body) ? body : null;
    if (!bytes || bytes.length === 0) throw new BadRequestException({ code: 'VALIDATION', message: 'The file is empty.' });
    if (bytes.length > MAX_FILE_BYTES) throw new BadRequestException({ code: 'TOO_LARGE', message: 'A file can be up to 10 MB.' });
    const kind = sniff(bytes);
    if (!kind) throw new BadRequestException({ code: 'BAD_TYPE', message: 'Only JPG, PNG and PDF files are accepted.' });
    const c = await this.prisma.case.findFirst({ where: { referenceNumber: reference.toUpperCase(), complainantId: userId }, select: { id: true } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'We could not find that complaint in your account.' });
    const count = await this.prisma.evidenceFile.count({ where: { caseId: c.id } });
    if (count >= MAX_FILES_PER_CASE) throw new BadRequestException({ code: 'TOO_MANY', message: `A complaint can have up to ${MAX_FILES_PER_CASE} files.` });

    const id = randomUUID();
    const dir = join(this.root, c.id);
    await mkdir(dir, { recursive: true });
    const storagePath = join(c.id, `${id}.${kind.ext}`);
    await writeFile(join(this.root, storagePath), bytes, { flag: 'wx' });
    const base = safeName(name).replace(/\.[A-Za-z0-9]+$/, '');
    const row = await this.prisma.evidenceFile.create({
      data: { id, caseId: c.id, uploaderUserId: userId, fileName: `${base}.${kind.ext}`, fileType: kind.type, fileSizeBytes: bytes.length, storagePath, isOfficerOnly: !shared },
      select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, isOfficerOnly: true },
    });
    return { id: row.id, name: row.fileName, type: row.fileType, size: row.fileSizeBytes, shared: !row.isOfficerOnly };
  }

  /** Same rule as the case pages: the owner, the office holding the case (and the offices above), and the business only for shared files. */
  async download(userId: string, id: string) {
    const f = await this.prisma.evidenceFile.findUnique({
      where: { id },
      select: { fileName: true, fileType: true, storagePath: true, isOfficerOnly: true, case: { select: { complainantId: true, merchantId: true, currentOfficeId: true } } },
    });
    if (!f) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No such file.' });
    let allowed = f.case.complainantId === userId;
    if (!allowed) {
      const deployed = await this.prisma.userOffice.findFirst({ where: { userId, isActive: true }, select: { id: true } });
      if (deployed) allowed = !!f.case.currentOfficeId && (await officeScopeOf(this.prisma, userId)).officeIds.includes(f.case.currentOfficeId);
      else if (!f.isOfficerOnly && f.case.merchantId) {
        allowed = !!(await this.prisma.merchantUser.findFirst({ where: { userId, merchantId: f.case.merchantId }, select: { id: true } }));
      }
    }
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You cannot open this file.' });
    const path = resolve(this.root, f.storagePath);
    if (!path.startsWith(this.root)) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No such file.' });
    return { bytes: await readFile(path).catch(() => { throw new NotFoundException({ code: 'NOT_FOUND', message: 'The file is no longer available.' }); }), type: f.fileType, name: f.fileName };
  }
}
