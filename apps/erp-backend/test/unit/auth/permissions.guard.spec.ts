import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Partial<Reflector>;
  let prisma: any;
  let context: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { role: { findUnique: jest.fn() } };
    guard = new PermissionsGuard(reflector as Reflector, prisma as any);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    };
  });

  it('allows when no permissions metadata', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(guard.canActivate(context as ExecutionContext)).resolves.toBe(
      true,
    );
  });

  it('allows when permissions metadata is empty', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
    await expect(guard.canActivate(context as ExecutionContext)).resolves.toBe(
      true,
    );
  });

  it('throws if no user in request', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['perm']);
    context.switchToHttp.mockReturnValue({ getRequest: () => ({}) });
    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws if role lookup fails', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['perm']);
    const user = { id: '1', roleId: 'role1' };
    context.switchToHttp.mockReturnValue({ getRequest: () => ({ user }) });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws if missing required permissions', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['permNeeded']);
    const user = { id: '1', roleId: 'role1' };
    context.switchToHttp.mockReturnValue({ getRequest: () => ({ user }) });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: 'role1',
      permissions: [{ key: 'otherPerm' }],
    });
    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows when all permissions present', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'perm1',
      'perm2',
    ]);
    const user = { id: '1', roleId: 'role1' };
    context.switchToHttp.mockReturnValue({ getRequest: () => ({ user }) });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: 'role1',
      permissions: [{ key: 'perm1' }, { key: 'perm2' }],
    });
    await expect(guard.canActivate(context as ExecutionContext)).resolves.toBe(
      true,
    );
  });
});
