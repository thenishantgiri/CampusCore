import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Partial<Reflector>;
  let context: Partial<ExecutionContext>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as Reflector);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ user: { roleId: 'role-admin' } }),
      }),
    } as any;
  });

  it('allows when no roles metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('allows when user has required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['role-admin']);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('denies when user lacks required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'role-super-admin',
    ]);
    expect(guard.canActivate(context as ExecutionContext)).toBe(false);
  });
});
