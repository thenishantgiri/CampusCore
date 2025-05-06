import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '../auth/constants/roles.enum';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PERMISSIONS } from 'src/auth/constants/permissions';
import { PermissionEntity } from './entities/permission.entity';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.PERMISSIONS.CREATE)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiCreatedResponse({
    description: 'The permission has been successfully created',
    type: PermissionEntity,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and permissions:create permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.PERMISSIONS.READ)
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiOkResponse({
    description: 'Returns all permissions',
    type: [PermissionEntity],
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and permissions:read permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.PERMISSIONS.DELETE)
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({
    name: 'id',
    description: 'Permission ID',
    example: 'abc123def456',
  })
  @ApiOkResponse({
    description: 'The permission has been successfully deleted',
    type: PermissionEntity,
  })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires super admin access and permissions:delete permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  deletePermission(@Param('id') id: string) {
    return this.permissionsService.deletePermission(id);
  }
}
