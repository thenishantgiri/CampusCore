import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { SafeUser } from 'src/auth/types/safe-user.interface';

describe('RequestContextService', () => {
  let moduleRef: TestingModule;
  let mockRequest: { user?: SafeUser | undefined };

  beforeEach(async () => {
    mockRequest = {
      user: undefined,
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        RequestContextService,
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();
  });

  it('should be defined', async () => {
    const service = await moduleRef.resolve(RequestContextService);
    expect(service).toBeDefined();
  });

  it('should return null values when no user is present in request', async () => {
    // Arrange
    mockRequest.user = undefined;
    const service = await moduleRef.resolve(RequestContextService);

    // Act
    const context = service.getContext();

    // Assert
    expect(context).toEqual({
      userId: null,
      email: null,
      roleId: null,
    });
  });

  it('should return correct user context when user is authenticated', async () => {
    // Arrange
    const mockUser: SafeUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      roleId: 'role-admin',
      createdAt: new Date(),
    };
    mockRequest.user = mockUser;
    const service = await moduleRef.resolve(RequestContextService);

    // Act
    const context = service.getContext();

    // Assert
    expect(context).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      roleId: 'role-admin',
    });
  });

  it('should handle partial user data', async () => {
    // Arrange - create a user with missing email property
    const partialUser = {
      id: 'user-123',
      roleId: 'role-admin',
      name: 'Test User',
      createdAt: new Date(),
    } as SafeUser;
    mockRequest.user = partialUser;
    const service = await moduleRef.resolve(RequestContextService);

    // Act
    const context = service.getContext();

    // Assert
    expect(context).toEqual({
      userId: 'user-123',
      email: null,
      roleId: 'role-admin',
    });
  });

  it('should handle empty string values in user properties', async () => {
    // Arrange
    const userWithEmptyStrings: SafeUser = {
      id: 'user-123',
      email: '',
      name: 'Test User',
      roleId: '',
      createdAt: new Date(),
    };
    mockRequest.user = userWithEmptyStrings;
    const service = await moduleRef.resolve(RequestContextService);

    // Act
    const context = service.getContext();

    // Assert
    expect(context).toEqual({
      userId: 'user-123',
      email: '',
      roleId: '',
    });
  });

  it('should handle null user object', async () => {
    // Arrange
    mockRequest.user = null as unknown as SafeUser;
    const service = await moduleRef.resolve(RequestContextService);

    // Act
    const context = service.getContext();

    // Assert
    expect(context).toEqual({
      userId: null,
      email: null,
      roleId: null,
    });
  });
});
