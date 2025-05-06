import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestContextModule } from 'src/common/logger/request-context.module';
import { LoggerModule } from 'src/common/logger/logger.module';

@Module({
  imports: [PrismaModule, RequestContextModule, LoggerModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
