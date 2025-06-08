import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { Role } from 'src/auth/constants/roles.enum';
import { PERMISSIONS } from 'src/auth/constants/permissions';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SafeStudentEntity } from './entities/safe-student.entity';
import { FindStudentsQueryDto } from './dto/find-students.query.dto';
import { Request } from 'express';
import { UserRole } from 'src/auth/decorators/user-role.decorator';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.STUDENTS.CREATE)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiBody({
    description: 'Payload to create a student profile',
    schema: {
      example: {
        userId: 'uuid',
        sectionId: 'uuid',
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: '2008-04-12T00:00:00.000Z',
        photoUrl: 'https://cdn.example.com/photos/alice.jpg',
        emergencyContacts: [
          { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
        ],
      },
    },
  })
  @ApiOkResponse({
    description: 'Student created successfully',
    type: SafeStudentEntity,
  })
  @ApiBadRequestResponse({
    description: 'A student profile for this user already exists',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and students:create permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateStudentDto,
  ) {
    return this.studentService.createStudent(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  @Permission(PERMISSIONS.STUDENTS.READ)
  @ApiOperation({
    summary: 'Get all students with optional filtering and pagination',
  })
  @ApiOkResponse({
    description: 'List of students with pagination metadata',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(SafeStudentEntity) },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of students matching the query',
              example: 150,
            },
            page: {
              type: 'number',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'number',
              description: 'Number of items per page',
              example: 10,
            },
            pages: {
              type: 'number',
              description: 'Total number of pages',
              example: 15,
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires proper role and students:read permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(
    @Query(new ValidationPipe({ transform: true })) query: FindStudentsQueryDto,
  ) {
    return this.studentService.getAllStudents(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER, Role.STUDENT)
  @Permission(PERMISSIONS.STUDENTS.READ)
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID', example: 'uuid-string' })
  @ApiOkResponse({
    description: 'Student retrieved successfully',
    type: SafeStudentEntity,
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiForbiddenResponse({
    description: 'Forbidden - students can only access their own profiles',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    // Extract user ID and role from the request
    const userId = req.user?.id;

    return this.studentService.getStudentById(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.STUDENTS.UPDATE)
  @ApiOperation({ summary: 'Update a student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID', example: 'uuid-string' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiOkResponse({
    description: 'Student updated successfully',
    type: SafeStudentEntity,
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and students:update permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateStudentDto,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    const userId = req.user?.id;
    return this.studentService.updateStudent(id, dto, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.STUDENTS.DELETE)
  @ApiOperation({ summary: 'Delete a student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID', example: 'uuid-string' })
  @ApiOkResponse({
    description: 'Student deleted successfully',
    type: SafeStudentEntity,
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and students:delete permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  remove(
    @Param('id') id: string,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    const userId = req.user?.id;
    return this.studentService.deleteStudent(id, userId, userRole);
  }
}
