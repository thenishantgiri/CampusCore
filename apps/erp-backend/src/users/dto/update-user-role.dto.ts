import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'The ID of the role to assign to the user',
    example: 'role-finance-admin',
  })
  @IsString()
  roleId: string;
}
