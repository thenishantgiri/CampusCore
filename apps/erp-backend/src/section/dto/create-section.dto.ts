import { ApiProperty } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  classId: string;

  @ApiProperty({ required: false })
  teacherId?: string;
}
