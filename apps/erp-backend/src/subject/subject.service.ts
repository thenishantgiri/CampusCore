import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class SubjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly context: RequestContextService,
  ) {}

  async create(dto: CreateSubjectDto) {
    try {
      const { courseIds, teacherIds, ...rest } = dto;
      const subject = await this.prisma.subject.create({
        data: {
          ...rest,
          courses: courseIds?.length
            ? {
                connect: courseIds.map((id) => ({ id })),
              }
            : undefined,
          teachers: teacherIds?.length
            ? {
                connect: teacherIds.map((id) => ({ id })),
              }
            : undefined,
        },
      });
      this.logger.info('Subject created', {
        subjectId: subject.id,
        createdBy: this.context.getContext().email,
      });
      return subject;
    } catch (error) {
      this.logger.error('Failed to create subject', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.subject.findMany({
        include: {
          institution: true,
          academicYear: true,
          class: true,
          teachers: true,
          courses: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch subjects', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: { id },
        include: {
          institution: true,
          academicYear: true,
          class: true,
          teachers: true,
          courses: true,
        },
      });
      if (!subject) throw new NotFoundException('Subject not found');
      return subject;
    } catch (error) {
      this.logger.error(`Failed to fetch subject with id ${id}`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdateSubjectDto) {
    try {
      const subject = await this.prisma.subject.findUnique({ where: { id } });
      if (!subject) throw new NotFoundException('Subject not found');

      const { courseIds, teacherIds, ...rest } = dto;
      const updated = await this.prisma.subject.update({
        where: { id },
        data: {
          ...rest,
          ...(courseIds?.length && {
            courses: {
              set: courseIds.map((id) => ({ id })),
            },
          }),
          ...(teacherIds?.length && {
            teachers: {
              set: teacherIds.map((id) => ({ id })),
            },
          }),
        },
      });

      this.logger.info('Subject updated', {
        subjectId: id,
        updatedBy: this.context.getContext().email,
      });
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update subject with id ${id}`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const subject = await this.prisma.subject.findUnique({ where: { id } });
      if (!subject) throw new NotFoundException('Subject not found');

      await this.prisma.subject.delete({ where: { id } });

      this.logger.info('Subject deleted', {
        subjectId: id,
        deletedBy: this.context.getContext().email,
      });

      return { message: 'Subject deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete subject with id ${id}`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
