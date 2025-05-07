import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from 'src/common/logger/logger.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';

// Manual mock for bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let logger: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn() };
    logger = {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      warn: jest.fn(),
      auditLog: jest.fn(),
    };
    service = new AuthService(
      prisma,
      jwtService as JwtService,
      logger as LoggerService,
    );
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      roleId: 'role-student',
    };

    it('throws ConflictException if user exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Registration failed: User with email already exists',
        { email: dto.email },
      );
    });

    it('hashes password and creates user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      const newUser = {
        id: '1',
        email: dto.email,
        name: dto.name,
        roleId: dto.roleId,
        createdAt: new Date(),
        role: { name: 'Student' },
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const result = await service.register(dto);

      expect(bcrypt.hash as jest.Mock).toHaveBeenCalledWith(dto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          password: 'hashedPassword',
          name: dto.name,
          roleId: dto.roleId,
        },
        select: expect.anything(),
      });
      expect(logger.auditLog).toHaveBeenCalledWith(
        'USER_REGISTERED',
        expect.anything(),
      );
      expect(result).toEqual(newUser);
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('throws UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Login failed: No user found with email',
        { email: dto.email },
      );
    });

    it('throws UnauthorizedException if incorrect password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        password: 'wrongHash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Login failed: Incorrect password',
        { email: dto.email },
      );
    });

    it('returns token and user on success', async () => {
      const now = new Date();
      const dbUser = {
        id: '1',
        email: dto.email,
        password: 'hashed',
        name: 'Test User',
        roleId: 'role-student',
        createdAt: now,
        role: { name: 'Student' },
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token123');

      const { accessToken, user } = await service.login(dto);

      expect(jwtService.sign as jest.Mock).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });
      expect(logger.auditLog).toHaveBeenCalledWith(
        'USER_LOGGED_IN',
        expect.anything(),
      );
      expect(accessToken).toBe('token123');
      expect(user.id).toBe('1');
      expect(user.email).toBe(dto.email);
    });
  });
});
