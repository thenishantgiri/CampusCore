import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/auth/constants/roles.enum';
import { SafeUser } from 'src/auth/types/safe-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUser: SafeUser = {
    id: '1',
    email: 'test@test.com',
    name: 'Test User',
    roleId: Role.ADMIN,
    createdAt: new Date(),
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockUser),
    login: jest
      .fn()
      .mockResolvedValue({ accessToken: 'token123', user: mockUser }),
  };

  const mockGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        roleId: Role.STUDENT,
      };

      await expect(controller.register(dto)).resolves.toEqual(mockUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login user and return token and user', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };

      await expect(controller.login(dto)).resolves.toEqual({
        accessToken: 'token123',
        user: mockUser,
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getProfile', () => {
    it('should return the current user', () => {
      expect(controller.getProfile(mockUser)).toEqual(mockUser);
    });
  });

  describe('testRBAC', () => {
    it('should return RBAC test message and user', () => {
      const result = controller.testRBAC(mockUser);
      expect(result).toEqual({ message: 'RBAC is working!', user: mockUser });
    });
  });
});
