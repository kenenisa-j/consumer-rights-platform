import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import type { ApiFailure } from '@consumer-rights/contracts';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected internal error occurred.';
    let fields: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = HttpStatus[status] || 'HTTP_ERROR';
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        code = (resObj.code as string) || HttpStatus[status] || 'HTTP_ERROR';

        if (Array.isArray(resObj.message)) {
          message = 'Validation failed';
          fields = {};
          for (const item of resObj.message) {
            if (typeof item === 'string') {
              const [firstWord] = item.split(' ');
              if (firstWord && !fields[firstWord]) {
                fields[firstWord] = item;
              }
            }
          }
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }

        if (resObj.fields && typeof resObj.fields === 'object') {
          fields = resObj.fields as Record<string, string>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    } else {
      this.logger.error(`Unknown exception: ${String(exception)}`);
    }

    const payload: ApiFailure = {
      ok: false,
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    };

    response.status(status).json(payload);
  }
}
