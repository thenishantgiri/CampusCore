import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty()
  institutionId: string;

  @ApiProperty()
  academicYearId: string;
}
