import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductRelacionesService } from './services/product-relaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('product-relaciones')
@UseGuards(JwtAuthGuard)
export class ProductRelacionesController {
  constructor(private readonly service: ProductRelacionesService) { }

  /** GET /product-relaciones → { PRODUCTO: 'RELACION', ... } */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** PUT /product-relaciones → { producto, relacion } */
  @Put()
  upsert(@Body() body: { producto: string; relacion: string }) {
    return this.service.upsert(body.producto, body.relacion);
  }

  /** POST /product-relaciones/bulk → reemplaza todas las relaciones de una vez */
  @Post('bulk')
  bulkUpsert(@Body() body: { overrides: Record<string, string> }) {
    return this.service.bulkUpsert(body.overrides ?? {});
  }

  /** DELETE /product-relaciones/all → borra todas */
  @Delete('all')
  clearAll() {
    return this.service.clearAll();
  }

  /** DELETE /product-relaciones/:producto → borra una */
  @Delete(':producto')
  remove(@Param('producto') producto: string) {
    return this.service.remove(decodeURIComponent(producto));
  }
}
