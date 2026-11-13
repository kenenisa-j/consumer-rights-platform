import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter guard specifically protecting
 * the citizen registration endpoint against automated abuse, brute-force OTP
 * replay attempts, and CPU exhaustion from scrypt password hashing.
 *
 * Default policy: Maximum 5 requests per 60 seconds per client IP.
 */
@Injectable()
export class RegistrationRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RegistrationRateLimitGuard.name);
  private readonly clients = new Map<string, RateLimitRecord>();
  private readonly windowMs: number = 60 * 1000; // 60 seconds
  private readonly maxRequests: number = 5;
  private readonly isTest: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isTest = this.configService.get<string>('NODE_ENV') === 'test';
    // Periodic sweep to prevent unbounded memory growth in long-running instances
    setInterval(() => this.cleanupStaleRecords(), 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const clientIp = this.resolveClientIp(req);
    const now = Date.now();

    const record = this.clients.get(clientIp) || { timestamps: [] };

    // Evict timestamps outside the sliding window
    const validTimestamps = record.timestamps.filter((ts) => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.logger.warn(`Registration rate limit exceeded for IP: ${clientIp}`);
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration requests from this client. Please wait before trying again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validTimestamps.push(now);
    this.clients.set(clientIp, { timestamps: validTimestamps });
    return true;
  }

  /**
   * Resolves client IP securely without blindly trusting spoofed proxy headers.
   * In non-test environments, strictly uses socket remoteAddress or express-evaluated req.ip.
   * In test environment, allows partitioned test clients via X-Test-Client-IP header.
   */
  private resolveClientIp(req: Request): string {
    if (this.isTest && req.headers['x-test-client-ip']) {
      return String(req.headers['x-test-client-ip']).trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  /**
   * Clears in-memory rate limit history for a specific IP or all IPs (useful for test resets).
   */
  resetHistory(clientIp?: string): void {
    if (clientIp) {
      this.clients.delete(clientIp);
    } else {
      this.clients.clear();
    }
  }

  private cleanupStaleRecords(): void {
    const now = Date.now();
    for (const [ip, record] of this.clients.entries()) {
      const active = record.timestamps.filter((ts) => now - ts < this.windowMs);
      if (active.length === 0) {
        this.clients.delete(ip);
      } else {
        record.timestamps = active;
      }
    }
  }
}
