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
import { TeacherService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SafeTeacherEntity } from './entities/safe-teacher.entity';
import { FindTeachersQueryDto } from './dto/find-teachers.query.dto';
import { Request } from 'express';
import { UserRole } from 'src/auth/decorators/user-role.decorator';

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.TEACHERS.CREATE)
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiBody({
    description: 'Payload to create a teacher profile',
    schema: {
      example: {
        userId: '17a53396-930b-4876-81ec-f1f015ffbc42',
        employeeCode: 'TCH001',
        institutionId: '12345678-1234-1234-1234-123456789012',
        academicYearId: '87654321-4321-4321-4321-210987654321',
        designation: 'Senior Mathematics Teacher',
        departments: ['Mathematics', 'Science'],
        subjects: ['Algebra', 'Geometry', 'Physics'],
        assignedClasses: ['Class 10A', 'Class 10B', 'Class 11 Science'],
        joinedOn: '2020-08-15T00:00:00.000Z',
        isActive: true,
      },
    },
  })
  @ApiOkResponse({
    description: 'Teacher created successfully',
    type: SafeTeacherEntity,
  })
  @ApiBadRequestResponse({
    description:
      'A teacher with this employee code already exists or referenced user does not exist',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and teachers:create permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateTeacherDto,
  ) {
    return this.teacherService.createTeacher(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.TEACHERS.READ)
  @ApiOperation({
    summary: 'Get all teachers with optional filtering and pagination',
  })
  @ApiOkResponse({
    description: 'List of teachers with pagination metadata',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(SafeTeacherEntity) },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of teachers matching the query',
              example: 50,
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
              example: 5,
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires proper role and teachers:read permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(
    @Query(new ValidationPipe({ transform: true })) query: FindTeachersQueryDto,
  ) {
    return this.teacherService.getAllTeachers(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  @Permission(PERMISSIONS.TEACHERS.READ)
  @ApiOperation({ summary: 'Get a teacher by ID' })
  @ApiParam({ name: 'id', description: 'Teacher ID', example: 'uuid-string' })
  @ApiOkResponse({
    description: 'Teacher retrieved successfully',
    type: SafeTeacherEntity,
  })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  @ApiForbiddenResponse({
    description: 'Forbidden - teachers can only access their own profiles',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    const userId = req.user?.id;
    return this.teacherService.getTeacherById(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.TEACHERS.UPDATE)
  @ApiOperation({ summary: 'Update a teacher by ID' })
  @ApiParam({ name: 'id', description: 'Teacher ID', example: 'uuid-string' })
  @ApiBody({ type: UpdateTeacherDto })
  @ApiOkResponse({
    description: 'Teacher updated successfully',
    type: SafeTeacherEntity,
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and teachers:update permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateTeacherDto,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    const userId = req.user?.id;
    return this.teacherService.updateTeacher(id, dto, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.TEACHERS.DELETE)
  @ApiOperation({ summary: 'Delete a teacher by ID' })
  @ApiParam({ name: 'id', description: 'Teacher ID', example: 'uuid-string' })
  @ApiOkResponse({
    description: 'Teacher deleted successfully',
    type: SafeTeacherEntity,
  })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and teachers:delete permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  remove(
    @Param('id') id: string,
    @Req() req: Request,
    @UserRole() userRole: Role,
  ) {
    const userId = req.user?.id;
    return this.teacherService.deleteTeacher(id, userId, userRole);
  }
}
