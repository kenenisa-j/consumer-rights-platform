import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { TrackTipDto } from './dto/track-tip.dto';
import { Public } from '../../lib/common/decorators/public.decorator';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

// Rate-limiting brake on tips from one IP: memory-only, one-way hash, expires after 1 hour.
const hits = new Map<string, number[]>();
function brake(ip: string) {
  const key = createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 12) {
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Too many tips from this connection. Try again later.' },
      429,
    );
  }
  hits.set(key, [...recent, now]);
  if (hits.size > 5000) hits.clear();
}

@Controller()
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  /** Public: Submit an anonymous tip without an account. Generates token and stores only hash. */
  @Public()
  @Post('tips')
  async send(@Req() req: Request, @Body() dto: CreateTipDto) {
    brake(req.ip ?? 'unknown');
    return this.tipsService.submitTip(dto);
  }

  /** Public: Track an anonymous tip by reference and code (coworker's frontend contract). */
  @Public()
  @Get('track/tip')
  async track(@Query('reference') reference = '', @Query('code') code = '') {
    try {
      const res = await this.tipsService.trackTip({ reference, code });
      return {
        found: true as const,
        reference: res.reference,
        status: res.status,
        label: res.label,
        receivedAt: res.receivedAt,
      };
    } catch {
      return { found: false as const };
    }
  }

  /** Tips sent to the officer's office (and subordinate offices). Scoped via officeScopeOf. */
  @Get('office/tips')
  @RequirePermission('tips.read.office')
  async officeTips(@Req() req: Request) {
    const actorUserId = (req as any).user?.id || (req as any).user;
    return this.tipsService.listOfficeTips(actorUserId);
  }

  /** Public: Track an anonymous tip via POST payload. */
  @Public()
  @Post('tips/track')
  async trackTipPost(@Body() dto: TrackTipDto) {
    return this.tipsService.trackTip(dto);
  }

  /** Public: Track an anonymous tip via query params. */
  @Public()
  @Get('tips/track')
  async trackTipQuery(@Query() dto: TrackTipDto) {
    return this.tipsService.trackTip(dto);
  }
}
