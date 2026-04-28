import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ChatContext } from '../utils/chat-intent';

const GEMINI_KEY   = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_BASE  = 'https://aiplatform.googleapis.com/v1/publishers/google/models';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly _memCache = new Map<string, { text: string; exp: number }>();

  constructor(private readonly prisma: PrismaService) {}

  // ── LLAMADAS A LA API ─────────────────────────────────────────────────────

  async call(prompt: string, maxTokens = 600): Promise<string> {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  async *streamTokens(prompt: string): AsyncGenerator<string> {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    });

    if (!geminiRes.ok || !geminiRes.body) throw new Error('Fallo en Gemini');

    const reader  = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const chunk = JSON.parse(payload) as any;
          if (chunk.error) throw new Error(chunk.error.message ?? 'Gemini stream error');
          const token = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (token) yield token;
        } catch (e: any) {
          if (e instanceof SyntaxError) continue; // chunk incompleto, ignorar
          throw e;
        }
      }
    }
  }

  // ── CACHÉ ─────────────────────────────────────────────────────────────────

  async getCache(key: string): Promise<string | null> {
    const mem = this._memCache.get(key);
    if (mem && mem.exp > Date.now()) return mem.text;
    try {
      const row = await this.prisma.aiCache.findUnique({ where: { cacheKey: key } });
      if (row && row.expiresAt > new Date()) {
        this._memCache.set(key, { text: row.answer, exp: row.expiresAt.getTime() });
        return row.answer;
      }
    } catch { /* ignore */ }
    return null;
  }

  async setCache(key: string, question: string, answer: string): Promise<void> {
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this._memCache.set(key, { text: answer, exp: exp.getTime() });
    try {
      await this.prisma.aiCache.upsert({
        where:  { cacheKey: key },
        create: { cacheKey: key, question, answer, expiresAt: exp },
        update: { answer, expiresAt: exp, hits: 0 },
      });
    } catch { /* ignore */ }
  }

  // ── HELPERS DE CONTEXTO ───────────────────────────────────────────────────

  cacheKey(question: string, ctx: ChatContext): string {
    return [
      question.trim().toLowerCase(),
      ctx.fileName ?? '',
      ctx.totalVentas ?? 0,
      (ctx.reportes ?? []).map((r: any) => r.nombre).join(','),
    ].join('|');
  }

  /** Reduce el contexto enviado a Gemini según el tipo de pregunta para ahorrar tokens. */
  trimCtx(question: string, ctx: ChatContext): ChatContext {
    const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const soloHoras      = /hora|turno|pico|franja/.test(q) && !/producto|asesor|vendedor|categoria/.test(q);
    const soloVendedores = /asesor|vendedor/.test(q) && !/hora|producto|categoria/.test(q);
    const soloProductos  = /producto|plato|menu/.test(q) && !/hora|asesor|vendedor|categoria/.test(q);
    const sobreCategoria = /categoria|tipo|relacion/.test(q);
    const esComparativa  = /compar|vs|versus|anterior|pasado|mes|periodo|acumulado|entre/.test(q);

    return {
      ...ctx,
      topProductos:  (soloHoras || soloVendedores) ? (ctx.topProductos ?? []).slice(0, 5) : ctx.topProductos,
      topVendedores: (soloHoras || soloProductos)  ? (ctx.topVendedores ?? []).slice(0, 5) : ctx.topVendedores,
      relacionVend:  sobreCategoria ? ctx.relacionVend : [],
      reportes: esComparativa
        ? (ctx.reportes ?? []).map(r => ({
            ...r,
            topProductos:  (r.topProductos  ?? []).slice(0, 3),
            topVendedores: (r.topVendedores ?? []).slice(0, 3),
          }))
        : [],
    };
  }
}
