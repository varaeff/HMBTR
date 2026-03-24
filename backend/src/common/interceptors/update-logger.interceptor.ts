import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class UpdateLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private sanitizePayload(payload: unknown): unknown {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    const sensitiveFields = [
      'password',
      'refreshToken',
      'accessToken',
      'secret',
      'token',
      'apiKey',
    ];
    const sanitized = { ...payload };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        (sanitized as string)[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const host = context.switchToHttp();
    const req = host.getRequest<Request>();

    const method = req.method;
    const url = req.url;
    const body = req.body as unknown;

    return next.handle().pipe(
      tap(() => {
        // if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const sanitizedPayload = this.sanitizePayload(body);
        const logData: Record<string, unknown> = {
          method,
          url,
          payload:
            typeof sanitizedPayload === 'object' && sanitizedPayload !== null
              ? (sanitizedPayload as Record<string, unknown>)
              : { data: sanitizedPayload },
        };

        this.logger.info('Data update', logData);
        // }
      }),
    );
  }
}
