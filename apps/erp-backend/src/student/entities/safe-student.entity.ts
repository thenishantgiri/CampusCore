import { ApiProperty } from '@nestjs/swagger';

export class SafeStudentEntity {
  @ApiProperty({
    description: 'Unique identifier for the student',
    example: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
  })
  id: string;

  @ApiProperty({ description: 'First name of the student', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name of the student', example: 'Doe' })
  lastName: string;

  @ApiProperty({
    description: 'Date of birth (ISO string)',
    example: '2005-09-01T00:00:00.000Z',
  })
  dateOfBirth: string;

  @ApiProperty({
    description: 'URL to the student photo (nullable)',
    example: 'https://cdn.example.com/photos/john-doe.jpg',
    required: false,
  })
  photoUrl?: string;

  @ApiProperty({
    description: 'List of emergency contacts',
    example: [{ name: 'Jane Doe', relation: 'Mother', phone: '+1234567890' }],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        relation: { type: 'string' },
        phone: { type: 'string' },
      },
    },
  })
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;

  @ApiProperty({
    description: 'Section ID the student belongs to',
    example: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
  })
  sectionId: string;

  @ApiProperty({
    description: 'Associated user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  userId: string;
  @ApiProperty({
    description: 'Record creation timestamp (ISO string)',
    example: '2025-05-08T12:34:56.789Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Record last update timestamp (ISO string)',
    example: '2025-05-08T12:34:56.789Z',
  })
  updatedAt: string;
}
