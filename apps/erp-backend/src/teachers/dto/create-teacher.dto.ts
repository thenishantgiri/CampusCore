import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateTeacherDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsUUID()
  institutionId: string;

  @IsUUID()
  academicYearId: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsArray()
  @IsOptional()
  departments?: string[];

  @IsArray()
  @IsOptional()
  subjects?: string[];

  @IsArray()
  @IsOptional()
  assignedClasses?: string[];

  @IsDateString()
  @IsOptional()
  joinedOn?: string;

  @IsDateString()
  @IsOptional()
  leftOn?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
