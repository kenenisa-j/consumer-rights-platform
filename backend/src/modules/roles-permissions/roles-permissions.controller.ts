import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RoleCode } from '@prisma/client';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { RolesPermissionsService } from './roles-permissions.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';

@Controller('roles')
export class RolesPermissionsController {
  constructor(private readonly service: RolesPermissionsService) {}

  @RequirePermission('roles:read')
  @Get()
  async listRoles() {
    const roles = await this.service.listRoles();
    return { roles };
  }

  @RequirePermission('roles:read')
  @Get('permissions/available')
  async listPermissions(@Query() query: QueryPermissionDto) {
    const permissions = await this.service.listPermissions(query);
    return { permissions };
  }

  @RequirePermission('roles:manage')
  @Post('permissions')
  async createPermission(@Req() req: Request, @Body() dto: CreatePermissionDto) {
    const actorId = (req as any).user.id;
    const permission = await this.service.createPermission(actorId, dto);
    return { permission };
  }

  @RequirePermission('roles:read')
  @Get(':code')
  async getRole(@Param('code') code: RoleCode) {
    const role = await this.service.getRole(code);
    return { role };
  }

  @RequirePermission('roles:manage')
  @Post(':code/permissions')
  async assignPermissionToRole(
    @Req() req: Request,
    @Param('code') code: RoleCode,
    @Body() dto: AssignPermissionDto,
  ) {
    const actorId = (req as any).user.id;
    const rolePermission = await this.service.assignPermissionToRole(actorId, code, dto);
    return { rolePermission };
  }

  @RequirePermission('roles:manage')
  @Delete(':code/permissions/:permissionCode')
  async revokePermissionFromRole(
    @Req() req: Request,
    @Param('code') code: RoleCode,
    @Param('permissionCode') permissionCode: string,
  ) {
    const actorId = (req as any).user.id;
    const result = await this.service.revokePermissionFromRole(actorId, code, permissionCode);
    return result;
  }

  @RequirePermission('roles:manage')
  @Post('users/:userId/assign')
  async assignRoleToUser(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const actorId = (req as any).user.id;
    const effectiveScope = await this.service.assignRoleToUser(actorId, userId, dto.roleCode);
    return { effectiveScope };
  }

  @RequirePermission('roles:manage')
  @Post('users/:userId/revoke')
  async revokeRoleFromUser(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const actorId = (req as any).user.id;
    const effectiveScope = await this.service.revokeRoleFromUser(actorId, userId, dto.roleCode);
    return { effectiveScope };
  }

  @RequirePermission('roles:read')
  @Get('users/:userId/effective-scope')
  async getUserEffectiveScope(@Param('userId') userId: string) {
    const scope = await this.service.getUserEffectiveScope(userId);
    return { scope };
  }
}

