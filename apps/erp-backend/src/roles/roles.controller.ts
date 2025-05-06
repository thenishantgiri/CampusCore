import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/constants/roles.enum';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PERMISSIONS } from 'src/auth/constants/permissions';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RoleEntity } from './entities/role.entity';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.ROLES.CREATE)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiCreatedResponse({
    description: 'The role has been successfully created',
    type: RoleEntity,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and roles:create permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.ROLES.READ)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({
    description: 'Returns all roles',
    type: [RoleEntity],
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires admin access and roles:read permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.ROLES.UPDATE)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({
    name: 'id',
    description: 'Role ID',
    example: 'role-finance-admin',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({
    description: 'The role has been successfully updated',
    type: RoleEntity,
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and roles:update permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }
}
