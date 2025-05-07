import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { CreatePermissionDto } from 'src/permissions/dto/create-permission.dto';
import { Permission } from 'generated/prisma';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: PrismaService;
  let logger: LoggerService;

  const mockPrisma = {
    permission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
  };

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    auditLog: jest.fn(),
  };

  const mockRequestContext = {
    getContext: jest.fn().mockReturnValue({
      userId: 'test-user-id',
      email: 'test@example.com',
      roleId: 'admin',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LoggerService, useValue: mockLogger },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get<PrismaService>(PrismaService);
    logger = module.get<LoggerService>(LoggerService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreatePermissionDto = {
      key: 'test:permission',
      label: 'Test Permission',
    };

    const permission: Permission = {
      id: 'permission-id',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully create a permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      mockPrisma.permission.create.mockResolvedValue(permission);

      const result = await service.create(dto);

      expect(result).toEqual(permission);
      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { key: dto.key },
      });
      expect(mockPrisma.permission.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(logger.auditLog).toHaveBeenCalledWith('PERMISSION_CREATED', {
        actor: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'admin',
        },
        details: {
          permission: {
            id: 'permission-id',
            key: dto.key,
            label: dto.label,
          },
        },
      });
    });

    it('should throw ConflictException if permission exists', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(permission);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Permission creation failed: Key already exists',
        { key: dto.key },
      );
    });

    it('should handle Prisma unique constraint error', async () => {
      // Create a proper Error instance with code property
      const prismaError = new Error('Unique constraint violation');
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['key'] };

      mockPrisma.permission.findUnique.mockResolvedValue(null);
      mockPrisma.permission.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Permission creation failed: Key already exists',
        {
          key: dto.key,
          error: 'Unique constraint violation',
        },
      );
    });

    it('should handle unexpected errors', async () => {
      mockPrisma.permission.findUnique.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of permissions', async () => {
      const permissions: Permission[] = [
        {
          id: 'permission-id',
          key: 'test:permission',
          label: 'Test Permission',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.findAll();
      expect(result).toEqual(permissions);
      expect(mockPrisma.permission.findMany).toHaveBeenCalled();
    });

    it('should handle errors when fetching permissions', async () => {
      mockPrisma.permission.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deletePermission', () => {
    const permissionId = 'permission-id';
    const permission: Permission = {
      id: permissionId,
      key: 'test:permission',
      label: 'Test Permission',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully delete a permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(permission);
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.permission.delete.mockResolvedValue(permission);

      const result = await service.deletePermission(permissionId);

      expect(result).toEqual(permission);
      expect(mockPrisma.permission.delete).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
      expect(logger.auditLog).toHaveBeenCalledWith('PERMISSION_DELETED', {
        actor: expect.any(Object),
        details: expect.any(Object),
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      await expect(service.deletePermission(permissionId)).rejects.toThrow(
        NotFoundException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Permission deletion failed: Permission not found',
        { permissionId },
      );
    });

    it('should throw ConflictException if permission is in use', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(permission);
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'role-id', name: 'test' },
      ]);

      await expect(service.deletePermission(permissionId)).rejects.toThrow(
        ConflictException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Permission deletion failed: Permission is used by roles',
        {
          permissionId,
          roles: [{ id: 'role-id', name: 'test' }],
        },
      );
    });

    it('should handle unexpected errors', async () => {
      mockPrisma.permission.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.deletePermission(permissionId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
