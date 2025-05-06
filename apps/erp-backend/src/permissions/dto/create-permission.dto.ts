import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'The unique key for the permission',
    example: 'fees:refund',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  key: string;

  @ApiProperty({
    description: 'Human-readable label for the permission',
    example: 'Refund Fees',
  })
  @IsString()
  label: string;
}
