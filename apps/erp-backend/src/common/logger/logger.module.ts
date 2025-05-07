import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { RequestContextModule } from './request-context.module';

@Module({
  imports: [RequestContextModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
