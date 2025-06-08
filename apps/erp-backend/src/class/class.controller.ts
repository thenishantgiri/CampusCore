import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from 'src/auth/constants/roles.enum';

@ApiTags('Class')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly service: ClassService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Class successfully created' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new class' })
  @ApiBody({
    schema: {
      example: {
        name: 'Grade 6',
        displayName: '6th Grade',
        institutionId: 'uuid',
        academicYearId: 'uuid',
      },
    },
  })
  create(@Body() dto: CreateClassDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOkResponse({
    description: 'List of active classes retrieved successfully',
  })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all active classes' })
  findAll() {
    return this.service.findAll();
  }
  @Get(':id')
  @ApiOkResponse({ description: 'Class retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a class by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Class updated successfully' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a class' })
  @ApiBody({
    schema: {
      example: {
        name: 'Grade 6 - A',
        displayName: '6th Grade Section A',
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Class soft deleted successfully' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a class' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
