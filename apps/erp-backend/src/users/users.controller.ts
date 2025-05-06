import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
  ValidationPipe,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/constants/roles.enum';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { PERMISSIONS } from 'src/auth/constants/permissions';
import { SafeUserEntity } from '../auth/entities/safe-user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/role')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.USERS.ASSIGN_ROLE)
  @ApiOperation({ summary: "Update a user's role" })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '17a53396-930b-4876-81ec-f1f015ffbc42',
  })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiOkResponse({
    description: "The user's role has been successfully updated",
    type: SafeUserEntity,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and users:assign-role permission',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  updateUserRole(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, dto.roleId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission(PERMISSIONS.USERS.DELETE)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '17a53396-930b-4876-81ec-f1f015ffbc42',
  })
  @ApiOkResponse({
    description: 'The user has been successfully deleted',
    type: SafeUserEntity,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - requires admin access and users:delete permission. Super admin users can only be deleted by other super admins.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
