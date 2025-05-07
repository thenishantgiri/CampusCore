import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../types/safe-user.interface';

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request: { user: SafeUser } = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
