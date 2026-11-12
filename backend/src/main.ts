import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 4300);
  const host = configService.get<string>('API_HOST', '127.0.0.1');
  const publicUrl = configService.get<string>('PUBLIC_URL', 'http://localhost:3300');

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: [publicUrl, 'http://localhost:3300', 'http://127.0.0.1:3300'],
    credentials: true,
  });

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

  await app.listen(port, host);
  logger.log(`Consumer Rights Backend running at http://${host}:${port}/api`);
  logger.log(`Health endpoint available at http://${host}:${port}/api/health`);
}

void bootstrap();
