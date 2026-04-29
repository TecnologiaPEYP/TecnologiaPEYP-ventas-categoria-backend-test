import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { SendKpiReportDto } from './dto/send-kpi-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('kpi-report')
  async sendKpiReport(@Body() dto: SendKpiReportDto) {
    await this.mailService.sendKpiReport(dto.to, dto.subject, dto.html);
    return { message: 'Reporte enviado exitosamente' };
  }

  @Post('whatsapp-kpi')
  async sendWhatsappKpi() {
    throw new BadRequestException('WhatsApp no está disponible. Usa la opción de Correo.');
  }
}
