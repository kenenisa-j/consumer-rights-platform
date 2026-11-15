import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { EvidenceService } from './evidence.service';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';

@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('cases/:reference/evidence')
  @RequirePermission('complaints:create:own')
  async uploadConsumerEvidence(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: UploadEvidenceDto,
  ) {
    const actorUserId = (req as any).user.id;
    const filePayload = (req as any).file;
    const evidence = await this.evidenceService.uploadConsumerEvidence(actorUserId, reference, filePayload, dto);
    return { evidence };
  }

  @Get('cases/:reference/evidence')
  @RequirePermission('complaints:read:own')
  async listConsumerEvidence(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const evidence = await this.evidenceService.listEvidence(actorUserId, reference, 'CONSUMER');
    return { evidence };
  }

  @Post('business/cases/:reference/evidence')
  @RequirePermission('complaints.business:respond')
  async uploadBusinessEvidence(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: UploadEvidenceDto,
  ) {
    const actorUserId = (req as any).user.id;
    const filePayload = (req as any).file;
    const evidence = await this.evidenceService.uploadBusinessEvidence(actorUserId, reference, filePayload, dto);
    return { evidence };
  }

  @Get('business/cases/:reference/evidence')
  @RequirePermission('complaints.business:read')
  async listBusinessEvidence(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const evidence = await this.evidenceService.listEvidence(actorUserId, reference, 'BUSINESS');
    return { evidence };
  }

  @Post('government/cases/:reference/evidence')
  @RequirePermission('inspections:manage')
  async uploadGovernmentEvidence(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: UploadEvidenceDto,
  ) {
    const actorUserId = (req as any).user.id;
    const filePayload = (req as any).file;
    const evidence = await this.evidenceService.uploadGovernmentEvidence(actorUserId, reference, filePayload, dto);
    return { evidence };
  }

  @Post('government/inspections/:inspectionId/evidence')
  @RequirePermission('inspections:manage')
  async uploadInspectionEvidence(
    @Req() req: Request,
    @Param('inspectionId') inspectionId: string,
    @Query('reference') reference: string,
    @Body() dto: UploadEvidenceDto,
  ) {
    const actorUserId = (req as any).user.id;
    const filePayload = (req as any).file;
    const evidence = await this.evidenceService.uploadGovernmentEvidence(actorUserId, reference, filePayload, dto, inspectionId);
    return { evidence };
  }

  @Get('government/cases/:reference/evidence')
  @RequirePermission('complaints:read:all')
  async listGovernmentEvidence(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const evidence = await this.evidenceService.listEvidence(actorUserId, reference, 'GOVERNMENT');
    return { evidence };
  }

  @Get('cases/evidence/:evidenceId/download')
  @RequirePermission('profile.read.own')
  async downloadEvidence(
    @Req() req: Request,
    @Res() res: Response,
    @Param('evidenceId') evidenceId: string,
  ) {
    const actorUserId = (req as any).user.id;
    const file = await this.evidenceService.downloadEvidence(actorUserId, evidenceId);

    res.set({
      'Content-Type': file.fileType,
      'Content-Disposition': `attachment; filename="${file.fileName.replace(/"/g, '_')}"`,
      'Content-Length': String(file.fileSizeBytes),
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(file.buffer);
  }
}

