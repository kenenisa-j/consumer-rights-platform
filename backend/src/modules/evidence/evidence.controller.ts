import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { EvidenceService } from './evidence.service';

type Authed = Request & { user: { id: string } };

/** The raw file is the request body (see main.ts); the name and the "show to the business" choice travel in the query. */
@Controller()
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('complaints/:reference/evidence')
  @RequirePermission('evidence.upload.own')
  upload(@Req() req: Authed, @Param('reference') reference: string, @Query('name') name = 'file', @Query('shared') shared = '0') {
    return this.evidence.upload(req.user.id, reference, String(name), shared === '1', req.body);
  }

  @Get('evidence/:id')
  @RequirePermission('evidence.read')
  async download(@Req() req: Authed, @Param('id') id: string, @Res() res: Response) {
    const f = await this.evidence.download(req.user.id, id);
    res.setHeader('Content-Type', f.type);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(f.bytes);
  }
}
