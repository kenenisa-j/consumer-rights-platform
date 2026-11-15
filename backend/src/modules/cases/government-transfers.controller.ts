import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { GovernmentTransfersService } from './government-transfers.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { AcceptTransferDto } from './dto/accept-transfer.dto';
import { RejectTransferDto } from './dto/reject-transfer.dto';

@Controller('government')
export class GovernmentTransfersController {
  constructor(private readonly transfersService: GovernmentTransfersService) {}

  @Get('transfers/incoming')
  @RequirePermission('transfers:accept')
  async listIncomingTransfers(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    const transfers = await this.transfersService.listIncomingTransfers(actorUserId);
    return { transfers };
  }

  @Get('transfers/outgoing')
  @RequirePermission('transfers:read')
  async listOutgoingTransfers(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    const transfers = await this.transfersService.listOutgoingTransfers(actorUserId);
    return { transfers };
  }

  @Get('cases/:reference/transfers')
  @RequirePermission('transfers:read')
  async getCaseTransfers(@Req() req: Request, @Param('reference') reference: string) {
    const actorUserId = (req as any).user.id;
    const transfers = await this.transfersService.getCaseTransfers(actorUserId, reference);
    return { transfers };
  }

  @Post('cases/:reference/transfer')
  @RequirePermission('transfers:initiate')
  async initiateTransfer(
    @Req() req: Request,
    @Param('reference') reference: string,
    @Body() dto: InitiateTransferDto,
  ) {
    const actorUserId = (req as any).user.id;
    const transfer = await this.transfersService.initiateTransfer(actorUserId, reference, dto);
    return { transfer };
  }

  @Post('transfers/:transferId/accept')
  @RequirePermission('transfers:accept')
  async acceptTransfer(
    @Req() req: Request,
    @Param('transferId') transferId: string,
    @Body() dto: AcceptTransferDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.transfersService.acceptTransfer(actorUserId, transferId, dto);
  }

  @Post('transfers/:transferId/reject')
  @RequirePermission('transfers:reject')
  async rejectTransfer(
    @Req() req: Request,
    @Param('transferId') transferId: string,
    @Body() dto: RejectTransferDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.transfersService.rejectTransfer(actorUserId, transferId, dto);
  }

  @Post('transfers/:transferId/return')
  @RequirePermission('transfers:reject')
  async returnTransfer(
    @Req() req: Request,
    @Param('transferId') transferId: string,
    @Body() dto: RejectTransferDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.transfersService.rejectTransfer(actorUserId, transferId, dto);
  }
}

