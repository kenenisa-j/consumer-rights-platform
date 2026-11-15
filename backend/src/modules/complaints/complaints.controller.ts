import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../lib/common/decorators/public.decorator';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { ComplaintsService } from './complaints.service';

type Authed = Request & { user: { id: string } };

/** A consumer's own complaints, and the public status check. */
@Controller()
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post('complaints')
  @RequirePermission('complaints.create.own')
  create(@Req() req: Authed, @Body() body: Record<string, unknown>) {
    return this.complaints.create(req.user.id, body ?? {});
  }

  @Get('complaints')
  @RequirePermission('complaints.read.own')
  mine(@Req() req: Authed) {
    return this.complaints.listMine(req.user.id);
  }

  @Get('complaints/:reference')
  @RequirePermission('complaints.read.own')
  one(@Req() req: Authed, @Param('reference') reference: string) {
    return this.complaints.getMine(req.user.id, reference);
  }

  @Public()
  @Get('track/complaint')
  track(@Query('reference') reference = '', @Query('phone4') phone4 = '') {
    return this.complaints.track(String(reference).slice(0, 20), String(phone4).slice(0, 4));
  }
}
