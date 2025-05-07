import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import logger from '../logger/pino.logger';

// Define the expected user structure
interface RequestUser {
  id?: string;
  [key: string]: unknown;
}

// Extend Express Request to include our user type
interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

interface ErrorResponse {
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error: string | undefined;
    let additionalProps = {};

    if (exception instanceof HttpException) {
      const responseObj = exception.getResponse();

      if (typeof responseObj === 'string') {
        message = responseObj;
      } else if (typeof responseObj === 'object' && responseObj !== null) {
        const errObj = responseObj as ErrorResponse;

        // Handle message arrays (common in validation errors)
        if (Array.isArray(errObj.message)) {
          message = errObj.message.join(', ');
        } else if (errObj.message && typeof errObj.message === 'string') {
          message = errObj.message;
        }

        if (errObj.error && typeof errObj.error === 'string') {
          error = errObj.error;
        }

        // Extract any additional properties to pass along
        const { message: _, error: __, ...rest } = errObj;
        additionalProps = rest;
      }
    }

    // Build error context for logging
    const errorContext: Record<string, unknown> = {
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      error,
      // Safely access user ID if available
      ...(request.user?.id ? { userId: request.user.id } : {}),
      // Include request ID if available
      ...(request.headers['x-request-id']
        ? { requestId: request.headers['x-request-id'] }
        : {}),
      // In dev environment, include stack trace
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
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
      ...additionalProps, // Include additional properties
    });
  }
}
