import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { GovernmentInvestigationsService } from './government-investigations.service';
import { StartInvestigationDto } from './dto/start-investigation.dto';
import { ScheduleInspectionDto } from './dto/schedule-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { SubmitInvestigationDto } from './dto/submit-investigation.dto';

@Controller('government')
export class GovernmentInvestigationsController {
  constructor(private readonly investigationsService: GovernmentInvestigationsService) {}

  @Get('cases/:reference/investigation')
  @RequirePermission('inspections:read')
  async getInvestigationDetails(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const investigation = await this.investigationsService.getInvestigationDetails(actorUserId, reference);
    return { investigation };
  }

  @Post('cases/:reference/investigation/start')
  @RequirePermission('inspections:create')
  async startInvestigation(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: StartInvestigationDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.investigationsService.startInvestigation(actorUserId, reference, dto);
  }

  @Post('cases/:reference/investigation/submit')
  @RequirePermission('inspections:manage')
  async submitInvestigation(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: SubmitInvestigationDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.investigationsService.submitInvestigation(actorUserId, reference, dto);
  }

  @Post('cases/:reference/inspections')
  @RequirePermission('inspections:create')
  async scheduleInspection(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: ScheduleInspectionDto,
  ) {
    const actorUserId = (req as any).user.id;
    const inspection = await this.investigationsService.scheduleInspection(actorUserId, reference, dto);
    return { inspection };
  }

  @Get('inspections/:inspectionId')
  @RequirePermission('inspections:read')
  async getInspection(@Req() req: Request, @Param('inspectionId') inspectionId: string) {
    const actorUserId = (req as any).user.id;
    const inspection = await this.investigationsService.getInspection(actorUserId, inspectionId);
    return { inspection };
  }

  @Patch('inspections/:inspectionId')
  @RequirePermission('inspections:manage')
  async updateInspection(
    @Req() req: Request,
    @Param('inspectionId') inspectionId: string,
    @Body() dto: UpdateInspectionDto,
  ) {
    const actorUserId = (req as any).user.id;
    const inspection = await this.investigationsService.updateInspection(actorUserId, inspectionId, dto);
    return { inspection };
  }

  @Post('inspections/:inspectionId/findings')
  @RequirePermission('inspections:manage')
  async recordFinding(
    @Req() req: Request,
    @Param('inspectionId') inspectionId: string,
    @Body() dto: CreateFindingDto,
  ) {
    const actorUserId = (req as any).user.id;
    const finding = await this.investigationsService.recordFinding(actorUserId, inspectionId, dto);
    return { finding };
  }
}

