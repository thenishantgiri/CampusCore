// test/unit/auth/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role } from 'src/auth/constants/roles.enum';
import { FindUsersQueryDto } from 'src/users/dto/find-users.query.dto';
import { Prisma } from 'generated/prisma';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;
  let requestContextService: RequestContextService;

  // Mock data
  const mockUser = {
    id: 'user1',
    email: 'user@example.com',
    name: 'Test User',
    roleId: 'role-teacher',
    role: { name: 'TEACHER' },
    createdAt: new Date('2023-01-01'),
  };

  const mockSuperAdminUser = {
    id: 'admin1',
    email: 'admin@example.com',
    name: 'Admin User',
    roleId: Role.SUPER_ADMIN,
    role: { name: 'SUPER_ADMIN' },
    createdAt: new Date('2023-01-02'),
  };

  const mockUsers = [
    mockUser,
    {
      id: 'user2',
      email: 'admin@example.com',
      name: 'Admin User',
      roleId: Role.ADMIN,
      role: { name: 'ADMIN' },
      createdAt: new Date('2023-01-02'),
    },
    {
      id: 'user3',
      email: 'super@example.com',
      name: 'Super User',
      roleId: Role.SUPER_ADMIN,
      role: { name: 'SUPER_ADMIN' },
      createdAt: new Date('2023-01-03'),
    },
  ];

  const mockContext = {
    userId: 'admin1',
    email: 'admin@example.com',
    roleId: Role.SUPER_ADMIN,
  };

  const mockNonAdminContext = {
    userId: 'user2',
    email: 'teacher@example.com',
    roleId: 'role-teacher',
  };

  // Setup mocks
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            role: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: LoggerService,
          useValue: {
            child: jest.fn().mockReturnValue({
              info: jest.fn(),
              warn: jest.fn(),
              error: jest.fn(),
            }),
            auditLog: jest.fn(),
          },
        },
        {
          provide: RequestContextService,
          useValue: {
            getContext: jest.fn().mockReturnValue(mockContext),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
    requestContextService = module.get<RequestContextService>(
      RequestContextService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = 'user1';
      const roleId = 'role-admin';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.role.findUnique = jest
        .fn()
        .mockResolvedValue({ name: 'ADMIN' });
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...mockUser,
        roleId: roleId,
        role: { name: 'ADMIN' },
      });

      // Act
      const result = await service.updateUserRole(userId, roleId);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
        },
      });

      expect(prismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        select: { name: true },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { roleId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
        },
      });

      expect(result).toEqual({
        ...mockUser,
        roleId: roleId,
        role: { name: 'ADMIN' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      const roleId = 'role-admin';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserRole(userId, roleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      const userId = 'user1';
      const roleId = 'nonexistent';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.role.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserRole(userId, roleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-admin tries to assign super admin role', async () => {
      // Arrange
      const userId = 'user1';
      const roleId = Role.SUPER_ADMIN;

      requestContextService.getContext = jest
        .fn()
        .mockReturnValue(mockNonAdminContext);
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.role.findUnique = jest
        .fn()
        .mockResolvedValue({ name: Role.SUPER_ADMIN });

      // Act & Assert
      await expect(service.updateUserRole(userId, roleId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when user already has the specified role', async () => {
      // Arrange
      const userId = 'user1';
      const roleId = 'role-teacher'; // Same role as mockUser

      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.role.findUnique = jest
        .fn()
        .mockResolvedValue({ name: 'TEACHER' });

      // Act & Assert
      await expect(service.updateUserRole(userId, roleId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userId = 'user1';

      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        createdAt: new Date(),
      });

      prismaService.user.delete = jest.fn().mockResolvedValue({
        ...mockUser,
        createdAt: new Date(),
      });

      // Act
      const result = await service.deleteUser(userId);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
          createdAt: true,
        },
      });

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          createdAt: true,
        },
      });

      expect(result).toEqual({
        ...mockUser,
        createdAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when trying to delete own account', async () => {
      // Arrange
      const userId = mockContext.userId; // Same as current user

      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockSuperAdminUser,
        createdAt: new Date(),
      });

      // Act & Assert
      await expect(service.deleteUser(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when non-admin tries to delete super admin', async () => {
      // Arrange
      const userId = 'admin1';

      requestContextService.getContext = jest
        .fn()
        .mockReturnValue(mockNonAdminContext);
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockSuperAdminUser,
        createdAt: new Date(),
      });

      // Act & Assert
      await expect(service.deleteUser(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle Prisma errors correctly', async () => {
      // Arrange
      const userId = 'user1';

      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        createdAt: new Date(),
      });

      // Create a simple error object with code property
      const prismaError = new Error('Prisma error');
      // Add code property directly
      (prismaError as any).code = 'P2025';

      prismaService.user.delete = jest.fn().mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.deleteUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllUsers', () => {
    it('should return paginated users without filters', async () => {
      // Arrange
      const query: FindUsersQueryDto = { page: 1, limit: 10 };

      prismaService.user.count = jest.fn().mockResolvedValue(3);
      prismaService.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAllUsers(query);

      // Assert
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: expect.any(Object),
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
          createdAt: true,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        data: mockUsers,
        meta: {
          total: 3,
          page: 1,
          limit: 10,
          pages: 1,
        },
      });
    });

    it('should apply role filter correctly', async () => {
      // Arrange
      const query: FindUsersQueryDto = {
        page: 1,
        limit: 10,
        roleId: Role.ADMIN,
      };

      const filteredUsers = mockUsers.filter(
        (user) => user.roleId === Role.ADMIN,
      );

      prismaService.user.count = jest
        .fn()
        .mockResolvedValue(filteredUsers.length);
      prismaService.user.findMany = jest.fn().mockResolvedValue(filteredUsers);

      // Act
      const result = await service.findAllUsers(query);

      // Assert
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { roleId: Role.ADMIN },
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { roleId: Role.ADMIN },
        select: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.data).toHaveLength(filteredUsers.length);
      expect(result.meta.total).toBe(filteredUsers.length);
    });

    it('should apply search filter correctly', async () => {
      // Arrange
      const query: FindUsersQueryDto = {
        page: 1,
        limit: 10,
        search: 'admin',
      };

      const filteredUsers = mockUsers.filter(
        (user) =>
          user.name.toLowerCase().includes('admin') ||
          user.email.toLowerCase().includes('admin'),
      );

      prismaService.user.count = jest
        .fn()
        .mockResolvedValue(filteredUsers.length);
      prismaService.user.findMany = jest.fn().mockResolvedValue(filteredUsers);

      // Act
      const result = await service.findAllUsers(query);

      // Assert
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { email: { contains: 'admin', mode: 'insensitive' } },
          ],
        },
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { email: { contains: 'admin', mode: 'insensitive' } },
          ],
        },
        select: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.data).toEqual(filteredUsers);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const query: FindUsersQueryDto = {
        page: 2,
        limit: 2,
      };

      // Simulate second page of results
      const paginatedUsers = mockUsers.slice(2);

      prismaService.user.count = jest.fn().mockResolvedValue(mockUsers.length);
      prismaService.user.findMany = jest.fn().mockResolvedValue(paginatedUsers);

      // Act
      const result = await service.findAllUsers(query);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: expect.any(Object),
        skip: 2, // Should skip first 2 results for page 2
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        data: paginatedUsers,
        meta: {
          total: 3,
          page: 2,
          limit: 2,
          pages: 2, // 3 users with limit 2 = 2 pages
        },
      });
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      const query: FindUsersQueryDto = { page: 1, limit: 10 };

      prismaService.user.count = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.findAllUsers(query)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return a user when found', async () => {
      // Arrange
      const userId = 'user1';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await service.findUserById(userId);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
          createdAt: true,
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';

      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.findUserById(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
    });

    it('should rethrow NotFoundException from the service', async () => {
      // Arrange
      const userId = 'user1';

      prismaService.user.findUnique = jest.fn().mockImplementation(() => {
        throw new NotFoundException('User not found');
      });

      // Act & Assert
      await expect(service.findUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      const userId = 'user1';

      prismaService.user.findUnique = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.findUserById(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
