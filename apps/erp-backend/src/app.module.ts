import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { RolesModule } from './roles/roles.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RequestContextModule } from './common/logger/request-context.module';
import { LoggerModule } from './common/logger/logger.module';
import { StudentModule } from './student/student.module';
import { TeacherModule } from './teachers/teacher.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';
import { SubjectModule } from './subject/subject.module';
import { CourseModule } from './course/course.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    PrismaModule,
    UsersModule,
    PermissionsModule,
    RequestContextModule,
    LoggerModule,
    StudentModule,
    TeacherModule,
    ClassModule,
    SectionModule,
    SubjectModule,
    CourseModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, PrismaService],
})
export class AppModule {}
