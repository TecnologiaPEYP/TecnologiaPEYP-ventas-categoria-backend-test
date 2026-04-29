import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { DescargasModule } from './modules/descargas/descargas.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { RegistrosModule } from './modules/registros/registros.module';
import { ProductRelacionesModule } from './modules/product-relaciones/product-relaciones.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    DescargasModule,
    ReportesModule,
    RegistrosModule,
    ProductRelacionesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
