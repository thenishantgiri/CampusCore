import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/constants/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Subject')
@Controller('subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COURSE_COORDINATOR)
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiBody({ type: CreateSubjectDto })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.create(dto);
  }

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.TEACHER,
    Role.COURSE_COORDINATOR,
    Role.STUDENT,
  )
  @ApiOperation({ summary: 'Get all subjects' })
  findAll() {
    return this.subjectService.findAll();
  }

  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.TEACHER,
    Role.COURSE_COORDINATOR,
    Role.STUDENT,
  )
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COURSE_COORDINATOR)
  @ApiOperation({ summary: 'Update a subject by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateSubjectDto })
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a subject by ID' })
  @HttpCode(204)
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id') id: string) {
    return this.subjectService.remove(id);
  }
}
