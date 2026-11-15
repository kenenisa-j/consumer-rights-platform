import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';
import { QueryReportsDto } from './dto/query-reports.dto';

@Controller('government/reports')
export class GovernmentReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermission('complaints:read:all')
  async getOverview(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentOverview(actorUserId, query);
  }

  @Get('cases-by-status')
  @RequirePermission('complaints:read:all')
  async getCasesByStatus(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentCasesByStatus(actorUserId, query);
  }

  @Get('cases-by-category')
  @RequirePermission('complaints:read:all')
  async getCasesByCategory(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentCasesByCategory(actorUserId, query);
  }

  @Get('cases-over-time')
  @RequirePermission('complaints:read:all')
  async getCasesOverTime(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentCasesOverTime(actorUserId, query);
  }

  @Get('resolution-performance')
  @RequirePermission('complaints:read:all')
  async getResolutionPerformance(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentResolutionPerformance(actorUserId, query);
  }

  @Get('office-workload')
  @RequirePermission('complaints:read:all')
  async getOfficeWorkload(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentOfficeWorkload(actorUserId, query);
  }

  @Get('transfer-statistics')
  @RequirePermission('transfers:read', 'complaints:read:all')
  async getTransferStatistics(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentTransferStatistics(actorUserId, query);
  }

  @Get('sla-performance')
  @RequirePermission('complaints:read:all')
  async getSlaPerformance(@Req() req: Request, @Query() query: QueryReportsDto) {
    const actorUserId = (req as any).user.id;
    return this.reportsService.getGovernmentSlaPerformance(actorUserId, query);
  }
}

@Controller('business/reports')
export class BusinessReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermission('complaints.business:read')
  async getOverview(@Req() req: Request, @Query() query: QueryReportsDto) {
    const userId = (req as any).user.id;
    return this.reportsService.getBusinessOverview(userId, query);
  }

  @Get('cases-by-status')
  @RequirePermission('complaints.business:read')
  async getCasesByStatus(@Req() req: Request, @Query() query: QueryReportsDto) {
    const userId = (req as any).user.id;
    return this.reportsService.getBusinessCasesByStatus(userId, query);
  }

  @Get('cases-over-time')
  @RequirePermission('complaints.business:read')
  async getCasesOverTime(@Req() req: Request, @Query() query: QueryReportsDto) {
    const userId = (req as any).user.id;
    return this.reportsService.getBusinessCasesOverTime(userId, query);
  }

  @Get('response-performance')
  @RequirePermission('complaints.business:read')
  async getResponsePerformance(@Req() req: Request, @Query() query: QueryReportsDto) {
    const userId = (req as any).user.id;
    return this.reportsService.getBusinessResponsePerformance(userId, query);
  }

  @Get('resolution-outcomes')
  @RequirePermission('complaints.business:read')
  async getResolutionOutcomes(@Req() req: Request, @Query() query: QueryReportsDto) {
    const userId = (req as any).user.id;
    return this.reportsService.getBusinessResolutionOutcomes(userId, query);
  }
}

