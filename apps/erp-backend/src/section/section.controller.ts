import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto, UpdateSectionDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Role } from 'src/auth/constants/roles.enum';

@ApiTags('Section')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sections')
export class SectionController {
  constructor(private readonly service: SectionService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new section' })
  @ApiBody({
    type: CreateSectionDto,
    description: 'Payload to create a new section',
    schema: {
      example: {
        name: 'A1',
        classId: 'class-uuid',
        teacherId: 'teacher-uuid',
      },
    },
  })
  create(@Body() dto: CreateSectionDto) {
    return this.service.create(dto);
  }

  @Get('by-class/:classId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List sections for a given class' })
  findByClass(@Param('classId') classId: string) {
    return this.service.findByClass(classId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a section' })
  @ApiBody({
    type: UpdateSectionDto,
    description: 'Payload to update a section',
    schema: {
      example: {
        name: 'A1',
        teacherId: 'new-teacher-uuid',
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a section' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
