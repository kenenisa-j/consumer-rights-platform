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
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { TransferStaffDto } from './dto/transfer-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @RequirePermission('staff:manage')
  @Post()
  async createStaff(@Req() req: Request, @Body() dto: CreateStaffDto) {
    const actorId = (req as any).user.id;
    const staff = await this.staffService.createStaff(actorId, dto);
    return { staff };
  }

  @RequirePermission('staff:read')
  @Get()
  async listStaff(@Req() req: Request, @Query() query: QueryStaffDto) {
    const actorId = (req as any).user.id;
    const staff = await this.staffService.listStaff(actorId, query);
    return { staff };
  }

  @RequirePermission('staff:read')
  @Get(':id')
  async getStaffById(@Param('id') id: string) {
    const staff = await this.staffService.getStaffById(id);
    return { staff };
  }

  @RequirePermission('staff:manage')
  @Patch(':id')
  async updateStaff(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const actorId = (req as any).user.id;
    const staff = await this.staffService.updateStaff(actorId, id, dto);
    return { staff };
  }

  @RequirePermission('staff:manage')
  @Post('assignments')
  async assignStaff(@Req() req: Request, @Body() dto: AssignStaffDto) {
    const actorId = (req as any).user.id;
    const deployment = await this.staffService.assignStaff(actorId, dto);
    return { deployment };
  }

  @RequirePermission('staff:manage')
  @Post(':id/transfer')
  async transferStaff(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: TransferStaffDto,
  ) {
    const actorId = (req as any).user.id;
    const deployment = await this.staffService.transferStaff(actorId, id, dto);
    return { deployment };
  }

  @RequirePermission('staff:manage')
  @Post(':id/unassign')
  async unassignStaff(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req as any).user.id;
    const deployment = await this.staffService.unassignStaff(actorId, id);
    return { deployment };
  }

  @RequirePermission('staff:manage')
  @Post('assignments/:assignmentId/deactivate')
  async deactivateAssignment(
    @Req() req: Request,
    @Param('assignmentId') assignmentId: string,
  ) {
    const actorId = (req as any).user.id;
    const deployment = await this.staffService.deactivateAssignment(actorId, assignmentId);
    return { deployment };
  }
}
