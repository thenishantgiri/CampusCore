import { Injectable, Scope } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import baseLogger from './pino.logger';
import type { Logger } from 'pino';

interface AuditLogContext {
  actor: {
    id: string | null;
    email: string | null;
    role: string | null;
  };
  details: Record<string, unknown>;
}

@Injectable({ scope: Scope.REQUEST })
export class LoggerService {
  private logger: Logger;

  constructor(private readonly requestContext: RequestContextService) {
    const context = this.requestContext.getContext();

    // Only include non-null values in the context
    const logContext: Record<string, unknown> = {};
    if (context.userId) logContext.userId = context.userId;
    if (context.email) logContext.email = context.email;
    if (context.roleId) logContext.roleId = context.roleId;

    // Create a child logger with user context
    this.logger = baseLogger.child(logContext);
  }

  info(message: string, context?: Record<string, unknown>): void {
    // Filter out null values from context
    const filteredContext = context ? this.filterNullValues(context) : {};
    this.logger.info(filteredContext, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    const filteredContext = context ? this.filterNullValues(context) : {};
    this.logger.error(filteredContext, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const filteredContext = context ? this.filterNullValues(context) : {};
    this.logger.warn(filteredContext, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const filteredContext = context ? this.filterNullValues(context) : {};
    this.logger.debug(filteredContext, message);
  }

  child(bindings: Record<string, unknown>): Logger {
    const filteredBindings = this.filterNullValues(bindings);
    return this.logger.child(filteredBindings);
  }

  auditLog(action: string, context: AuditLogContext): void {
    // Filter null values from actor
    const actor: Record<string, unknown> = {};
    if (context.actor.id) actor.id = context.actor.id;
    if (context.actor.email) actor.email = context.actor.email;
    if (context.actor.role) actor.role = context.actor.role;

    // Filter any null values in details
    const details = this.filterNullValues(context.details);

    this.logger.info(
      {
        audit: true,
        action,
        ...(Object.keys(actor).length > 0 ? { actor } : {}),
        ...details,
        timestamp: new Date().toISOString(),
      },
      `AUDIT: ${action}`,
    );
  }

  private filterNullValues(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (result, [key, value]) => {
        // Skip null and undefined values
        if (value === null || value === undefined) {
          return result;
        }

        // If it's an object (but not an array or null), recursively filter its properties
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const filteredNestedObj = this.filterNullValues(
            value as Record<string, unknown>,
          );

          // Only add the nested object if it has properties after filtering
          if (Object.keys(filteredNestedObj).length > 0) {
            result[key] = filteredNestedObj;
          }
          return result;
        }

        // For arrays, check if they contain objects and filter those
        if (Array.isArray(value)) {
          const filteredArray = value.map((item) => {
            if (
              typeof item === 'object' &&
              item !== null &&
              !Array.isArray(item)
            ) {
              return this.filterNullValues(item as Record<string, unknown>);
            }
            return item as unknown;
          });
          result[key] = filteredArray;
          return result;
        }

        // For primitive values, just add them
        result[key] = value;
        return result;
      },
      {} as Record<string, unknown>,
    );
  }
}
