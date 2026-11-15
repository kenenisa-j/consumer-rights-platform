import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { SlaService } from './sla.service';
import { QuerySlaDto } from './dto/query-sla.dto';

@Controller('government/sla')
export class GovernmentSlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('overview')
  @RequirePermission('complaints:read:all')
  async getOverview(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    return this.slaService.getGovernmentSlaOverview(actorUserId);
  }

  @Get('overdue')
  @RequirePermission('complaints:read:all')
  async getOverdue(@Req() req: Request, @Query() query: QuerySlaDto) {
    const actorUserId = (req as any).user.id;
    return this.slaService.getGovernmentOverdueCases(actorUserId, query);
  }

  @Get('approaching')
  @RequirePermission('complaints:read:all')
  async getApproaching(@Req() req: Request, @Query() query: QuerySlaDto) {
    const actorUserId = (req as any).user.id;
    return this.slaService.getGovernmentApproachingCases(actorUserId, query);
  }

  @Get('cases/:reference')
  @RequirePermission('complaints:read:all')
  async getCaseDetails(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    return this.slaService.getCaseSlaDetails(actorUserId, reference);
  }
}

@Controller('business/sla')
export class BusinessSlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('overview')
  @RequirePermission('complaints.business:read')
  async getOverview(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.slaService.getBusinessSlaOverview(userId);
  }

  @Get('overdue')
  @RequirePermission('complaints.business:read')
  async getOverdue(@Req() req: Request, @Query() query: QuerySlaDto) {
    const userId = (req as any).user.id;
    return this.slaService.getBusinessOverdueCases(userId, query);
  }
}

