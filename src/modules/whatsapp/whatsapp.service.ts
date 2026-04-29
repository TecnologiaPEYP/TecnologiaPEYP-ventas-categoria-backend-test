import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import * as qrcode from 'qrcode';
import P from 'pino';

const NO_RETRY_CODES = new Set([
  DisconnectReason.loggedOut,
  DisconnectReason.connectionReplaced,
]);

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private currentQr: string | null = null;
  private connected = false;
  private reconnecting = false;
  private retryDelay = 5000;
  private silentRetry = false;
  private readonly authDir = path.join(process.cwd(), 'wa-auth');

  onModuleInit() {
    this.connect().catch(err => this.logger.error('WhatsApp init error', err));
  }

  private hasCredentials(): boolean {
    try {
      return fs.readdirSync(this.authDir).length > 0;
    } catch (_) {
      return false;
    }
  }

  private clearAuthDir() {
    try {
      for (const file of fs.readdirSync(this.authDir)) {
        fs.unlinkSync(path.join(this.authDir, file));
      }
      this.logger.log('🗑️ Credenciales de WhatsApp eliminadas — se pedirá nuevo QR');
    } catch (_) { /* directorio vacío o inexistente */ }
  }

  private scheduleReconnect() {
    this.reconnecting = false;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, 5 * 60 * 1000);
    setTimeout(() => this.connect(), delay);
  }

  private async connect() {
    if (this.reconnecting) return;
    this.reconnecting = true;

    try {
      if (this.sock) {
        try { this.sock.ws.close(); } catch (_) { /* ignorar */ }
        this.sock = null;
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const pinoLogger = P({ level: 'silent' });

      this.sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
        },
        printQRInTerminal: false,
        browser: ['SanValentin CRM', 'Chrome', '1.0.0'],
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
          this.reconnecting = false;
          this.retryDelay = 5000;
          this.silentRetry = false;
          this.logger.log('✅ WhatsApp conectado');
        }

        if (connection === 'close') {
          this.connected = false;
          const code = (lastDisconnect?.error as Boom)?.output?.statusCode;

          // 405 = sesión en conflicto
          if (code === 405) {
            if (this.hasCredentials()) {
              // Había credenciales viejas — borrarlas y reconectar rápido para obtener QR nuevo
              this.logger.warn('⚠️ WhatsApp 405 — credenciales obsoletas, limpiando sesión para nuevo QR');
              this.clearAuthDir();
              this.reconnecting = false;
              this.retryDelay = 5000;
              setTimeout(() => this.connect(), 3000);
            } else {
              // Sin credenciales y sigue rechazando — WhatsApp rate-limiting, usar backoff
              if (!this.silentRetry) {
                this.logger.warn('⚠️ WhatsApp 405 — esperando conexión, visita /whatsapp/qr cuando esté disponible');
                this.silentRetry = true;
              }
              this.scheduleReconnect();
            }
            return;
          }

          const shouldReconnect = !NO_RETRY_CODES.has(code as DisconnectReason);
          if (shouldReconnect) {
            this.scheduleReconnect();
          } else {
            this.reconnecting = false;
            this.silentRetry = false;
            this.logger.warn('🔴 WhatsApp desconectado. Escanea el QR en /whatsapp/qr para reconectar.');
          }
        }
      });
    } catch (err) {
      this.logger.error('Error al conectar WhatsApp', err);
      this.scheduleReconnect();
    }
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
