import {
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
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : undefined;

    log.error(`Error in ${operation}`, {
      message,
      code,
      ...(roleId ? { roleId } : {}),
    });

    if (code === 'P2025') {
      throw new NotFoundException('Role not found');
    }

    throw new InternalServerErrorException(`Failed to ${operation} role`);
  }
}
