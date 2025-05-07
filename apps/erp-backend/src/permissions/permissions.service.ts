import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { Permission, Prisma } from 'generated/prisma';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private requestContext: RequestContextService,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const log = this.logger.child({ method: 'createPermission' });
    const context = this.requestContext.getContext();

    log.info('Creating permission', { key: dto.key, label: dto.label });

    try {
      // Check if permission with same key already exists
      const existingPermission = await this.prisma.permission.findUnique({
        where: { key: dto.key },
      });

      if (existingPermission) {
        log.warn('Permission creation failed: Key already exists', {
          key: dto.key,
        });
        throw new ConflictException(
          `Permission with key "${dto.key}" already exists`,
        );
      }

      const permission = await this.prisma.permission.create({
        data: {
          key: dto.key,
          label: dto.label,
        },
      });

      // Create audit log
      this.logger.auditLog('PERMISSION_CREATED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          permission: {
            id: permission.id,
            key: permission.key,
            label: permission.label,
          },
        },
      });

      log.info('Permission created successfully', {
        permissionId: permission.id,
        key: permission.key,
      });

      return permission;
    } catch (err) {
      // Handle specific Prisma errors
      if (err instanceof Error && 'code' in err && err.code === 'P2002') {
        // Unique constraint violation
        log.warn('Permission creation failed: Key already exists', {
          key: dto.key,
          error: err.message,
        });
        throw new ConflictException(
          `Permission with key "${dto.key}" already exists`,
        );
      }

      // If it's already a NestJS exception, just log it and rethrow
      if (err instanceof ConflictException) {
        throw err;
      }

      // Log any other errors
      log.error('Error creating permission', {
        error: err instanceof Error ? err.message : 'Unknown error',
        key: dto.key,
        label: dto.label,
      });

      throw new InternalServerErrorException('Failed to create permission');
    }
  }

  async findAll(): Promise<Permission[]> {
    const log = this.logger.child({ method: 'findAllPermissions' });
    const context = this.requestContext.getContext();

    try {
      log.info('Fetching all permissions');

      const permissions = await this.prisma.permission.findMany();

      log.info('Permissions retrieved successfully', {
        count: permissions.length,
        actor: {
          id: context.userId,
          email: context.email,
        },
      });

      return permissions;
    } catch (err) {
      log.error('Error fetching permissions', {
        error: err instanceof Error ? err.message : 'Unknown error',
        actor: {
          id: context.userId,
          email: context.email,
        },
      });

      throw new InternalServerErrorException('Failed to fetch permissions');
    }
  }

  async deletePermission(id: string): Promise<Permission> {
    const log = this.logger.child({ method: 'deletePermission' });
    const context = this.requestContext.getContext();

    log.info('Deleting permission', { permissionId: id });

    try {
      // Check if permission exists
      const existingPermission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!existingPermission) {
        log.warn('Permission deletion failed: Permission not found', {
          permissionId: id,
        });
        throw new NotFoundException(`Permission with ID "${id}" not found`);
      }

      // Check if permission is used by any role
      const rolePermissions = await this.prisma.role.findMany({
        where: {
          permissions: {
            some: {
              id,
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (rolePermissions.length > 0) {
        log.warn('Permission deletion failed: Permission is used by roles', {
          permissionId: id,
          roles: rolePermissions.map((r) => ({ id: r.id, name: r.name })),
        });

        throw new ConflictException(
          `Cannot delete permission. It is used by ${rolePermissions.length} role(s).`,
        );
      }

      const deletedPermission = await this.prisma.permission.delete({
        where: { id },
      });

      // Create audit log
      this.logger.auditLog('PERMISSION_DELETED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          permission: {
            id: deletedPermission.id,
            key: deletedPermission.key,
            label: deletedPermission.label,
          },
        },
      });

      log.info('Permission deleted successfully', {
        permissionId: deletedPermission.id,
        key: deletedPermission.key,
      });

      return deletedPermission;
    } catch (err) {
      // If it's already a NestJS exception, just log it and rethrow
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException
      ) {
        throw err;
      }

      log.error('Error deleting permission', {
        error: err instanceof Error ? err.message : 'Unknown error',
        permissionId: id,
        actor: {
          id: context.userId,
          email: context.email,
        },
      });

      throw new InternalServerErrorException('Failed to delete permission');
    }
  }
}
