import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Permission, Prisma, Role } from 'generated/prisma';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // POST /roles
  async create(dto: CreateRoleDto): Promise<Role> {
    const permissionRecords: Permission[] =
      await this.prisma.permission.findMany({
        where: {
          key: { in: dto.permissions },
        },
      });

    const permissionIds: { id: string }[] = permissionRecords.map((p) => ({
      id: p.id,
    }));

    return this.prisma.role.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'CUSTOM',
        permissions: {
          connect: permissionIds,
        },
      },
    });
  }

  // PATCH /roles/:id
  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const { permissions, ...rest } = dto;

    const data: Prisma.RoleUpdateInput = {
      ...rest,
    };

    if (permissions) {
      const permissionRecords: Permission[] =
        await this.prisma.permission.findMany({
          where: {
            key: { in: permissions },
          },
        });

      const permissionIds = permissionRecords.map((p) => ({ id: p.id }));

      data.permissions = {
        set: permissionIds,
      };
    }

    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  // GET /roles
  findAll(): Promise<Role[]> {
    return this.prisma.role.findMany();
  }
}
