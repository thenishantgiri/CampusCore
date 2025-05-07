import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleType } from 'generated/prisma';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Finance Admin Updated',
    minLength: 3,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({
    enum: RoleType,
    description: 'The type of role (STATIC or CUSTOM)',
    required: false,
  })
  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @ApiProperty({
    type: [String],
    description: 'Array of permission keys to assign to the role',
    example: ['users:read', 'roles:read', 'fees:pay'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
