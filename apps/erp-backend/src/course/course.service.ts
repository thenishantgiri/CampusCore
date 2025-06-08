import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly context: RequestContextService,
  ) {}

  async create(dto: CreateCourseDto) {
    const ctx = this.context.getContext();
    const { teacherIds, subjectIds, ...rest } = dto as any;

    const course = await this.prisma.course.create({
      data: {
        ...rest,
        ...(teacherIds?.length && {
          teachers: {
            connect: teacherIds.map((id: string) => ({ id })),
          },
        }),
        ...(subjectIds?.length && {
          subjects: {
            connect: subjectIds.map((id: string) => ({ id })),
          },
        }),
      },
    });

    this.logger.info('Course created', {
      courseId: course.id,
      createdBy: ctx.email,
    });

    return course;
  }

  async findAll() {
    return this.prisma.course.findMany({
      include: {
        institution: true,
        academicYear: true,
        teachers: true,
        subjects: true,
      },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        institution: true,
        academicYear: true,
        teachers: true,
        subjects: true,
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const ctx = this.context.getContext();
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    const { teacherIds, subjectIds, ...rest } = dto as any;

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...rest,
        ...(teacherIds?.length && {
          teachers: {
            set: teacherIds.map((id: string) => ({ id })),
          },
        }),
        ...(subjectIds?.length && {
          subjects: {
            set: subjectIds.map((id: string) => ({ id })),
          },
        }),
      },
    });

    this.logger.info('Course updated', {
      courseId: id,
      updatedBy: ctx.email,
    });

    return updated;
  }

  async remove(id: string) {
    const ctx = this.context.getContext();
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    await this.prisma.course.delete({ where: { id } });

    this.logger.info('Course deleted', {
      courseId: id,
      deletedBy: ctx.email,
    });

    return { message: 'Course deleted successfully' };
  }
}
