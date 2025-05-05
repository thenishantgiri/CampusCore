import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/constants/roles.enum';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Permission } from 'src/auth/decorators/permission.decorator';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/role')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permission('users:update', 'roles:update')
  updateUserRole(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, dto.roleId);
  }
}
