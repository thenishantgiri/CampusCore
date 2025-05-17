import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FindStudentsQueryDto {
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
    description: 'Search students by first name or last name',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter students by user ID',
    required: false,
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description:
      'Filter students with date of birth after this date (inclusive)',
    required: false,
    example: '2000-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirthStart?: string;

  @ApiProperty({
    description:
      'Filter students with date of birth before this date (inclusive)',
    required: false,
    example: '2010-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirthEnd?: string;
}
