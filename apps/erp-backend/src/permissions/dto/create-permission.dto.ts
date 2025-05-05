import { IsString, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MinLength(3)
  key: string;

  @IsString()
  label: string;
}
