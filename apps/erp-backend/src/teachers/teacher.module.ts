import { Module } from '@nestjs/common';
import { TeacherController } from './teachers.controller';
import { TeacherService } from './teachers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
