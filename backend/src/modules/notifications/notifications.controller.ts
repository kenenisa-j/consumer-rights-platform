import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission('notifications:read:own', 'profile.read.own')
  async listNotifications(
    @Req() req: Request,
    @Query() query: QueryNotificationsDto,
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.listNotifications(userId, query);
  }

  @Get('unread-count')
  @RequirePermission('notifications:read:own', 'profile.read.own')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('preferences')
  @RequirePermission('notifications:read:own', 'profile.read.own')
  async getPreferences(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @RequirePermission('notifications:manage:own', 'profile.read.own')
  async updatePreferences(
    @Req() req: Request,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Patch('read-all')
  @RequirePermission('notifications:manage:own', 'profile.read.own')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @RequirePermission('notifications:manage:own', 'profile.read.own')
  async markAsRead(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Delete(':id')
  @RequirePermission('notifications:manage:own', 'profile.read.own')
  async deleteNotification(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = (req as any).user.id;
    return this.notificationsService.deleteNotification(userId, id);
  }
}

