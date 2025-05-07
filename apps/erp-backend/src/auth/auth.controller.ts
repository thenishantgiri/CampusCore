import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SafeUser } from './types/safe-user.interface';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from './constants/roles.enum';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permission } from './decorators/permission.decorator';
import { PERMISSIONS } from './constants/permissions';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RbacTestResponseDto } from './dto/rbac-test-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SafeUserEntity } from './entities/safe-user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.USERS.CREATE)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Register a new user (admin only)' })
  @ApiCreatedResponse({
    description: 'User has been successfully registered',
    type: SafeUserEntity,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires admin access and user:create permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth()
  @ApiBody({ type: RegisterDto })
  register(@Body() dto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'User login' })
  @ApiOkResponse({
    description: 'User successfully logged in',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'Current user profile',
    type: SafeUserEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth()
  getProfile(@GetUser() user: SafeUser): SafeUser {
    return user;
  }

  @Get('test-rbac')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'Test role-based access control' })
  @ApiOkResponse({
    description: 'RBAC test successful',
    type: RbacTestResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires admin access and users:read permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth()
  testRBAC(@GetUser() user: SafeUser) {
    return {
      message: 'RBAC is working!',
      user,
    };
  }
}
