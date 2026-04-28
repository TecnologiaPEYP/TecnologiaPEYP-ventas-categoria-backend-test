import { Controller, Get, Put, Delete, Post, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UsersService } from './services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('users:view')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  async getProfile(@Request() req) {
    if (!req.user || !req.user.userId) {
      throw new Error('User not found in request');
    }

    const userId = Number(req.user.userId);
    const user = await this.usersService.findById(userId);
    if (!user) {
      return null;
    }

    const { password, resetToken, resetTokenExpiry, role, ...userWithoutSensitive } = user as any;
    const permissions = role?.permissions?.map((rp: any) => rp.permission.name) ?? [];

    return {
      ...userWithoutSensitive,
      role: role?.name ?? null,
      permissions,
    };
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }

    const { password, resetToken, resetTokenExpiry, role, ...userWithoutSensitive } = user as any;
    const permissions = role?.permissions?.map((rp: any) => rp.permission.name) ?? [];

    return {
      ...userWithoutSensitive,
      role: role?.name ?? null,
      permissions,
    };
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const birthDate = updateProfileDto.birthDate ? new Date(updateProfileDto.birthDate) : undefined;

    return this.usersService.updateProfile(req.user.userId, {
      ...updateProfileDto,
      birthDate,
    });
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() adminUpdateUserDto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdate(id, adminUpdateUserDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
