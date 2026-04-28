import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { DescargasService } from './services/descargas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('descargas')
@UseGuards(JwtAuthGuard)
export class DescargasController {
  constructor(private readonly descargasService: DescargasService) { }

  @Get('clientes/pdf')
  @UseGuards(PermissionsGuard)
  @Permissions('descargas:view')
  async downloadClientesPdf(@Res() res: express.Response) {
    const buffer = await this.descargasService.generateClientesPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contactos_${Date.now()}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('clientes/csv')
  @UseGuards(PermissionsGuard)
  @Permissions('descargas:view')
  async downloadClientesCsv(@Res() res: express.Response) {
    const csv = await this.descargasService.generateClientesCsv();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos_${Date.now()}.csv"`,
    });

    res.send(csv);
  }

  @Get('cumpleanos/csv')
  async downloadCumpleanoscsv(@Res() res: express.Response) {
    const csv = await this.descargasService.generateCumpleanoscsv();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cumpleanos_${Date.now()}.csv"`,
    });

    res.send(csv);
  }

  @Get('captacion/csv')
  async downloadCaptacionCsv(@Res() res: express.Response) {
    const csv = await this.descargasService.generateCaptacionCsv();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="captacion_${Date.now()}.csv"`,
    });

    res.send(csv);
  }

  @Get('cumpleanos/excel')
  async downloadCumpleanosExcel(
    @Res() res: express.Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const buffer = await this.descargasService.generateCumpleanosExcel(desde, hasta);
    const suffix = desde && hasta ? `${desde}_${hasta}` : desde ? `desde_${desde}` : hasta ? `hasta_${hasta}` : new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cumpleanos_${suffix}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('crm/excel')
  async downloadCrmExcel(
    @Res() res: express.Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const buffer = await this.descargasService.generateCrmExcel(desde, hasta);
    const suffix = desde && hasta ? `${desde}_${hasta}` : desde ? `desde_${desde}` : hasta ? `hasta_${hasta}` : new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="crm_${suffix}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('captacion/excel')
  async downloadCaptacionExcel(
    @Res() res: express.Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const buffer = await this.descargasService.generateCaptacionExcel(desde, hasta);

    // Build a readable filename: captacion_2024-01-01_2024-03-31.xlsx
    const suffix = desde && hasta
      ? `${desde}_${hasta}`
      : desde
        ? `desde_${desde}`
        : hasta
          ? `hasta_${hasta}`
          : new Date().toISOString().slice(0, 10);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="captacion_${suffix}.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
