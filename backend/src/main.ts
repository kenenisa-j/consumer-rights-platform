import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json, raw, urlencoded } from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { AuthService } from './lib/auth/auth.service';

/**
 * Resolves trusted CORS origins based on environment policies:
 * - Production: Strictly allows only explicitly configured, non-loopback origins.
 * - Non-production: Allows local frontend development servers alongside PUBLIC_URL.
 * - Fails safely if production configuration is invalid or missing.
 */
export function resolveAllowedCorsOrigins(publicUrl: string, nodeEnv: string): string[] {
  const isProduction = nodeEnv === 'production';
  const allowedOrigins: string[] = [];

  if (publicUrl && publicUrl.trim()) {
    try {
      const parsedUrl = new URL(publicUrl.trim());
      const isLoopback =
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1' ||
        parsedUrl.hostname === '::1';

      if (isProduction && isLoopback) {
        throw new Error(
          `CRITICAL CONFIGURATION ERROR: PUBLIC_URL cannot be localhost/loopback in production (${publicUrl}).`,
        );
      }
      allowedOrigins.push(parsedUrl.origin);
    } catch (err: any) {
      if (isProduction) {
        throw new Error(`CRITICAL CONFIGURATION ERROR: Invalid PUBLIC_URL for production CORS: ${err.message}`);
      }
    }
  }

  if (!isProduction) {
    if (!allowedOrigins.includes('http://localhost:3300')) {
      allowedOrigins.push('http://localhost:3300');
    }
    if (!allowedOrigins.includes('http://127.0.0.1:3300')) {
      allowedOrigins.push('http://127.0.0.1:3300');
    }
  }

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('CRITICAL CONFIGURATION ERROR: Production CORS requires at least one valid, non-localhost PUBLIC_URL.');
  }

  return allowedOrigins;
}

/**
 * Configures CORS on a NestJS application using the resolved allowed origins.
 * Extracted so lightweight test harnesses can apply the same CORS policy
 * without booting the full AppModule or requiring a database connection.
 */
export function configureCors(
  app: { enableCors: (options: { origin: string[]; credentials: boolean }) => void },
  publicUrl: string,
  nodeEnv: string,
): void {
  const allowedOrigins = resolveAllowedCorsOrigins(publicUrl, nodeEnv);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
}

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);
  const authService = app.get(AuthService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const publicUrl = configService.get<string>('PUBLIC_URL', 'http://localhost:3300');

  // Security headers
  app.use(helmet());

  // CORS configuration
  configureCors(app, publicUrl, nodeEnv);

  // Mount Better Auth handler BEFORE body parsers for Express 5 catch-all
  const expressApp = app.getHttpAdapter().getInstance();
  const authHandler = toNodeHandler(authService.auth);
  expressApp.all('/api/auth/*splat', (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // Forward custom NestJS auth controller routes to NestJS pipeline
    if (
      req.path === '/api/auth/register-consumer' ||
      req.path === '/register-consumer' ||
      req.path === '/api/auth/protected-test' ||
      req.path === '/protected-test'
    ) {
      return next();
    }
    return authHandler(req, res);
  });

  // Mount body-parsing middleware after Better Auth handler
  // An evidence file is sent as the raw request body (up to 10 MB); every other route gets JSON.
  app.use('/api/complaints', (req: ExpressRequest, res: ExpressResponse, next: NextFunction) =>
    req.method === 'POST' && req.path.endsWith('/evidence') ? raw({ type: () => true, limit: '10mb' })(req, res, next) : next());
  app.use(json({ limit: '3mb' })); // room for a voice note sent as base64 (the API caps the recording itself)
  app.use(urlencoded({ extended: true }));

  // Global routing prefix
  app.setGlobalPrefix('api');

  // Global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  return app;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await createNestApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 4300);
  const host = configService.get<string>('API_HOST', '127.0.0.1');

  await app.listen(port, host);
  logger.log(`Consumer Rights Backend running at http://${host}:${port}/api`);
  logger.log(`Health endpoint available at http://${host}:${port}/api/health`);
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
