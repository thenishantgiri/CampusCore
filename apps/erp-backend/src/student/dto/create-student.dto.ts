import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class EmergencyContactDto {
  @IsString() name: string;
  @IsString() relation: string;
  @IsString() phone: string;
}

export class CreateStudentDto {
  @IsUUID()
  userId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  @ArrayMinSize(1)
  emergencyContacts: EmergencyContactDto[];
}
