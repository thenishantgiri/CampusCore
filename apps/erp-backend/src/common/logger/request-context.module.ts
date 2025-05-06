import { Module, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { RequestContextService } from './request-context.service';

@Module({
  providers: [
    {
      provide: RequestContextService,
      scope: Scope.REQUEST,
      useFactory: (request: Request) => new RequestContextService(request),
      inject: [REQUEST],
    },
  ],
  exports: [RequestContextService],
})
export class RequestContextModule {}
