import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from 'src/auth/constants/roles.enum';
import { UpdateUserRoleDto } from 'src/users/dto/update-user-role.dto';
import { FindUsersQueryDto } from 'src/users/dto/find-users.query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    roleId: Role.TEACHER,
    role: { name: 'TEACHER' },
    createdAt: new Date(),
  };

  const mockUpdatedUser = {
    ...mockUser,
    roleId: Role.ADMIN,
    role: { name: 'ADMIN' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            updateUserRole: jest.fn(),
            deleteUser: jest.fn(),
            findAllUsers: jest.fn(),
            findUserById: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue([]),
            getAllAndOverride: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findUnique: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const dto: UpdateUserRoleDto = { roleId: Role.ADMIN };

      usersService.updateUserRole = jest
        .fn()
        .mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await controller.updateUserRole(userId, dto);

      // Assert
      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        dto.roleId,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const userId = 'nonexistent';
      const dto: UpdateUserRoleDto = { roleId: Role.ADMIN };

      usersService.updateUserRole = jest
        .fn()
        .mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert
      await expect(controller.updateUserRole(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        dto.roleId,
      );
    });

    it('should forward ForbiddenException from service', async () => {
      // Arrange
      const userId = 'user-123';
      const dto: UpdateUserRoleDto = { roleId: Role.SUPER_ADMIN };

      usersService.updateUserRole = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'Only SUPER_ADMIN can assign the SUPER_ADMIN role.',
          ),
        );

      // Act & Assert
      await expect(controller.updateUserRole(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        dto.roleId,
      );
    });

    it('should forward BadRequestException from service', async () => {
      // Arrange
      const userId = 'user-123';
      const dto: UpdateUserRoleDto = { roleId: Role.TEACHER }; // User already has this role

      usersService.updateUserRole = jest
        .fn()
        .mockRejectedValue(
          new BadRequestException('User already has the specified role.'),
        );

      // Act & Assert
      await expect(controller.updateUserRole(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        dto.roleId,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userId = 'user-123';

      usersService.deleteUser = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await controller.deleteUser(userId);

      // Assert
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const userId = 'nonexistent';

      usersService.deleteUser = jest
        .fn()
        .mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert
      await expect(controller.deleteUser(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should forward ForbiddenException when trying to delete own account', async () => {
      // Arrange
      const userId = 'self-delete-attempt';

      usersService.deleteUser = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException('You cannot delete your own account'),
        );

      // Act & Assert
      await expect(controller.deleteUser(userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should forward ForbiddenException when non-admin tries to delete super admin', async () => {
      // Arrange
      const userId = 'super-admin-id';

      usersService.deleteUser = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'Only SUPER_ADMIN users can delete other SUPER_ADMIN users',
          ),
        );

      // Act & Assert
      await expect(controller.deleteUser(userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('findAllUsers', () => {
    it('should return filtered and paginated users', async () => {
      // Arrange
      const query: FindUsersQueryDto = {
        page: 1,
        limit: 10,
        roleId: Role.TEACHER,
        search: 'test',
      };

      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      usersService.findAllUsers = jest
        .fn()
        .mockResolvedValue(mockPaginatedResult);

      // Act
      const result = await controller.findAllUsers(query);

      // Assert
      expect(usersService.findAllUsers).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      // Arrange
      const userId = 'user-123';

      usersService.findUserById = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await controller.findUserById(userId);

      // Assert
      expect(usersService.findUserById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      const userId = 'nonexistent';

      usersService.findUserById = jest
        .fn()
        .mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert
      await expect(controller.findUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.findUserById).toHaveBeenCalledWith(userId);
    });
  });
});
