import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './services/roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Get()
  @Permissions('roles:view')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('roles:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('roles:manage')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @Permissions('roles:manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }



  @Delete(':id')
  @Permissions('roles:manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Post('assign')
  @Permissions('roles:manage')
  assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(assignRoleDto.userId, assignRoleDto.roleId);
  }

  @Post('remove-from-user/:userId')
  @Permissions('roles:manage')
  removeFromUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.removeRoleFromUser(userId);
  }
}
