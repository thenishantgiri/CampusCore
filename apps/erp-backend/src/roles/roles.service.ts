import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleType } from 'generated/prisma';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        type: dto.type ?? RoleType.CUSTOM,
        permissions: dto.permissions,
      },
    });
  }

  findAll() {
    return this.prisma.role.findMany();
  }
}
