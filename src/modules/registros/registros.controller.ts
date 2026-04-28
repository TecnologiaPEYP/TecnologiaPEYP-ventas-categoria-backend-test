import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { CreateCaptacionDto } from './dto/create-captacion.dto';
import { UpdateCaptacionDto } from './dto/update-captacion.dto';
import { CreateCrmDto } from './dto/create-crm.dto';
import { UpdateCrmDto } from './dto/update-crm.dto';
import { UpdateCumpleanosDto } from './dto/update-cumpleanos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegistrosService } from './services/registros.service';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) { }

  // Public endpoints – called from QR form pages and portal dashboards (no auth required)
  @Post('cumpleanos')
  createCumpleanos(@Body() dto: CreateRegistroDto) {
    return this.registrosService.createCumpleanos(dto);
  }

  @Post('crm')
  createCrm(@Body() dto: CreateCrmDto) {
    return this.registrosService.createCrm(dto);
  }

  @Post('captacion')
  createCaptacion(@Body() dto: CreateCaptacionDto) {
    return this.registrosService.createCaptacion(dto);
  }

  @Get('cumpleanos')
  findAllCumpleanos() {
    return this.registrosService.findAllCumpleanos();
  }

  @Get('captacion')
  findAllCaptacion() {
    return this.registrosService.findAllCaptacion();
  }

  @Get('crm')
  findAllCrm() {
    return this.registrosService.findAllCrm();
  }

  // Protected endpoints – require authentication
  @UseGuards(JwtAuthGuard)
  @Put('crm/:id')
  updateCrm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCrmDto,
  ) {
    return this.registrosService.updateCrm(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('cumpleanos/:id')
  updateCumpleanos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCumpleanosDto,
  ) {
    return this.registrosService.updateCumpleanos(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('captacion/:id')
  updateCaptacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCaptacionDto,
  ) {
    return this.registrosService.updateCaptacion(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('captacion/:id')
  deleteCaptacion(@Param('id', ParseIntPipe) id: number) {
    return this.registrosService.deleteCaptacion(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('captacion/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  importCaptacionExcel(@UploadedFile() file: { buffer: Buffer }) {
    return this.registrosService.importCaptacionExcel(file.buffer);
  }
}
