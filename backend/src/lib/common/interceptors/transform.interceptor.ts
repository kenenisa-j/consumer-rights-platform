import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess } from '@consumer-rights/contracts';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccess<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccess<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped or response is streaming/empty, preserve it
        if (data && typeof data === 'object' && 'ok' in data) {
          return data;
        }
        return {
          ok: true,
          data,
        };
      }),
    );
  }
}
