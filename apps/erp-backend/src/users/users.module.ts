import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from 'src/common/logger/logger.module';
import { RequestContextModule } from 'src/common/logger/request-context.module';

@Module({
  imports: [PrismaModule, LoggerModule, RequestContextModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
