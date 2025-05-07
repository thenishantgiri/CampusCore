import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import logger from '../logger/pino.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.originalUrl;

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        // Using the proper pino format: object, message
        logger.info(
          {
            type: 'http',
            method,
            url,
            duration: `${duration}ms`,
          },
          `[${method}] ${url} - ${duration}ms`,
        );
      }),
    );
  }
}
