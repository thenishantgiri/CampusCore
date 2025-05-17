import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { RequestContextModule } from './request-context.module';
import { RequestContextService } from './request-context.service';

@Module({
  imports: [RequestContextModule],
  providers: [LoggerService, RequestContextService],
  exports: [LoggerService, RequestContextService],
})
export class LoggerModule {}
