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
import { GovernmentDecisionsService } from './government-decisions.service';
import { IssueDecisionDto } from './dto/issue-decision.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';
import { VerifyComplianceDto } from './dto/verify-compliance.dto';
import { CloseCaseDto } from './dto/close-case.dto';
import { ReopenCaseDto } from './dto/reopen-case.dto';

@Controller('government/cases')
export class GovernmentDecisionsController {
  constructor(private readonly decisionsService: GovernmentDecisionsService) {}

  @Get(':reference/decision')
  @RequirePermission('decisions:read')
  async getDecision(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const decision = await this.decisionsService.getCaseDecision(actorUserId, reference, 'GOVERNMENT');
    return { decision };
  }

  @Post(':reference/decision')
  @RequirePermission('decisions:create')
  async issueDecision(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: IssueDecisionDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.decisionsService.issueDecision(actorUserId, reference, dto);
  }

  @Patch(':reference/resolution')
  @RequirePermission('decisions:create')
  async updateResolution(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: UpdateResolutionDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.decisionsService.updateResolution(actorUserId, reference, dto);
  }

  @Post(':reference/verify-compliance')
  @RequirePermission('decisions:create')
  async verifyCompliance(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: VerifyComplianceDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.decisionsService.verifyCompliance(actorUserId, reference, dto);
  }

  @Post(':reference/close')
  @RequirePermission('cases:close')
  async closeCase(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: CloseCaseDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.decisionsService.closeCase(actorUserId, reference, dto);
  }

  @Post(':reference/reopen')
  @RequirePermission('cases:reopen')
  async reopenCase(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: ReopenCaseDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.decisionsService.reopenCase(actorUserId, reference, dto);
  }
}

