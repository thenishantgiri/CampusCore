import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleType } from 'generated/prisma';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Finance Admin',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    enum: RoleType,
    default: 'CUSTOM',
    description: 'The type of role (STATIC or CUSTOM)',
    required: false,
  })
  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @ApiProperty({
    type: [String],
    description: 'Array of permission keys to assign to the role',
    example: ['users:read', 'roles:read', 'fees:pay'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
