import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global PrismaModule providing PrismaService across the entire NestJS application.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
