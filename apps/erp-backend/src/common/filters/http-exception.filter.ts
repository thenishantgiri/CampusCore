import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import logger from '../logger/pino.logger';

interface ErrorResponse {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      const responseObj = exception.getResponse();

      if (typeof responseObj === 'string') {
        message = responseObj;
      } else if (typeof responseObj === 'object' && responseObj !== null) {
        const errObj = responseObj as ErrorResponse;
        if (errObj.message && typeof errObj.message === 'string') {
          message = errObj.message;
        }
        if (errObj.error && typeof errObj.error === 'string') {
          error = errObj.error;
        }
      }
    }

    // Build error context
    const errorContext: Record<string, unknown> = {
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      error,
    };

    // Use pino's standard format: object, message
    logger.error(errorContext, message);

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(error ? { error } : {}),
    });
  }
}
