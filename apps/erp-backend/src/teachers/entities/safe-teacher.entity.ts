import { ApiProperty } from '@nestjs/swagger';

export class SafeTeacherEntity {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'TCH001' })
  employeeCode: string;

  @ApiProperty({ example: 'Senior Mathematics Teacher', nullable: true })
  designation: string | null;

  @ApiProperty({ example: ['Mathematics', 'Science'] })
  departments: string[];

  @ApiProperty({ example: ['Algebra', 'Geometry'] })
  subjects: string[];

  @ApiProperty({ example: '2020-08-15T00:00:00.000Z', nullable: true })
  joinedOn: string | null;

  @ApiProperty({ example: null, nullable: true })
  leftOn: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'uuid-string' })
  userId: string;

  @ApiProperty({ example: 'uuid-string' })
  institutionId: string;

  @ApiProperty({ example: 'uuid-string' })
  academicYearId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ required: false })
  user?: {
    name: string;
    email: string;
  };

  @ApiProperty({
    type: () => [Object],
    description: 'List of sections taught by the teacher',
    example: [
      {
        id: 'sec-uuid',
        name: 'A',
        class: {
          id: 'class-uuid',
          name: 'Grade 6',
        },
      },
    ],
    required: false,
  })
  sections?: {
    id: string;
    name: string;
    class: {
      id: string;
      name: string;
    };
  }[];
}
