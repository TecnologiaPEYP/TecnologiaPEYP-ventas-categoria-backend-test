import { Module } from '@nestjs/common';
import { DescargasService } from './services/descargas.service';
import { DescargasController } from './descargas.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DescargasController],
  providers: [DescargasService],
})
export class DescargasModule { }
