import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../constants/roles.enum';

export const UserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Role | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const roleId = request.user?.roleId;

    return Object.values(Role).includes(roleId as Role)
      ? (roleId as Role)
      : undefined;
  },
);
