import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../lib/common/decorators/public.decorator';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { QueryMarketDto } from './dto/query-market.dto';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @RequirePermission('markets:manage')
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateMarketDto) {
    const actorId = (req as any).user.id;
    const market = await this.marketsService.createMarket(actorId, dto);
    return { market };
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryMarketDto) {
    const markets = await this.marketsService.findAll(query);
    return { markets };
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const market = await this.marketsService.findById(id);
    return { market };
  }

  @RequirePermission('markets:manage')
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateMarketDto,
  ) {
    const actorId = (req as any).user.id;
    const market = await this.marketsService.updateMarket(actorId, id, dto);
    return { market };
  }

  @RequirePermission('markets:manage')
  @Post(':id/deactivate')
  async deactivate(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req as any).user.id;
    const market = await this.marketsService.deactivateMarket(actorId, id);
    return { market };
  }

  @RequirePermission('markets:manage')
  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req as any).user.id;
    await this.marketsService.deleteMarket(actorId, id);
    return { success: true };
  }
}

