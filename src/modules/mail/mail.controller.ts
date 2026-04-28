import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { SendKpiReportDto } from './dto/send-kpi-report.dto';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@UseGuards(JwtAuthGuard)
@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly waService: WhatsappService,
  ) {}

  @Post('kpi-report')
  async sendKpiReport(@Body() dto: SendKpiReportDto) {
    await this.mailService.sendKpiReport(dto.to, dto.subject, dto.html);
    return { message: 'Reporte enviado exitosamente' };
  }

  @Post('whatsapp-kpi')
  async sendWhatsappKpi(@Body() dto: SendWhatsappDto) {
    try {
      if (dto.provider === 'baileys') {
        await this.waService.sendMessage(dto.target, dto.message, dto.imageBase64);
      } else {
        await this.mailService.sendWhatsApp(dto.target, dto.message, dto.provider as 'callmebot' | 'ultramsg', dto.instanceId, dto.instanceToken);
      }
      return { message: 'WhatsApp enviado exitosamente' };
    } catch (err: unknown) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
