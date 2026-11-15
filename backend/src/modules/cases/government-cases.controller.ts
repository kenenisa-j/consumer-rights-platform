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
import { GovernmentCasesService } from './government-cases.service';
import { QueryGovernmentCasesDto } from './dto/query-government-cases.dto';
import { AcceptTransferDto } from './dto/accept-transfer.dto';
import { TriageCaseDto } from './dto/triage-case.dto';
import { AssignOfficerDto } from './dto/assign-officer.dto';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

@Controller('government')
export class GovernmentCasesController {
  constructor(private readonly governmentCasesService: GovernmentCasesService) {}

  @Get('cases')
  @RequirePermission('complaints:read:all')
  async listCases(@Req() req: Request, @Query() query: QueryGovernmentCasesDto) {
    const actorUserId = (req as any).user.id;
    return this.governmentCasesService.listCases(actorUserId, query);
  }

  @Get('cases/:reference')
  @RequirePermission('complaints:read:all')
  async getCase(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const complaint = await this.governmentCasesService.getCaseByReference(actorUserId, reference);
    return { complaint };
  }

  @Get('transfers/pending')
  @RequirePermission('transfers:accept')
  async listPendingTransfers(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    const transfers = await this.governmentCasesService.listPendingTransfers(actorUserId);
    return { transfers };
  }

  @Post('transfers/:transferId/accept')
  @RequirePermission('transfers:accept')
  async acceptTransfer(
    @Req() req: Request,
    @Param('transferId') transferId: string,
    @Body() dto: AcceptTransferDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.governmentCasesService.acceptTransfer(actorUserId, transferId, dto);
  }

  @Post('cases/:reference/triage')
  @RequirePermission('complaints:triage')
  async triageCase(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: TriageCaseDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.governmentCasesService.triageCase(actorUserId, reference, dto);
  }

  @Post('cases/:reference/assign')
  @RequirePermission('complaints:assign')
  async assignOfficer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: AssignOfficerDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.governmentCasesService.assignOfficer(actorUserId, reference, dto, false);
  }

  @Post('cases/:reference/reassign')
  @RequirePermission('complaints:assign')
  async reassignOfficer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: AssignOfficerDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.governmentCasesService.assignOfficer(actorUserId, reference, dto, true);
  }
}

