import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Computer Networks' })
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'CSE301' })
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Covers OSI model, routing, TCP/IP stack',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiProperty({ example: 'uuid-of-institution' })
  @IsUUID()
  institutionId: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({
    example: ['uuid-of-teacher'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  teacherIds?: string[];

  @ApiProperty({
    example: ['uuid-of-subject'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  subjectIds?: string[];
}
