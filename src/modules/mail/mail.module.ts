import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { MailController } from './mail.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, WhatsappModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
