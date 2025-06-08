import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { LoggerModule } from 'src/common/logger/logger.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  controllers: [ClassController],
  providers: [ClassService, PrismaService],
})
export class ClassModule {}
