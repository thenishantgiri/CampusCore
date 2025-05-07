import { ApiProperty } from '@nestjs/swagger';

export class PermissionEntity {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Unique permission identifier',
  })
  id: string;

  @ApiProperty({
    example: 'students:read',
    description: 'Permission key used for authorization checks',
  })
  key: string;

  @ApiProperty({
    example: 'View Students',
    description: 'Human-readable permission label',
  })
  label: string;

  @ApiProperty({
    example: '2025-05-06T04:21:39.000Z',
    description: 'Permission creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-05-06T04:21:39.000Z',
    description: 'Permission last update timestamp',
  })
  updatedAt: Date;
}
