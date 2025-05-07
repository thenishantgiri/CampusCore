import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Prisma, Role } from 'generated/prisma';
import { UpdateRoleDto } from './dto/update-role.dto';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { Logger } from 'pino';
import { generateRoleId } from 'src/common/utils/id-generators';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private requestContext: RequestContextService,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    // Get context for audit logging
    const context = this.requestContext.getContext();

    // Create a method-specific logger
    const log = this.logger.child({ method: 'createRole' });

    log.info('Creating role', { roleName: dto.name });

    const roleId = generateRoleId(dto.name);

    try {
      const permissionRecords = await this.prisma.permission.findMany({
        where: { key: { in: dto.permissions ?? [] } },
      });

      const permissionIds = permissionRecords.map((p) => ({ id: p.id }));

      const role = await this.prisma.role.create({
        data: {
          id: roleId,
          name: dto.name,
          type: dto.type ?? 'CUSTOM',
          permissions: { connect: permissionIds },
        },
      });

      // Create audit log
      this.logger.auditLog('ROLE_CREATED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          role: {
            id: role.id,
            name: role.name,
            type: role.type,
          },
          permissions: permissionRecords.map((p) => p.key),
        },
      });

      log.info('Role created successfully', {
        roleId: role.id,
        roleName: role.name,
        permissions: permissionRecords.map((p) => p.key),
      });

      return role;
    } catch (err: unknown) {
      this.handleError(log, 'create', err);
    }
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    // Get context for audit logging
    const context = this.requestContext.getContext();

    const log = this.logger.child({ method: 'updateRole' });

    log.info('Updating role', { roleId: id });

    try {
      // First, get current role data for audit log
      const currentRole = await this.prisma.role.findUnique({
        where: { id },
        include: { permissions: true },
      });

      if (!currentRole) {
        throw new NotFoundException('Role not found');
      }

      const { permissions, ...rest } = dto;
      const data: Prisma.RoleUpdateInput = { ...rest };

      let permissionRecords = [];
      if (permissions) {
        permissionRecords = await this.prisma.permission.findMany({
          where: { key: { in: permissions } },
        });

        const permissionIds = permissionRecords.map((p) => ({ id: p.id }));
        data.permissions = { set: permissionIds };
      }

      const updatedRole = await this.prisma.role.update({
        where: { id },
        data,
        include: { permissions: true },
      });

      // Create audit log with changes
      this.logger.auditLog('ROLE_UPDATED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          role: {
            id: updatedRole.id,
            name: updatedRole.name,
          },
          changes: {
            name:
              rest.name !== undefined
                ? {
                    from: currentRole.name,
                    to: updatedRole.name,
                  }
                : undefined,
            permissions: permissions
              ? {
                  from: currentRole.permissions.map((p) => p.key),
                  to: updatedRole.permissions.map((p) => p.key),
                }
              : undefined,
          },
        },
      });

      log.info('Role updated successfully', {
        roleId: updatedRole.id,
        roleName: updatedRole.name,
        permissionsUpdated: permissions ? true : false,
      });

      return updatedRole;
    } catch (err: unknown) {
      this.handleError(log, 'update', err, id);
    }
  }

  async delete(id: string): Promise<Role> {
    const context = this.requestContext.getContext();
    const log = this.logger.child({ method: 'deleteRole' });

    log.info('Attempting to delete role', { roleId: id });

    try {
      // First, check if the role exists
      const roleToDelete = await this.prisma.role.findUnique({
        where: { id },
        include: { users: { select: { id: true } } },
      });

      if (!roleToDelete) {
        log.warn('Role deletion failed: Role not found', { roleId: id });
        throw new NotFoundException('Role not found');
      }

      // Check if the role is assigned to any users
      if (roleToDelete.users.length > 0) {
        log.warn('Role deletion failed: Role is assigned to users', {
          roleId: id,
          userCount: roleToDelete.users.length,
        });
        throw new ConflictException(
          `Cannot delete role. It is assigned to ${roleToDelete.users.length} user(s).`,
        );
      }

      // Check if trying to delete a STATIC role
      if (roleToDelete.type === 'STATIC') {
        log.warn('Role deletion failed: Cannot delete STATIC role', {
          roleId: id,
          roleType: roleToDelete.type,
        });
        throw new ForbiddenException('STATIC roles cannot be deleted');
      }

      // Delete the role
      const deletedRole = await this.prisma.role.delete({
        where: { id },
      });

      // Create audit log
      this.logger.auditLog('ROLE_DELETED', {
        actor: {
          id: context.userId,
          email: context.email,
          role: context.roleId,
        },
        details: {
          role: {
            id: deletedRole.id,
            name: deletedRole.name,
          },
        },
      });

      log.info('Role deleted successfully', {
        roleId: deletedRole.id,
        roleName: deletedRole.name,
      });

      return deletedRole;
    } catch (err) {
      // If it's already a NestJS exception, just log it and rethrow
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }

      log.error('Error deleting role', {
        error: err instanceof Error ? err.message : 'Unknown error',
        roleId: id,
      });

      throw new InternalServerErrorException('Failed to delete role');
    }
  }

  async findAll(): Promise<Role[]> {
    const log = this.logger.child({ method: 'findAllRoles' });

    try {
      log.info('Fetching all roles');
      return await this.prisma.role.findMany();
    } catch (err: unknown) {
      this.handleError(log, 'findAll', err);
    }
  }

  private handleError(
    log: Logger,
    operation: string,
    err: unknown,
    roleId?: string,
  ): never {
    const message =
      err instanceof Error ? err.message : 'Unhandled exception occurred';

    // Check for Prisma error code - need to check for code property safely
    let code: string | undefined;
    if (err && typeof err === 'object' && 'code' in err) {
      code = String((err as any).code);
    }

    log.error(`Error in ${operation}`, {
      message,
      code,
      ...(roleId ? { roleId } : {}),
    });

    // Check for Prisma not found error
    if (code === 'P2025') {
      throw new NotFoundException('Role not found');
    }

    throw new InternalServerErrorException(`Failed to ${operation} role`);
  }
}
