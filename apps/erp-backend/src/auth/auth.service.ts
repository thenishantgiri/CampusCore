import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.interface';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const { email, password, name, roleId } = dto;
    const log = this.logger.child({ method: 'register' });

    log.info('Starting user registration', { email });

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      log.warn('Registration failed: User with email already exists', {
        email,
      });
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roleId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    // Create detailed audit log
    this.logger.auditLog('USER_REGISTERED', {
      actor: {
        id: null,
        email: null,
        role: null,
      },
      details: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          created_at: newUser.createdAt.toISOString(),
        },
        role: {
          id: newUser.roleId,
          name: newUser.role?.name,
        },
      },
    });

    log.info('User registered successfully', { userId: newUser.id });
    return newUser;
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    const { email, password } = dto;
    const log = this.logger.child({ method: 'login' });

    log.info('Attempting login', { email });

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } },
    });

    if (!user) {
      log.warn('Login failed: No user found with email', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      log.warn('Login failed: Incorrect password', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      createdAt: user.createdAt,
    };

    // Create detailed audit log
    this.logger.auditLog('USER_LOGGED_IN', {
      actor: {
        id: user.id,
        email: user.email,
        role: user.roleId,
      },
      details: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        role: {
          id: user.roleId,
          name: user.role?.name,
        },
        login_time: new Date().toISOString(),
        ip_address: null, // If you have access to request IP, add it here
      },
    });

    log.info('Login successful', {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role?.name,
    });

    return { accessToken, user: safeUser };
  }
}
