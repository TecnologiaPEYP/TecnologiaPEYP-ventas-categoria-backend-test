import { Module } from '@nestjs/common';
import { ProductRelacionesService } from './services/product-relaciones.service';
import { ProductRelacionesController } from './product-relaciones.controller';

@Module({
  controllers: [ProductRelacionesController],
  providers: [ProductRelacionesService],
})
export class ProductRelacionesModule { }
