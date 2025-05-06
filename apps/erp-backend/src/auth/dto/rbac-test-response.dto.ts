import { ApiProperty } from '@nestjs/swagger';
import { SafeUserEntity } from '../entities/safe-user.entity';

export class RbacTestResponseDto {
  @ApiProperty({ example: 'RBAC is working!', description: 'Test message' })
  message: string;

  @ApiProperty({ description: 'User information' })
  user: SafeUserEntity;
}
