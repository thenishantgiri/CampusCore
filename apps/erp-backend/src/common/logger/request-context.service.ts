import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SafeUser } from 'src/auth/types/safe-user.interface';

interface RequestContext {
  userId: string | null;
  email: string | null;
  roleId: string | null;
}

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getContext(): RequestContext {
    const user = this.request.user as SafeUser | undefined;

    return {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      roleId: user?.roleId ?? null,
    };
  }
}
