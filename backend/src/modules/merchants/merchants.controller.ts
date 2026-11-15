import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { QueryMerchantDto } from './dto/query-merchant.dto';
import { VerifyMerchantDto } from './dto/verify-merchant.dto';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { Public } from '../../lib/common/decorators/public.decorator';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @RequirePermission('merchants:manage')
  async create(
    @Req() req: Request,
    @Body() dto: CreateMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.createMerchant(actorUserId, dto);
  }

  @Get()
  @RequirePermission('merchants:read')
  async findAll(
    @Req() req: Request,
    @Query() query: QueryMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.findAll(actorUserId, query);
  }

  @Get('public-lookup')
  @Public()
  async findPublicLookup(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.merchantsService.findPublicLookup({ search, category });
  }

  @Get(':id')
  @RequirePermission('merchants:read')
  async findOne(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('merchants:manage')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.updateMerchant(actorUserId, id, dto);
  }

  @Post(':id/verify')
  @RequirePermission('merchants:verify')
  async verify(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VerifyMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.verifyMerchant(actorUserId, id, dto);
  }

  @Post(':id/reject')
  @RequirePermission('merchants:verify')
  async reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VerifyMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.rejectMerchant(actorUserId, id, dto);
  }

  @Post(':id/suspend')
  @RequirePermission('merchants:manage')
  async suspend(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VerifyMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.merchantsService.suspendMerchant(actorUserId, id, dto);
  }
}
