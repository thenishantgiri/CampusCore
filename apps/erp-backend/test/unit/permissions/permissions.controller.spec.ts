import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from 'src/permissions/permissions.controller';
import { PermissionsService } from 'src/permissions/permissions.service';
import { CreatePermissionDto } from 'src/permissions/dto/create-permission.dto';
import { PermissionEntity } from 'src/permissions/entities/permission.entity';
import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';

// Mock Guards
const mockGuard = { canActivate: (context: ExecutionContext) => true };

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: PermissionsService;
  let app: INestApplication;

  const mockPermissionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    deletePermission: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        { provide: PermissionsService, useValue: mockPermissionsService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get<PermissionsService>(PermissionsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const dto: CreatePermissionDto = {
      key: 'students:create',
      label: 'Create Students',
    };

    const permissionEntity: PermissionEntity = {
      id: 'permission-id',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create and return a permission with 201 status', async () => {
      mockPermissionsService.create.mockResolvedValue(permissionEntity);

      const result = await controller.create(dto);

      expect(result).toEqual(permissionEntity);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException for duplicate key', async () => {
      mockPermissionsService.create.mockRejectedValue(
        new ConflictException('Permission already exists'),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should validate request body', async () => {
      const invalidDto = { ...dto, key: 'sh' }; // Too short

      await expect(controller.create(invalidDto as any)).rejects.toThrow();
    });
  });

  describe('findAll()', () => {
    const permissions: PermissionEntity[] = [
      {
        id: 'perm-1',
        key: 'students:read',
        label: 'View Students',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'perm-2',
        key: 'students:update',
        label: 'Update Students',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return array of permissions', async () => {
      mockPermissionsService.findAll.mockResolvedValue(permissions);

      const result = await controller.findAll();

      expect(result).toEqual(permissions);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockPermissionsService.findAll.mockRejectedValue(
        new InternalServerErrorException(),
      );

      await expect(controller.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deletePermission()', () => {
    const permissionId = 'perm-id-123';
    const deletedPermission: PermissionEntity = {
      id: permissionId,
      key: 'students:delete',
      label: 'Delete Students',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete and return the permission', async () => {
      mockPermissionsService.deletePermission.mockResolvedValue(
        deletedPermission,
      );

      const result = await controller.deletePermission(permissionId);

      expect(result).toEqual(deletedPermission);
      expect(service.deletePermission).toHaveBeenCalledWith(permissionId);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      mockPermissionsService.deletePermission.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.deletePermission('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if permission in use', async () => {
      mockPermissionsService.deletePermission.mockRejectedValue(
        new ConflictException('Permission in use'),
      );

      await expect(controller.deletePermission(permissionId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
