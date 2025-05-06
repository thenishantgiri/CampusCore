import { ApiProperty } from '@nestjs/swagger';
import { SafeUserEntity } from '../entities/safe-user.entity';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User information' })
  user: SafeUserEntity;
}
