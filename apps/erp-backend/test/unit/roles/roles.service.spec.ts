import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from 'src/roles/roles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';

describe('RolesService', () => {
  let service: RolesService;

  // Mock services
  const mockPrismaService = {
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
  };

  // Mock logger instance that will be returned by child()
  const mockChildLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockLoggerService = {
    child: jest.fn().mockReturnValue(mockChildLogger),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    auditLog: jest.fn(),
  };

  const mockContext = {
    userId: 'test-user-id',
    email: 'test@example.com',
    roleId: 'role-super-admin',
  };

  const mockRequestContextService = {
    getContext: jest.fn().mockReturnValue(mockContext),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: RequestContextService,
          useValue: mockRequestContextService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createRoleDto: CreateRoleDto = {
      name: 'Finance Admin',
      type: 'CUSTOM', // Changed from RoleType.CUSTOM to string
      permissions: ['students:read', 'students:update'],
    };

    const mockPermissions = [
      { id: 'perm1', key: 'students:read' },
      { id: 'perm2', key: 'students:update' },
    ];

    const mockCreatedRole = {
      id: 'role-finance-admin',
      name: createRoleDto.name,
      type: createRoleDto.type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a role successfully', async () => {
      // Mock permission lookup
      // @ts-ignore
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      // Mock role creation - don't include id in the expected call data
      // @ts-ignore
      mockPrismaService.role.create.mockResolvedValue(mockCreatedRole);

      // Call the service method
      const result = await service.create(createRoleDto);

      // Check that permissions were looked up
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: { key: { in: createRoleDto.permissions } },
      });

      // Check that role was created with the right data - REMOVE id from expected data
      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          id: 'role-finance-admin',
          name: createRoleDto.name,
          type: createRoleDto.type,
          permissions: {
            connect: mockPermissions.map((p) => ({ id: p.id })),
          },
        },
      });

      // Check logging
      expect(mockLoggerService.child).toHaveBeenCalledWith({
        method: 'createRole',
      });
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating role'),
        expect.objectContaining({ roleName: createRoleDto.name }),
      );
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('created successfully'),
        expect.objectContaining({
          roleId: mockCreatedRole.id,
          permissions: mockPermissions.map((p) => p.key),
        }),
      );

      // Check audit logging
      expect(mockLoggerService.auditLog).toHaveBeenCalledWith(
        'ROLE_CREATED',
        expect.objectContaining({
          actor: expect.objectContaining({
            id: mockContext.userId,
            email: mockContext.email,
            role: mockContext.roleId,
          }),
          details: expect.any(Object),
        }),
      );

      // Check returned value
      expect(result).toEqual(mockCreatedRole);
    });

    it('should handle errors during role creation', async () => {
      // Mock permission lookup
      // @ts-ignore
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      // Mock role creation failure
      const error = new Error('Database error');
      // @ts-ignore
      mockPrismaService.role.create.mockRejectedValue(error);

      // Expect the service to throw
      await expect(service.create(createRoleDto)).rejects.toThrow();

      // Check error logging
      expect(mockChildLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in create'),
        expect.objectContaining({
          message: error.message,
        }),
      );
    });
  });

  describe('findAll', () => {
    const mockRoles = [
      { id: 'role-1', name: 'Role 1' },
      { id: 'role-2', name: 'Role 2' },
    ];

    it('should return all roles', async () => {
      // Mock findMany to return some roles
      // @ts-ignore
      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      // Call the service method
      const result = await service.findAll();

      // Check that findMany was called
      expect(mockPrismaService.role.findMany).toHaveBeenCalled();

      // Check logging
      expect(mockLoggerService.child).toHaveBeenCalledWith({
        method: 'findAllRoles',
      });
      expect(mockChildLogger.info).toHaveBeenCalledWith('Fetching all roles');

      // Check returned value
      expect(result).toEqual(mockRoles);
    });

    it('should handle errors during role lookup', async () => {
      // Mock findMany to throw error
      const error = new Error('Database error');
      // @ts-ignore
      mockPrismaService.role.findMany.mockRejectedValue(error);

      // Expect the service to throw
      await expect(service.findAll()).rejects.toThrow();

      // Check error logging
      expect(mockChildLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in findAll'),
        expect.objectContaining({
          message: error.message,
        }),
      );
    });
  });

  describe('update', () => {
    const roleId = 'role-finance';
    const updateRoleDto: UpdateRoleDto = {
      name: 'Updated Finance Role',
      permissions: ['students:read', 'fees:read'],
    };

    const mockPermissions = [
      { id: 'perm1', key: 'students:read' },
      { id: 'perm3', key: 'fees:read' },
    ];

    const mockUpdatedRole = {
      id: roleId,
      name: updateRoleDto.name,
      type: 'CUSTOM', // Changed from RoleType.CUSTOM to string
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a role successfully', async () => {
      // Mock the findUnique call that happens before the update
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Original Finance Role',
        type: 'CUSTOM',
        permissions: mockPermissions.map((p) => ({ key: p.key, id: p.id })),
      });

      // Mock permission lookup
      // @ts-ignore
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      // Mock role update
      // @ts-ignore
      mockPrismaService.role.update.mockResolvedValue({
        ...mockUpdatedRole,
        permissions: mockPermissions.map((p) => ({ key: p.key, id: p.id })),
      });

      // Call the service method
      const result = await service.update(roleId, updateRoleDto);

      // Check that permissions were looked up
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: { key: { in: updateRoleDto.permissions } },
      });

      // Check that role was updated with the right data
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          name: updateRoleDto.name,
          permissions: {
            set: mockPermissions.map((p) => ({ id: p.id })),
          },
        },
        include: { permissions: true },
      });

      // Check logging
      expect(mockLoggerService.child).toHaveBeenCalledWith({
        method: 'updateRole',
      });
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updating role'),
        expect.objectContaining({ roleId }),
      );
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully'),
        expect.objectContaining({
          roleId: mockUpdatedRole.id,
          permissionsUpdated: true,
        }),
      );

      // Check audit logging
      expect(mockLoggerService.auditLog).toHaveBeenCalledWith(
        'ROLE_UPDATED',
        expect.objectContaining({
          actor: expect.objectContaining({
            id: mockContext.userId,
            email: mockContext.email,
            role: mockContext.roleId,
          }),
          details: expect.any(Object),
        }),
      );

      // Check returned value
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUpdatedRole.id,
          name: mockUpdatedRole.name,
          type: mockUpdatedRole.type,
        }),
      );
    });

    it('should handle not found error', async () => {
      // Mock permission lookup
      // @ts-ignore
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      // Create an error with a real Prisma structure
      const prismaError = new Error('Record not found');
      // This is a more accurate representation of Prisma errors
      Object.defineProperty(prismaError, 'code', {
        value: 'P2025',
        enumerable: true, // Make it visible for object inspection
      });
      // @ts-ignore
      mockPrismaService.role.update.mockRejectedValue(prismaError);

      // Update this expectation to match your service implementation
      await expect(service.update(roleId, updateRoleDto)).rejects.toThrow(
        NotFoundException,
      );

      // Check error logging still happens
      expect(mockChildLogger.error).toHaveBeenCalled();
    });

    it('should update without permissions if not provided', async () => {
      const dtoWithoutPermissions: UpdateRoleDto = {
        name: 'Updated Finance Role',
      };

      // Mock findUnique - important for the service flow
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Original Finance Role',
        type: 'CUSTOM',
        permissions: [],
      });

      // Mock role update with proper implementation
      // @ts-ignore
      mockPrismaService.role.update.mockResolvedValue({
        ...mockUpdatedRole,
        name: dtoWithoutPermissions.name,
        permissions: [],
      });

      // Call the service method
      const result = await service.update(roleId, dtoWithoutPermissions);

      // Check that permission lookup was NOT called
      expect(mockPrismaService.permission.findMany).not.toHaveBeenCalled();

      // Check that role was updated with just the name
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          name: dtoWithoutPermissions.name,
        },
        include: { permissions: true },
      });

      // Check logging
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully'),
        expect.objectContaining({
          permissionsUpdated: false,
        }),
      );

      // Check returned value
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUpdatedRole.id,
          name: dtoWithoutPermissions.name,
        }),
      );
    });
  });

  describe('delete', () => {
    const roleId = 'role-finance-admin';

    const mockRole = {
      id: roleId,
      name: 'Finance Admin',
      type: 'CUSTOM', // Changed from RoleType.CUSTOM to string
      users: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a role successfully', async () => {
      // Mock finding the role
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue({
        ...mockRole,
        users: [],
      });

      // Mock deleting the role
      // @ts-ignore
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      // Call the service method
      const result = await service.delete(roleId);

      // Check that the methods were called with correct parameters
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        include: { users: { select: { id: true } } },
      });
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });

      // Check logger methods
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        'Attempting to delete role',
        { roleId },
      );
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        'Role deleted successfully',
        expect.objectContaining({
          roleId: mockRole.id,
          roleName: mockRole.name,
        }),
      );

      // Check audit log - match the exact structure expected
      expect(mockLoggerService.auditLog).toHaveBeenCalledWith(
        'ROLE_DELETED',
        expect.objectContaining({
          actor: expect.objectContaining({
            id: mockContext.userId,
            email: mockContext.email,
            role: mockContext.roleId,
          }),
          details: expect.objectContaining({
            role: expect.objectContaining({
              id: mockRole.id,
              name: mockRole.name,
            }),
          }),
        }),
      );

      // Check returned value
      expect(result).toEqual(mockRole);
    });

    it('should throw NotFoundException if role not found', async () => {
      // Mock finding no role
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      // Assert that the method throws
      await expect(service.delete(roleId)).rejects.toThrow(NotFoundException);

      // Check logger methods
      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        'Role deletion failed: Role not found',
        { roleId },
      );
    });

    it('should throw ConflictException if role is assigned to users', async () => {
      // Mock finding role with assigned users
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue({
        ...mockRole,
        users: [{ id: 'user1' }, { id: 'user2' }],
      });

      // Assert that the method throws
      await expect(service.delete(roleId)).rejects.toThrow(ConflictException);

      // Check logger methods
      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        'Role deletion failed: Role is assigned to users',
        expect.objectContaining({
          roleId,
          userCount: 2,
        }),
      );
    });

    it('should throw ForbiddenException if role is STATIC', async () => {
      // Mock finding a STATIC role
      // @ts-ignore
      mockPrismaService.role.findUnique.mockResolvedValue({
        ...mockRole,
        type: 'STATIC', // Changed from RoleType.STATIC to string
        users: [],
      });

      // Assert that the method throws
      await expect(service.delete(roleId)).rejects.toThrow(ForbiddenException);

      // Check logger methods
      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        'Role deletion failed: Cannot delete STATIC role',
        expect.objectContaining({
          roleId,
          roleType: 'STATIC', // Changed from RoleType.STATIC to string
        }),
      );
    });
  });
});
