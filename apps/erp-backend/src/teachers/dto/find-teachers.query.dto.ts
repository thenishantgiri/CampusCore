import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FindTeachersQueryDto {
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
    description:
      'Search teachers by employee code, designation, name, or email',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter teachers by department',
    required: false,
    example: 'Mathematics',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'Filter teachers by active status',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter teachers who joined after this date (inclusive)',
    required: false,
    example: '2020-01-01',
  })
  @IsOptional()
  @IsDateString()
  joinedOnStart?: string;

  @ApiProperty({
    description: 'Filter teachers who joined before this date (inclusive)',
    required: false,
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  joinedOnEnd?: string;

  @ApiProperty({
    description: 'Filter teachers by institution ID',
    required: false,
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiProperty({
    description: 'Filter teachers by academic year ID',
    required: false,
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
