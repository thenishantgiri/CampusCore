import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('returns user when handleRequest receives a user', () => {
    const user = { id: '1', email: 'a@b.com' };
    const result = guard.handleRequest(
      null,
      user,
      null,
      {} as ExecutionContext,
    );
    expect(result).toBe(user);
  });

  it('throws the original error if handleRequest receives an error', () => {
    expect(() =>
      guard.handleRequest(
        new Error('fail'),
        { id: '1' },
        null,
        {} as ExecutionContext,
      ),
    ).toThrowError('fail');
  });

  it('throws UnauthorizedException if handleRequest gets no user', () => {
    expect(() =>
      guard.handleRequest(
        null,
        null,
        { message: 'no auth' },
        {} as ExecutionContext,
      ),
    ).toThrow(UnauthorizedException);
  });
});
