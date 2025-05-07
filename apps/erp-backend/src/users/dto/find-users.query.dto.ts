import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FindUsersQueryDto {
  @ApiProperty({
    description: 'Page number (1-based indexing)',
    required: false,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter users by role ID',
    required: false,
    example: 'role-admin',
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'Search users by name or email',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
