import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from 'src/common/logger/logger.module';
import { RequestContextModule } from 'src/common/logger/request-context.module';

@Module({
  imports: [PrismaModule, LoggerModule, RequestContextModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
