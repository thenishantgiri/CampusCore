import { LoggingInterceptor } from 'src/common/interceptors/logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import logger from 'src/common/logger/pino.logger';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let originalDateNow: () => number;

  beforeAll(() => {
    // save real Date.now
    originalDateNow = Date.now;
  });

  afterAll(() => {
    // restore real Date.now
    Date.now = originalDateNow;
  });

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    interceptor = new LoggingInterceptor();
    jest.resetAllMocks();
  });

  it('should call logger.info with correct metadata and message', (done) => {
    // Arrange: fix start and end times
    // First call to Date.now() → start (1000)
    // Second call to Date.now() → end (1150)
    let calls = 0;
    Date.now = jest.fn().mockImplementation(() => {
      calls += 1;
      return calls === 1 ? 1000 : 1150;
    });

    // Fake request context with GET /hello
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/hello',
        }),
      }),
    } as unknown as ExecutionContext;

    // CallHandler that immediately completes
    const next: CallHandler = {
      handle: () => of('ok'),
    };

    // Act
    interceptor.intercept(mockContext, next).subscribe({
      next: () => {
        // nothing
      },
      complete: () => {
        // Assert
        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith(
          {
            type: 'http',
            method: 'GET',
            url: '/hello',
            duration: '150ms',
          },
          '[GET] /hello - 150ms',
        );
        done();
      },
      error: done.fail,
    });
  });

  it('should propagate the response value unchanged', (done) => {
    // Arrange: simple pass-through handler
    Date.now = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0);
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', originalUrl: '/test' }),
      }),
    } as unknown as ExecutionContext;
    const next: CallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    // Act
    interceptor.intercept(mockContext, next).subscribe((value) => {
      expect(value).toEqual({ foo: 'bar' });
      done();
    });
  });
});
