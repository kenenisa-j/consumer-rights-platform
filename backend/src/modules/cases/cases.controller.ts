import { Controller, Get, Param, Req, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../lib/common/decorators/require-permission.decorator';
import { CasesService } from './cases.service';

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

  @RequirePermission('complaints:read:own')
  @Get(':reference')
  async getCase(@Req() req: Request, @Param('reference') reference: string) {
    const userId = (req as any).user.id;
    const c = await this.casesService.getByReference(userId, reference);
    if (!c) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
    return { case: c };
  }
}

