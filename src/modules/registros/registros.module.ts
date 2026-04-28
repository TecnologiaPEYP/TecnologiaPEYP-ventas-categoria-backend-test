import { Module } from '@nestjs/common';
import { RegistrosController } from './registros.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RegistrosService } from './services/registros.service';

@Module({
  imports: [PrismaModule],
  controllers: [RegistrosController],
  providers: [RegistrosService],
  exports: [RegistrosService],
})
export class RegistrosModule { }
