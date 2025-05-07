import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import baseLogger from 'src/common/logger/pino.logger';
import type { Logger } from 'pino';

jest.mock('src/common/logger/pino.logger');

describe('LoggerService', () => {
  let service: LoggerService;
  let mockRequestCtx: Partial<RequestContextService>;
  let childLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // prepare a fake pino child logger
    childLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis(),
      // pino Logger has other methods/props, but we only need these
    } as any;

    // stub baseLogger.child to return our fake child logger
    (baseLogger.child as jest.Mock).mockReturnValue(childLogger);

    // stub RequestContextService
    mockRequestCtx = {
      getContext: jest.fn().mockReturnValue({
        userId: 'u-1',
        email: 'user@example.com',
        roleId: 'role-admin',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        { provide: RequestContextService, useValue: mockRequestCtx },
      ],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  it('should bind only non-null context in constructor', () => {
    // RequestContextService.getContext returned all values
    expect(baseLogger.child).toHaveBeenCalledWith({
      userId: 'u-1',
      email: 'user@example.com',
      roleId: 'role-admin',
    });
  });

  describe('filterNullValues via info/error/warn/debug', () => {
    it('should drop null/undefined entries', () => {
      service.info('msg', { a: 1, b: null, c: undefined, d: 'ok' });
      expect(childLogger.info).toHaveBeenCalledWith({ a: 1, d: 'ok' }, 'msg');
    });

    it('should recursively filter nested objects', () => {
      const nested = { x: 0, y: null, z: { m: null, n: 2 } };
      service.warn('warn', { top: nested });
      expect(childLogger.warn).toHaveBeenCalledWith(
        { top: { x: 0, z: { n: 2 } } },
        'warn',
      );
    });

    it('should preserve arrays, filtering their object entries', () => {
      const arr = [{ p: 1, q: null }, 3, 's'];
      service.debug('dbg', { arr });
      expect(childLogger.debug).toHaveBeenCalledWith(
        { arr: [{ p: 1 }, 3, 's'] },
        'dbg',
      );
    });

    it('should work with no context arg', () => {
      service.error('oops');
      expect(childLogger.error).toHaveBeenCalledWith({}, 'oops');
    });
  });

  describe('child()', () => {
    it('should return a new child logger with filtered bindings', () => {
      const newLogger = service.child({ x: null, y: 'yes' });
      expect(childLogger.child).toHaveBeenCalledWith({ y: 'yes' });
      expect(newLogger).toBe(childLogger);
    });
  });

  describe('auditLog()', () => {
    it('should format and log an audit entry', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('TIMESTAMP');
      service.auditLog('TEST_ACTION', {
        actor: { id: 'u-1', email: null, role: 'role-admin' },
        details: { foo: 'bar', skip: null },
      });

      // expected merged object
      expect(childLogger.info).toHaveBeenCalledWith(
        {
          audit: true,
          action: 'TEST_ACTION',
          actor: { id: 'u-1', role: 'role-admin' },
          foo: 'bar',
          timestamp: 'TIMESTAMP',
        },
        'AUDIT: TEST_ACTION',
      );
    });
  });
});
