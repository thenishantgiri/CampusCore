import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MATH101' })
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Algebra and Geometry', required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-of-institution' })
  @IsUUID()
  institutionId: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  classId: string;

  @ApiProperty({
    example: ['uuid-of-teacher'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  teacherIds?: string[];

  @ApiProperty({ example: ['uuid-of-course'], required: false, type: [String] })
  @IsOptional()
  @IsUUID('all', { each: true })
  courseIds?: string[];
}
