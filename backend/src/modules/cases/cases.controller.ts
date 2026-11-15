import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { CasesService } from './cases.service';
import { ConsumerCasesService } from './consumer-cases.service';
import { GovernmentDecisionsService } from './government-decisions.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { ConsumerMessageDto } from './dto/consumer-message.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { EscalateCaseDto } from './dto/escalate-case.dto';

/**
 * Consumer-facing cases API.
 * Every endpoint requires authentication; the user ID comes from the verified session.
 */
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly consumerCasesService: ConsumerCasesService,
    private readonly decisionsService: GovernmentDecisionsService,
  ) {}

  @Get()
  @RequirePermission('complaints:read:own')
  async listMyCases(@Req() req: Request) {
    const userId = (req as any).user.id;
    const cases = await this.casesService.listByConsumer(userId);
    return { cases };
  }

  @Get('profile')
  @RequirePermission('complaints:read:own')
  async getProfile(@Req() req: Request) {
    const userId = (req as any).user.id;
    const profile = await this.casesService.getProfile(userId);
    return { profile };
  }

  @Post()
  @RequirePermission('complaints:create:own')
  async createCase(@Req() req: Request, @Body() dto: CreateCaseDto) {
    const userId = (req as any).user.id;
    const created = await this.casesService.createCase(userId, dto);
    return { case: created };
  }

  @Get(':reference')
  @RequirePermission('complaints:read:own')
  async getCase(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const c = await this.consumerCasesService.getByReference(userId, reference);
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    return { case: c };
  }

  @Get(':reference/decision')
  @RequirePermission('complaints:read:own')
  async getDecision(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const decision = await this.decisionsService.getCaseDecision(userId, reference, 'CONSUMER');
    return { decision };
  }

  @Post(':reference/messages')
  @RequirePermission('complaints:create:own')
  async sendMessage(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: ConsumerMessageDto,
  ) {
    const userId = (req as any).user.id;
    return this.consumerCasesService.sendMessage(userId, reference, dto);
  }

  @Post(':reference/offers/:offerId/accept')
  @RequirePermission('complaints:read:own')
  async acceptOffer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Param('offerId') offerId: string,
  ) {
    const userId = (req as any).user.id;
    return this.consumerCasesService.acceptOffer(userId, reference, offerId);
  }

  @Post(':reference/offers/:offerId/reject')
  @RequirePermission('complaints:read:own')
  async rejectOffer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Param('offerId') offerId: string,
    @Body() dto: RejectOfferDto,
  ) {
    const userId = (req as any).user.id;
    return this.consumerCasesService.rejectOffer(userId, reference, offerId, dto);
  }

  @Post(':reference/escalate')
  @RequirePermission('complaints:create:own')
  async escalateToGovernment(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: EscalateCaseDto,
  ) {
    const userId = (req as any).user.id;
    return this.consumerCasesService.escalateToGovernment(userId, reference, dto);
  }
}
