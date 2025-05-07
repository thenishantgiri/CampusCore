import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { SafeUser } from 'src/auth/types/safe-user.interface';
import { Prisma } from 'generated/prisma';
import { Role } from 'src/auth/constants/roles.enum';
import { FindUsersQueryDto } from './dto/find-users.query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  async updateUserRole(userId: string, roleId: string) {
    // Get user context (the person performing the action)
    const context = this.requestContext.getContext();

    // Create a method-specific logger
    const log = this.logger.child({ method: 'updateUserRole' });

    log.info('Updating user role', {
      targetUserId: userId,
      newRoleId: roleId,
    });

    try {
      // First, get the current role for logging purposes
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
        },
      });

      if (!currentUser) {
        log.warn('User not found', { targetUserId: userId });
        throw new NotFoundException('User not found');
      }

      // Get the new role name for better logging
      const newRole = await this.prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!newRole) {
        log.warn('Role not found', { roleId });
        throw new NotFoundException('Role not found');
      }

      if (
        context.roleId !== Role.SUPER_ADMIN &&
        newRole.name === Role.SUPER_ADMIN
      ) {
        log.warn(
          'Permission denied: Non-SUPER_ADMIN attempted to assign SUPER_ADMIN role',
          {
            actorRoleId: context.roleId,
            actorUserId: context.userId,
            targetUserId: userId,
            attemptedRoleId: roleId,
          },
        );
        throw new ForbiddenException(
          'Only SUPER_ADMIN can assign the SUPER_ADMIN role.',
        );
      }

      if (currentUser.roleId === roleId) {
        log.info('Role update skipped: User already has the specified role', {
          userId: userId,
          roleId: roleId,
          roleName: newRole.name,
        });
        throw new BadRequestException('User already has the specified role.');
      }

      // Update the user's role
      const updatedUser = await this.prisma.user.update({
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

      // Create an audit log with detailed information
      this.logger.auditLog('USER_ROLE_CHANGE', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          target_user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
          role_change: {
            from: {
              id: currentUser.roleId,
              name: currentUser.role?.name,
            },
            to: {
              id: updatedUser.roleId,
              name: updatedUser.role?.name,
            },
          },
        },
      });

      // Also log standard info
      log.info('User role updated successfully', {
        updatedUserId: updatedUser.id,
        updatedEmail: updatedUser.email,
        previousRole: currentUser.role?.name,
        newRole: updatedUser.role?.name,
      });

      return updatedUser;
    } catch (err: unknown) {
      // If it's already a NestJS exception, just rethrow it
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      let message = 'Unknown error';
      let code: string | undefined;

      if (err instanceof Error) message = err.message;
      if (typeof err === 'object' && err !== null && 'code' in err) {
        code = String((err as { code?: string }).code);
      }

      log.error('Error updating user role', {
        message,
        code,
        targetUserId: userId,
        attemptedRoleId: roleId,
      });

      // Handle specific Prisma error
      if (code === 'P2025') {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to update user role');
    }
  }

  async deleteUser(userId: string): Promise<SafeUser> {
    const context = this.requestContext.getContext();
    const log = this.logger.child({ method: 'deleteUser' });

    log.info('Attempting to delete user', { targetUserId: userId });

    try {
      // First, get the user to be deleted
      const userToDelete = await this.prisma.user.findUnique({
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

      if (!userToDelete) {
        log.warn('User deletion failed: User not found', {
          targetUserId: userId,
        });
        throw new NotFoundException('User not found');
      }

      // Check if trying to delete oneself
      if (context.userId === userId) {
        log.warn('User deletion failed: Attempted to delete own account', {
          userId: context.userId,
        });
        throw new ForbiddenException('You cannot delete your own account');
      }

      if (
        userToDelete.roleId === Role.SUPER_ADMIN &&
        context.roleId !== Role.SUPER_ADMIN
      ) {
        log.warn(
          'User deletion failed: Insufficient permissions to delete SUPER_ADMIN',
          {
            actorRoleId: context.roleId,
            targetUserRoleId: userToDelete.roleId,
          },
        );
        throw new ForbiddenException(
          'Only SUPER_ADMIN users can delete other SUPER_ADMIN users',
        );
      }

      // Now perform the deletion
      const deletedUser = await this.prisma.user.delete({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          createdAt: true,
        },
      });

      // Create audit log
      this.logger.auditLog('USER_DELETED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          deleted_user: {
            id: deletedUser.id,
            email: deletedUser.email,
            name: deletedUser.name,
            role: {
              id: deletedUser.roleId,
              name: userToDelete.role?.name,
            },
            created_at: deletedUser.createdAt.toISOString(),
          },
        },
      });

      log.info('User deleted successfully', {
        deletedUserId: deletedUser.id,
        deletedUserEmail: deletedUser.email,
      });

      return deletedUser;
    } catch (err) {
      // If it's already a NestJS exception, just log it and rethrow
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }

      // Handle specific Prisma errors
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as any).code === 'P2025'
      ) {
        log.warn('User deletion failed: User not found', {
          targetUserId: userId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw new NotFoundException('User not found');
      }

      log.error('Error deleting user', {
        error: err instanceof Error ? err.message : 'Unknown error',
        targetUserId: userId,
      });

      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async findAllUsers(query: FindUsersQueryDto): Promise<{
    data: SafeUser[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const log = this.logger.child({ method: 'findAllUsers' });

    const { page = 1, limit = 10, roleId, search } = query;
    const skip = (page - 1) * limit;

    log.info('Fetching users with filters', { page, limit, roleId, search });

    try {
      // Build where conditions for filtering
      const where: Prisma.UserWhereInput = {};

      if (roleId) {
        where.roleId = roleId;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination metadata
      const total = await this.prisma.user.count({ where });

      // Get users with pagination and filtering
      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: { select: { name: true } },
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Most recent users first
      });

      // Calculate total pages
      const pages = Math.ceil(total / limit);

      log.info(
        `Successfully retrieved ${users.length} users (page ${page} of ${pages}, total: ${total})`,
      );

      return {
        data: users,
        meta: {
          total,
          page,
          limit,
          pages,
        },
      };
    } catch (err) {
      log.error('Error fetching users', {
        error: err instanceof Error ? err.message : 'Unknown error',
        query,
      });

      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findUserById(userId: string): Promise<SafeUser> {
    const log = this.logger.child({ method: 'findUserById' });

    log.info('Fetching user by ID', { userId });

    try {
      const user = await this.prisma.user.findUnique({
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

      if (!user) {
        log.warn('User not found', { userId });
        throw new NotFoundException('User not found');
      }

      log.info('User retrieved successfully', { userId });

      return user;
    } catch (err) {
      // If it's already a NestJS exception, just rethrow it
      if (err instanceof NotFoundException) {
        throw err;
      }

      log.error('Error fetching user', {
        error: err instanceof Error ? err.message : 'Unknown error',
        userId,
      });

      throw new InternalServerErrorException('Failed to fetch user');
    }
  }
}
