import { Controller, Get, Post, Body, Param, Req, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

/**
 * Consumer-facing cases API.
 * Every endpoint requires authentication; the user ID comes from the verified session,
 * never from a browser-supplied parameter.
 */
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @RequirePermission('complaints:read:own')
  @Get()
  async listMyCases(@Req() req: Request) {
    const userId = (req as any).user.id;
    const cases = await this.casesService.listByConsumer(userId);
    return { cases };
  }

  @RequirePermission('complaints:read:own')
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const userId = (req as any).user.id;
    const profile = await this.casesService.getProfile(userId);
    return { profile };
  }

  @RequirePermission('complaints:create:own')
  @Post()
  async createCase(@Req() req: Request, @Body() dto: CreateCaseDto) {
    const userId = (req as any).user.id;
    const created = await this.casesService.createCase(userId, dto);
    return { case: created };
  }

  @RequirePermission('complaints:read:own')
  @Get(':reference')
  async getCase(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const c = await this.casesService.getByReference(userId, reference);
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    return { case: c };
  }
}

