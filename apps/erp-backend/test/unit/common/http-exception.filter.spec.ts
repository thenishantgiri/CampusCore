// test/unit/common/http-exception.filter.spec.ts
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// Setup the mock BEFORE importing the module
jest.mock('src/common/logger/pino.logger', () => ({
  error: jest.fn(),
  // Add any other methods used by your code
  default: {
    error: jest.fn(),
  },
}));

// Now import the logger AFTER mocking it
import logger from 'src/common/logger/pino.logger';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
  });

  function createMockContext(exception: unknown, req?: any, res?: any) {
    const mockRequest = req || {
      method: 'GET',
      url: '/test',
      headers: {},
      user: undefined,
    };

    const mockResponse = res || {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  }

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException correctly', () => {
    // Arrange
    const message = 'Resource not found';
    const exception = new NotFoundException(message);

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(exception, undefined, mockResponse);

    // Act
    filter.catch(exception, mockContext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/test',
        message,
        error: 'Not Found',
        timestamp: expect.any(String),
      }),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
        error: 'Not Found',
      }),
      message,
    );
  });

  it('should handle HttpException with object response', () => {
    // Arrange
    const responseObj = {
      message: 'Validation failed',
      error: 'Bad Request',
      details: ['Field1 is required', 'Field2 is invalid'],
    };
    const exception = new BadRequestException(responseObj);

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(exception, undefined, mockResponse);

    // Act
    filter.catch(exception, mockContext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/test',
        message: 'Validation failed',
        error: 'Bad Request',
        details: ['Field1 is required', 'Field2 is invalid'],
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle message arrays', () => {
    // Arrange
    const responseObj = {
      message: ['Field1 is required', 'Field2 is invalid'],
      error: 'Bad Request',
    };
    const exception = new BadRequestException(responseObj);

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(exception, undefined, mockResponse);

    // Act
    filter.catch(exception, mockContext);

    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Field1 is required, Field2 is invalid',
        error: 'Bad Request',
      }),
    );
  });

  it('should handle non-HttpException errors', () => {
    // Arrange
    const error = new Error('Unexpected error');

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(error, undefined, mockResponse);

    // Act
    filter.catch(error, mockContext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/test',
        message: 'Internal server error',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should include userId in logs when user is authenticated', () => {
    // Arrange
    const exception = new NotFoundException('Not found');
    const authenticatedRequest = {
      method: 'GET',
      url: '/test',
      headers: {},
      user: { id: 'user-123' },
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(
      exception,
      authenticatedRequest,
      mockResponse,
    );

    // Act
    filter.catch(exception, mockContext);

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
      }),
      expect.any(String),
    );
  });

  it('should include requestId in logs when x-request-id header is present', () => {
    // Arrange
    const exception = new NotFoundException('Not found');
    const requestWithId = {
      method: 'GET',
      url: '/test',
      headers: {
        'x-request-id': 'request-123',
      },
      user: undefined,
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(
      exception,
      requestWithId,
      mockResponse,
    );

    // Act
    filter.catch(exception, mockContext);

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-123',
      }),
      expect.any(String),
    );
  });

  it('should include stack trace in logs when in development environment', () => {
    // Arrange
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Development error');
    error.stack = 'Error: Development error\n    at TestFunction';

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const mockContext = createMockContext(error, undefined, mockResponse);

    // Act
    filter.catch(error, mockContext);

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.stringContaining('Error: Development error'),
      }),
      expect.any(String),
    );

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
});
