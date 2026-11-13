import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService integrates Prisma 7.8.0 with PostgreSQL via @prisma/adapter-pg.
 *
 * Implements OnModuleInit and OnModuleDestroy to manage the database connection
 * and underlying connection pool cleanly with the NestJS application lifecycle.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool?: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined;
    const adapter = pool ? new PrismaPg(pool) : undefined;

    super(adapter ? { adapter } : undefined);

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    if (!this.pool) {
      this.logger.warn('DATABASE_URL not configured; skipping database connection.');
      return;
    }

    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database via PrismaPg adapter.');
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const safeMessage = this.sanitizeMessage(rawMessage);
      this.logger.error(`Database connection failed: ${safeMessage}`);
      throw new Error(`Database connection failed: ${safeMessage}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error: unknown) {
      this.logger.warn(`Error during Prisma disconnect: ${String(error)}`);
    }

    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error: unknown) {
        this.logger.warn(`Error closing PostgreSQL connection pool: ${String(error)}`);
      }
    }

    this.logger.log('Disconnected from PostgreSQL database.');
  }

  /**
   * Safe connectivity verification for health checks and readiness probes.
   * Runs a trivial query (`SELECT 1`) without exposing credentials or internal errors.
   */
  async ping(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Masks passwords from connection strings in error logs or thrown exceptions.
   */
  private sanitizeMessage(message: string): string {
    return message.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');
  }
}
