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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  register(@Body() dto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: SafeUser): SafeUser {
    return user;
  }
}
