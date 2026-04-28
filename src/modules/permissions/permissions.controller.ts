import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './services/permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) { }

  @Get()
  @Permissions('permissions:view')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('modules')
  @Permissions('permissions:view')
  getModules() {
    return this.permissionsService.getModules();
  }

  @Get('module/:module')
  @Permissions('permissions:view')
  findByModule(@Param('module') module: string) {
    return this.permissionsService.findByModule(module);
  }

  @Post()
  @Permissions('permissions:manage')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }


  @Delete(':id')
  @Permissions('permissions:manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.remove(id);
  }
}
