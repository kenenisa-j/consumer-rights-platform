import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { RedirectService } from './redirect.service';

type Authed = Request & { user: { id: string } };

/** An office sends a complaint it holds to another office (down, up or across). The rules are in RedirectService. */
@Controller('office')
export class RedirectController {
  constructor(private readonly redirects: RedirectService) {}

  @Get('redirect-options')
  @RequirePermission('cases.redirect.office')
  options(@Req() req: Authed) { return this.redirects.options(req.user.id); }

  @Post('cases/:reference/redirect')
  @RequirePermission('cases.redirect.office')
  redirect(@Req() req: Authed, @Param('reference') reference: string, @Body() body: Record<string, unknown>) {
    return this.redirects.redirect(req.user.id, reference, body ?? {});
  }
}
