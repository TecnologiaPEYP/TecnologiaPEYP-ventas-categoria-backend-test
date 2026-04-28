import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
