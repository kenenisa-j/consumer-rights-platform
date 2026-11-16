import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TipsService } from './tips.service';
import { PlanVisitDto } from './dto/plan-visit.dto';
import { ForwardTipDto } from './dto/forward-tip.dto';
import { ConvertTipDto } from './dto/convert-tip.dto';
import { CloseTipDto } from './dto/close-tip.dto';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

@Controller('government/tips')
export class GovernmentTipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Get()
  @RequirePermission('complaints:read:all')
  async listTips(@Req() req: Request, @Query() query: any) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.listGovernmentTips(actorUserId, query);
  }

  @Get(':reference')
  @RequirePermission('complaints:read:all')
  async getTip(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.getGovernmentTip(actorUserId, reference);
  }

  @Post(':reference/visit')
  @RequirePermission('inspections:create')
  async planVisit(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: PlanVisitDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.planVisit(actorUserId, reference, dto);
  }

  @Post(':reference/forward')
  @RequirePermission('transfers:initiate')
  async forwardTip(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: ForwardTipDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.forwardTip(actorUserId, reference, dto);
  }

  @Post(':reference/convert-to-case')
  @RequirePermission('complaints:triage')
  async convertToCase(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: ConvertTipDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.convertToCase(actorUserId, reference, dto);
  }

  @Post(':reference/close')
  @RequirePermission('cases:close')
  async closeTip(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: CloseTipDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.tipsService.closeTip(actorUserId, reference, dto);
  }
}

