import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

export interface HealthStatus {
  status: 'pass' | 'fail';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  database: 'connected' | 'disconnected';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async check(): Promise<HealthStatus> {
    const isDbConnected = await this.prisma.ping();
    return {
      status: isDbConnected ? 'pass' : 'fail',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
    };
  }
}
