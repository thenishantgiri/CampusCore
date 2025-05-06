import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { SafeUser } from 'src/auth/types/safe-user.interface';
import { Prisma } from 'generated/prisma';
import { Role } from 'src/auth/constants/roles.enum';

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
        throw new NotFoundException('User not found');
      }

      // Get the new role name for better logging
      const newRole = await this.prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!newRole) {
        throw new NotFoundException('Role not found');
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

      // Use string comparison instead of enum comparison
      const superAdminRoleId = Role.SUPER_ADMIN.toString();
      const isSuperAdminTarget = userToDelete.roleId === superAdminRoleId;
      const isSuperAdminActor = context.roleId === superAdminRoleId;

      if (isSuperAdminTarget && !isSuperAdminActor) {
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
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          log.warn('User deletion failed: User not found', {
            targetUserId: userId,
            error: err.message,
          });
          throw new NotFoundException('User not found');
        }
      }

      log.error('Error deleting user', {
        error: err instanceof Error ? err.message : 'Unknown error',
        targetUserId: userId,
      });

      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
