import { Controller, Get, Post, Body, Res, HttpCode, UseGuards, BadRequestException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class SendWaDto {
  to!: string;
  message!: string;
}

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly wa: WhatsappService) {}

  @Get('status')
  status() {
    return { connected: this.wa.isConnected(), hasQr: !!this.wa.getQr() };
  }

  @Get('qr')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qr(@Res() res: any) {
    const qr = this.wa.getQr();
    if (!qr) {
      if (this.wa.isConnected()) {
        return res.status(200).json({ connected: true, message: 'WhatsApp ya está conectado' });
      }
      return res.status(202).json({ connected: false, message: 'QR aún no disponible, reintenta en unos segundos' });
    }
    // Devolver HTML con la imagen QR para escanear fácilmente
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>WhatsApp QR</title>
<style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f2f5;font-family:sans-serif}
.card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center}
img{width:260px;height:260px}p{color:#667781;font-size:14px;margin-top:12px}</style></head>
<body><div class="card"><h2 style="color:#111b21;margin-bottom:16px">Vincular WhatsApp</h2>
<img src="${qr}" alt="QR Code"/><p>Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo<br/>y escanea este código</p>
<p style="color:#25d366;font-weight:bold">Este QR expira en ~60 s — recarga si ya expiró</p></div></body></html>`);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send')
  @HttpCode(200)
  async send(@Body() dto: SendWaDto) {
    try {
      await this.wa.sendMessage(dto.to, dto.message);
      return { message: 'Mensaje enviado' };
    } catch (err: unknown) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
