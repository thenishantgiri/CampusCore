import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleType } from 'generated/prisma';

export class CreateRoleDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType = RoleType.CUSTOM;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
