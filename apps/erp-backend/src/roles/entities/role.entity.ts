import { ApiProperty } from '@nestjs/swagger';
import { RoleType } from 'generated/prisma';
import { PermissionEntity } from '../../permissions/entities/permission.entity';

export class RoleEntity {
  @ApiProperty({
    example: 'role-finance-admin',
    description: 'Unique role identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Finance Admin',
    description: 'Human-readable role name',
  })
  name: string;

  @ApiProperty({
    enum: RoleType,
    example: 'CUSTOM',
    description: 'Role type (STATIC or CUSTOM)',
  })
  type: RoleType;

  @ApiProperty({
    type: [PermissionEntity],
    description: 'Permissions assigned to this role',
  })
  permissions: PermissionEntity[];

  @ApiProperty({
    example: '2025-05-06T04:21:39.000Z',
    description: 'Role creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-05-06T04:21:39.000Z',
    description: 'Role last update timestamp',
  })
  updatedAt: Date;
}
