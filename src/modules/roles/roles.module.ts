import { Module } from '@nestjs/common';
import { RolesService } from './services/roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule { }
