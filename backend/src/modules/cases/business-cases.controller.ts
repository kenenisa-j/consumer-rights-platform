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
import { BusinessCasesService } from './business-cases.service';
import { GovernmentInvestigationsService } from './government-investigations.service';
import { GovernmentDecisionsService } from './government-decisions.service';
import { QueryBusinessCasesDto } from './dto/query-business-cases.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { BusinessOfferDto } from './dto/business-offer.dto';
import { BusinessInvestigationResponseDto } from './dto/business-investigation-response.dto';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

@Controller('business/cases')
export class BusinessCasesController {
  constructor(
    private readonly businessCasesService: BusinessCasesService,
    private readonly investigationsService: GovernmentInvestigationsService,
    private readonly decisionsService: GovernmentDecisionsService,
  ) {}

  @Get()
  @RequirePermission('complaints.business:read')
  async listCases(@Req() req: Request, @Query() query: QueryBusinessCasesDto) {
    const userId = (req as any).user.id;
    const cases = await this.businessCasesService.listBusinessComplaints(userId, query);
    return { cases };
  }

  @Get(':reference')
  @RequirePermission('complaints.business:read')
  async getCase(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const complaint = await this.businessCasesService.getBusinessComplaint(userId, reference);
    return { complaint };
  }

  @Get(':reference/decision')
  @RequirePermission('complaints.business:read')
  async getDecision(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const decision = await this.decisionsService.getCaseDecision(userId, reference, 'BUSINESS');
    return { decision };
  }

  @Post(':reference/respond')
  @RequirePermission('complaints.business:respond')
  async respondToCase(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: BusinessResponseDto,
  ) {
    const userId = (req as any).user.id;
    return this.businessCasesService.submitBusinessResponse(userId, reference, dto);
  }

  @Post(':reference/offer')
  @RequirePermission('complaints.business:respond')
  async makeSettlementOffer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: BusinessOfferDto,
  ) {
    const userId = (req as any).user.id;
    return this.businessCasesService.submitSettlementOffer(userId, reference, dto);
  }

  @Post(':reference/investigation-response')
  @RequirePermission('complaints.business:respond')
  async respondToInvestigation(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: BusinessInvestigationResponseDto,
  ) {
    const userId = (req as any).user.id;
    return this.investigationsService.submitBusinessInvestigationResponse(userId, reference, dto);
  }
}
