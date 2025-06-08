import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { Role } from 'src/auth/constants/roles.enum';
import { Prisma } from 'generated/prisma';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FindTeachersQueryDto } from './dto/find-teachers.query.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  async createTeacher(dto: CreateTeacherDto) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'createTeacher' });

    log.info('Creating teacher', { actor: ctx.userId, email: ctx.email, dto });
    try {
      const teacher = await this.prisma.teacher.create({
        data: {
          user: { connect: { id: dto.userId } },
          employeeCode: dto.employeeCode,
          institution: { connect: { id: dto.institutionId } },
          academicYear: { connect: { id: dto.academicYearId } },
          designation: dto.designation ?? null,
          subjects: dto.subjects
            ? { connect: dto.subjects.map((id) => ({ id })) }
            : undefined,
          joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : null,
          leftOn: dto.leftOn ? new Date(dto.leftOn) : null,
          isActive: dto.isActive ?? true,
        },
      });
      log.info('Teacher created successfully', { teacherId: teacher.id });
      return teacher;
    } catch (err: any) {
      log.error('Error creating teacher', {
        error: err instanceof Error ? err.message : err,
        code: err?.code,
        name: err?.name,
      });

      if (err?.code === 'P2002') {
        log.warn('Duplicate employee code detected', {
          actor: ctx.userId,
          email: ctx.email,
          dto,
        });
        throw new BadRequestException(
          'A teacher with this employee code already exists.',
        );
      }
      if (err?.code === 'P2003') {
        log.warn(
          'Referenced user, institution, or academic year does not exist',
          { actor: ctx.userId, email: ctx.email, dto },
        );
        throw new BadRequestException(
          'Referenced user, institution, or academic year does not exist.',
        );
      }
      throw new InternalServerErrorException('Failed to create teacher');
    }
  }

  async getAllTeachers(query: FindTeachersQueryDto) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'getAllTeachers' });

    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      joinedOnStart,
      joinedOnEnd,
      institutionId,
      academicYearId,
    } = query;
    const skip = (page - 1) * limit;

    log.info('Fetching all teachers with filters', {
      actor: ctx.userId,
      email: ctx.email,
      page,
      limit,
      search,
      isActive,
      joinedOnRange:
        joinedOnStart && joinedOnEnd
          ? `${joinedOnStart} to ${joinedOnEnd}`
          : undefined,
      institutionId,
      academicYearId,
    });

    try {
      const where: Prisma.TeacherWhereInput = {};

      if (search) {
        where.OR = [
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (institutionId) {
        where.institutionId = institutionId;
      }

      if (academicYearId) {
        where.academicYearId = academicYearId;
      }

      if (joinedOnStart && joinedOnEnd) {
        where.joinedOn = {
          gte: new Date(joinedOnStart),
          lte: new Date(joinedOnEnd),
        };
      } else if (joinedOnStart) {
        where.joinedOn = { gte: new Date(joinedOnStart) };
      } else if (joinedOnEnd) {
        where.joinedOn = { lte: new Date(joinedOnEnd) };
      }

      const total = await this.prisma.teacher.count({ where });

      const teachers = await this.prisma.teacher.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              sections: {
                where: { deletedAt: null },
                include: {
                  class: true,
                },
              },
            },
          },
          subjects: { select: { id: true, name: true, code: true } },
          courses: { select: { id: true, title: true, code: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const pages = Math.max(1, Math.ceil(total / limit));

      log.info(
        `Successfully retrieved ${teachers.length} teachers (page ${page} of ${pages}, total: ${total})`,
      );

      // Map to SafeTeacherEntity format
      const safeTeachers = teachers.map((teacher) => ({
        id: teacher.id,
        employeeCode: teacher.employeeCode,
        designation: teacher.designation,
        subjects:
          teacher.subjects?.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })) ?? [],
        courses:
          teacher.courses?.map((c) => ({
            id: c.id,
            title: c.title,
            code: c.code,
          })) ?? [],
        joinedOn: teacher.joinedOn?.toISOString() || null,
        leftOn: teacher.leftOn?.toISOString() || null,
        isActive: teacher.isActive,
        userId: teacher.userId,
        institutionId: teacher.institutionId,
        academicYearId: teacher.academicYearId,
        createdAt: teacher.createdAt.toISOString(),
        updatedAt: teacher.updatedAt.toISOString(),
        user: teacher.user
          ? {
              name: teacher.user.name,
              email: teacher.user.email,
            }
          : undefined,
        sections:
          teacher.user?.sections?.map((section) => ({
            id: section.id,
            name: section.name,
            class: {
              id: section.class.id,
              name: section.class.name,
            },
          })) ?? [],
      }));

      return {
        data: safeTeachers,
        meta: {
          total,
          page,
          limit,
          pages,
        },
      };
    } catch (err: any) {
      log.error('Error fetching teachers', {
        error: err instanceof Error ? err.message : err,
        query,
      });
      throw new InternalServerErrorException('Failed to fetch teachers');
    }
  }

  async getTeacherById(id: string, userId?: string, userRole?: Role) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'getTeacherById' });

    log.info('Fetching teacher by ID', {
      actor: ctx.userId,
      email: ctx.email,
      teacherId: id,
    });
    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              sections: {
                where: { deletedAt: null },
                include: {
                  class: true,
                },
              },
            },
          },
          subjects: { select: { id: true, name: true, code: true } },
          courses: { select: { id: true, title: true, code: true } },
        },
      });

      if (!teacher) {
        log.warn('Teacher not found', { teacherId: id });
        throw new NotFoundException('Teacher not found');
      }

      // Access control: Teacher role can only access their own profile
      if (userRole === Role.TEACHER && teacher.userId !== userId) {
        log.warn('Teacher attempted to access another teacher profile', {
          actorId: userId,
          teacherId: id,
          teacherUserId: teacher.userId,
        });
        throw new ForbiddenException(
          'You can only access your own teacher profile',
        );
      }

      log.info('Teacher retrieved', { teacherId: id });

      // Map to SafeTeacherEntity format
      return {
        id: teacher.id,
        employeeCode: teacher.employeeCode,
        designation: teacher.designation,
        subjects:
          teacher.subjects?.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })) ?? [],
        courses:
          teacher.courses?.map((c) => ({
            id: c.id,
            title: c.title,
            code: c.code,
          })) ?? [],
        joinedOn: teacher.joinedOn?.toISOString() || null,
        leftOn: teacher.leftOn?.toISOString() || null,
        isActive: teacher.isActive,
        userId: teacher.userId,
        institutionId: teacher.institutionId,
        academicYearId: teacher.academicYearId,
        createdAt: teacher.createdAt.toISOString(),
        updatedAt: teacher.updatedAt.toISOString(),
        user: teacher.user
          ? {
              name: teacher.user.name,
              email: teacher.user.email,
            }
          : undefined,
        sections:
          teacher.user?.sections?.map((section) => ({
            id: section.id,
            name: section.name,
            class: {
              id: section.class.id,
              name: section.class.name,
            },
          })) ?? [],
      };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException)
        throw err;
      log.error('Error fetching teacher', {
        error: err instanceof Error ? err.message : err,
      });
      throw new InternalServerErrorException('Failed to fetch teacher');
    }
  }

  async updateTeacher(
    id: string,
    dto: UpdateTeacherDto,
    userId?: string,
    userRole?: Role,
  ) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'updateTeacher' });

    log.info('Updating teacher', {
      actor: ctx.userId,
      email: ctx.email,
      teacherId: id,
      dto,
    });
    try {
      // Ensure exists first and reuse
      const teacher = await this.getTeacherById(id, userId, userRole);

      const updated = await this.prisma.teacher.update({
        where: { id },
        data: {
          ...(dto.employeeCode !== undefined && {
            employeeCode: dto.employeeCode,
          }),
          ...(dto.designation !== undefined && {
            designation: dto.designation,
          }),
          ...(dto.subjects !== undefined && {
            subjects: {
              set: dto.subjects.map((id) => ({ id })),
            },
          }),
          ...(dto.joinedOn !== undefined && {
            joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : null,
          }),
          ...(dto.leftOn !== undefined && {
            leftOn: dto.leftOn ? new Date(dto.leftOn) : null,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.institutionId !== undefined && {
            institution: { connect: { id: dto.institutionId } },
          }),
          ...(dto.academicYearId !== undefined && {
            academicYear: { connect: { id: dto.academicYearId } },
          }),
        },
      });

      log.info('Teacher updated successfully', { teacherId: id });
      return updated;
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        log.warn('Known exception during updateTeacher', {
          error: err.message,
          actor: ctx.userId,
          email: ctx.email,
          teacherId: id,
          dto,
        });
        throw err;
      }
      log.error('Error updating teacher', {
        error: err instanceof Error ? err.message : err,
        code: err?.code,
        actor: ctx.userId,
        email: ctx.email,
        teacherId: id,
        dto,
      });

      if (err?.code === 'P2002') {
        log.warn('Duplicate employee code detected during update', {
          actor: ctx.userId,
          email: ctx.email,
          dto,
        });
        throw new BadRequestException(
          'A teacher with this employee code already exists.',
        );
      }
      if (err?.code === 'P2003') {
        log.warn(
          'Referenced institution or academic year does not exist during update',
          { actor: ctx.userId, email: ctx.email, dto },
        );
        throw new BadRequestException(
          'Referenced institution or academic year does not exist.',
        );
      }
      throw new InternalServerErrorException('Failed to update teacher');
    }
  }

  async deleteTeacher(id: string, userId?: string, userRole?: Role) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'deleteTeacher' });

    log.info('Deleting teacher', {
      actor: ctx.userId,
      email: ctx.email,
      teacherId: id,
    });
    try {
      // Ensure exists first and reuse
      const teacher = await this.getTeacherById(id, userId, userRole);

      const deleted = await this.prisma.teacher.delete({ where: { id } });
      log.info('Teacher deleted successfully', { teacherId: id });
      return deleted;
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        log.warn('Known exception during deleteTeacher', {
          error: err.message,
          actor: ctx.userId,
          email: ctx.email,
          teacherId: id,
        });
        throw err;
      }
      log.error('Error deleting teacher', {
        error: err instanceof Error ? err.message : err,
        actor: ctx.userId,
        email: ctx.email,
        teacherId: id,
      });
      throw new InternalServerErrorException('Failed to delete teacher');
    }
  }
}
