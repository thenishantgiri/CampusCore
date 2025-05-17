import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { RequestContextService } from 'src/common/logger/request-context.service';
import { Prisma } from 'generated/prisma';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FindStudentsQueryDto } from './dto/find-students.query.dto';
import { Role } from 'src/auth/constants/roles.enum';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  async createStudent(dto: CreateStudentDto) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'createStudent' });

    log.info('Creating student', { actor: ctx.userId, dto });
    try {
      const student = await this.prisma.student.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth),
          photoUrl: dto.photoUrl ?? null,
          user: { connect: { id: dto.userId } },
          emergencyContacts:
            dto.emergencyContacts as unknown as Prisma.InputJsonValue,
        },
      });
      log.info('Student created successfully', { studentId: student.id });
      return student;
    } catch (err: any) {
      log.error('Error creating student', {
        error: err instanceof Error ? err.message : err,
        code: err?.code, // Log the error code if it exists
        name: err?.name, // Log the error name/type
      });

      // Check for unique constraint violation using the error code directly
      // rather than relying on instanceof
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'A student profile for this user already exists.',
        );
      }

      // Check for foreign key constraint violation
      if (err?.code === 'P2003') {
        throw new BadRequestException('Referenced user does not exist.');
      }

      throw new InternalServerErrorException('Failed to create student');
    }
  }

  async getAllStudents(query: FindStudentsQueryDto) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'getAllStudents' });

    const {
      page = 1,
      limit = 10,
      search,
      userId,
      dateOfBirthStart,
      dateOfBirthEnd,
    } = query;
    const skip = (page - 1) * limit;

    log.info('Fetching all students with filters', {
      actor: ctx.userId,
      page,
      limit,
      search,
      userId,
      dateOfBirthRange:
        dateOfBirthStart && dateOfBirthEnd
          ? `${dateOfBirthStart} to ${dateOfBirthEnd}`
          : undefined,
    });

    try {
      // Build where conditions for filtering
      const where: Prisma.StudentWhereInput = {};

      if (userId) {
        where.userId = userId;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (dateOfBirthStart && dateOfBirthEnd) {
        where.dateOfBirth = {
          gte: new Date(dateOfBirthStart),
          lte: new Date(dateOfBirthEnd),
        };
      } else if (dateOfBirthStart) {
        where.dateOfBirth = { gte: new Date(dateOfBirthStart) };
      } else if (dateOfBirthEnd) {
        where.dateOfBirth = { lte: new Date(dateOfBirthEnd) };
      }

      // Get total count for pagination metadata
      const total = await this.prisma.student.count({ where });

      // Get students with pagination and filtering
      const students = await this.prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Most recent students first
      });

      // Calculate total pages
      const pages = Math.ceil(total / limit);

      log.info(
        `Successfully retrieved ${students.length} students (page ${page} of ${pages}, total: ${total})`,
      );

      // Map to SafeStudentEntity format
      const safeStudents = students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth.toISOString(),
        photoUrl: student.photoUrl,
        emergencyContacts: student.emergencyContacts as any,
        userId: student.userId,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        user: student.user
          ? {
              name: student.user.name,
              email: student.user.email,
            }
          : undefined,
      }));

      return {
        data: safeStudents,
        meta: {
          total,
          page,
          limit,
          pages,
        },
      };
    } catch (err: any) {
      log.error('Error fetching students', {
        error: err instanceof Error ? err.message : err,
        query,
      });
      throw new InternalServerErrorException('Failed to fetch students');
    }
  }

  async getStudentById(id: string, userId?: string, userRole?: Role) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'getStudentById' });

    log.info('Fetching student by ID', { actor: ctx.userId, studentId: id });
    try {
      const student = await this.prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!student) {
        log.warn('Student not found', { studentId: id });
        throw new NotFoundException('Student not found');
      }

      // Access control: Student role can only access their own profile
      if (userRole === Role.STUDENT && student.userId !== userId) {
        log.warn('Student attempted to access another student profile', {
          actorId: userId,
          studentId: id,
          studentUserId: student.userId,
        });
        throw new ForbiddenException(
          'You can only access your own student profile',
        );
      }

      log.info('Student retrieved', { studentId: id });

      // Map to SafeStudentEntity format
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth.toISOString(),
        photoUrl: student.photoUrl,
        emergencyContacts: student.emergencyContacts as any,
        userId: student.userId,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        user: student.user
          ? {
              name: student.user.name,
              email: student.user.email,
            }
          : undefined,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException)
        throw err;
      log.error('Error fetching student', {
        error: err instanceof Error ? err.message : err,
      });
      throw new InternalServerErrorException('Failed to fetch student');
    }
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    userId?: string,
    userRole?: Role,
  ) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'updateStudent' });

    log.info('Updating student', { actor: ctx.userId, studentId: id, dto });
    try {
      // ensure exists
      await this.getStudentById(id, userId, userRole);

      const updated = await this.prisma.student.update({
        where: { id },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          // Use same pattern as createStudent for dateOfBirth, but only when defined
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: new Date(dto.dateOfBirth),
          }),
          // Use nullish coalescing operator for photoUrl consistent with createStudent
          ...(dto.photoUrl !== undefined && {
            photoUrl: dto.photoUrl,
          }),
          ...(dto.emergencyContacts && {
            emergencyContacts:
              dto.emergencyContacts as unknown as Prisma.InputJsonValue,
          }),
        },
      });

      log.info('Student updated successfully', { studentId: id });
      return updated;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      log.error('Error updating student', {
        error: err instanceof Error ? err.message : err,
      });
      throw new InternalServerErrorException('Failed to update student');
    }
  }

  async deleteStudent(id: string, userId?: string, userRole?: Role) {
    const ctx = this.requestContext.getContext();
    const log = this.logger.child({ method: 'deleteStudent' });

    log.info('Deleting student', { actor: ctx.userId, studentId: id });
    try {
      // ensure exists
      await this.getStudentById(id, userId, userRole);

      const deleted = await this.prisma.student.delete({ where: { id } });
      log.info('Student deleted successfully', { studentId: id });
      return deleted;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      log.error('Error deleting student', {
        error: err instanceof Error ? err.message : err,
      });
      throw new InternalServerErrorException('Failed to delete student');
    }
  }
}
