import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Public } from '../../lib/common/decorators/public.decorator';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { OfficesService } from './offices.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { QueryOfficeDto } from './dto/query-office.dto';

@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @RequirePermission('offices:manage')
  @Post()
  async create(@Body() dto: CreateOfficeDto) {
    const office = await this.officesService.create(dto);
    return { office };
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryOfficeDto) {
    const offices = await this.officesService.findAll(query);
    return { offices };
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const office = await this.officesService.findById(id);
    return { office };
  }

  @RequirePermission('offices:manage')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOfficeDto) {
    const office = await this.officesService.update(id, dto);
    return { office };
  }

  @RequirePermission('offices:manage')
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const office = await this.officesService.deactivate(id);
    return { office };
  }

  @RequirePermission('offices:manage')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.officesService.delete(id);
    return { success: true };
  }
}

