import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { LoggerModule } from 'src/common/logger/logger.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [LoggerModule, PrismaModule, AuthModule],
  providers: [CourseService],
  controllers: [CourseController],
})
export class CourseModule {}
