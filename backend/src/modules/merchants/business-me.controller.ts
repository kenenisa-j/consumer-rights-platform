import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BusinessDeskService } from './business-desk.service';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AddMerchantUserDto } from './dto/add-merchant-user.dto';
import { UpdateMerchantUserDto } from './dto/update-merchant-user.dto';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';

@Controller('business/me')
export class BusinessMeController {
  constructor(private readonly businessDeskService: BusinessDeskService) {}

  @Get()
  @RequirePermission('business.profile:read')
  async getProfile(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.getCallerMerchant(actorUserId);
  }

  @Patch()
  @RequirePermission('business.profile:manage')
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateMerchantDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.updateCallerMerchant(actorUserId, dto);
  }

  @Get('users')
  @RequirePermission('business.staff:read')
  async listUsers(@Req() req: Request) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.listMerchantUsers(actorUserId);
  }

  @Post('users')
  @RequirePermission('business.staff:manage')
  async addUser(
    @Req() req: Request,
    @Body() dto: AddMerchantUserDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.addMerchantUser(actorUserId, dto);
  }

  @Patch('users/:userId')
  @RequirePermission('business.staff:manage')
  async updateUser(
    @Req() req: Request,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMerchantUserDto,
  ) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.updateMerchantUser(actorUserId, targetUserId, dto);
  }

  @Delete('users/:userId')
  @RequirePermission('business.staff:manage')
  async removeUser(
    @Req() req: Request,
    @Param('userId') targetUserId: string,
  ) {
    const actorUserId = (req as any).user.id;
    return this.businessDeskService.removeMerchantUser(actorUserId, targetUserId);
  }
}
