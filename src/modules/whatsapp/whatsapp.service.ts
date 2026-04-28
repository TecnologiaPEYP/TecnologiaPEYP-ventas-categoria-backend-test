import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as qrcode from 'qrcode';
import P from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private currentQr: string | null = null; // base64 PNG
  private connected = false;
  private readonly authDir = path.join(process.cwd(), 'wa-auth');

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const { version } = await fetchLatestBaileysVersion();
    const pinoLogger = P({ level: 'silent' });

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
      },
      printQRInTerminal: false,
      browser: ['SanValentín CRM', 'Chrome', '1.0.0'],
      logger: pinoLogger,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.connected = false;
        this.currentQr = await qrcode.toDataURL(qr);
        this.logger.log('📱 WhatsApp QR listo — visita GET /whatsapp/qr para escanearlo');
      }

      if (connection === 'open') {
        this.connected = true;
        this.currentQr = null;
        this.logger.log('✅ WhatsApp conectado');
      }

      if (connection === 'close') {
        this.connected = false;
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        this.logger.warn(`⚠️ WhatsApp desconectado (${code}). Reconectar: ${shouldReconnect}`);
        if (shouldReconnect) setTimeout(() => this.connect(), 5000);
      }
    });
  }

  getQr(): string | null {
    return this.currentQr;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendMessage(to: string, message: string, imageBase64?: string): Promise<void> {
    if (!this.sock || !this.connected) {
      throw new Error('WhatsApp no está conectado. Escanea el QR en GET /whatsapp/qr');
    }

    // Normalizar JID: número → "573001234567@s.whatsapp.net"  grupo → "120363xxx@g.us"
    let jid = to.trim();
    if (!jid.includes('@')) {
      jid = jid.replace(/\D/g, '') + '@s.whatsapp.net';
    }

    if (imageBase64) {
      const raw = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      await this.sock.sendMessage(jid, {
        image: Buffer.from(raw, 'base64'),
        mimetype: 'image/png',
        caption: message,
      });
    } else {
      await this.sock.sendMessage(jid, { text: message });
    }

    this.logger.log(`✅ Mensaje WA enviado → ${jid}`);
  }
}
