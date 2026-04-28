import {
  Controller, Get, Post, Delete,
  Param, Body, Request, UseGuards, ParseIntPipe,
  UseInterceptors, UploadedFile, BadRequestException, BadGatewayException, Logger, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import { ReportesService } from './services/reportes.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { GeminiService } from './services/gemini.service';
import { AnalysisService } from './services/analysis.service';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { AiInsightDto } from './dto/ai-insight.dto';
import { AiChatDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { buildInsightPrompt } from './prompts/insight.prompt';
import { buildChatPrompt } from './prompts/chat.prompt';
import { resolveIntent } from './utils/chat-intent';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  private readonly logger = new Logger(ReportesController.name);

  constructor(
    private readonly reportesService: ReportesService,
    private readonly excelParserService: ExcelParserService,
    private readonly geminiService: GeminiService,
    private readonly analysisService: AnalysisService,
  ) { }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateReporteDto, @Request() req: any) {
    return this.reportesService.create(dto, req.user?.userId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.reportesService.findAll(req.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportesService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.reportesService.remove(id, req.user?.userId);
  }

  // ── EXCEL ─────────────────────────────────────────────────────────────────

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async parseExcel(@UploadedFile() file: Express.Multer.File | any) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    try {
      return this.excelParserService.parse(file.buffer, file.mimetype === 'text/csv');
    } catch (err: any) {
      this.logger.error('parse-excel error:', err.message);
      throw new BadGatewayException('Fallo al procesar el archivo: ' + String(err));
    }
  }

  // ── IA ────────────────────────────────────────────────────────────────────

  @Post('ai-insight')
  async aiInsight(@Body() body: AiInsightDto) {
    const { fileName, totalFilas, totalVentas, periodoNombre, topProductos = [], topVendedores = [], topHoras = [] } = body;
    const insightKey = ['insight', fileName ?? '', Number(totalVentas), Number(totalFilas)].join('|');

    const cached = await this.geminiService.getCache(insightKey);
    if (cached !== null) return { insight: cached };

    const prompt = buildInsightPrompt({
      periodoNombre, fileName,
      totalFilas: Number(totalFilas),
      totalVentas: Number(totalVentas),
      allProds: topProductos, topVendedores, topHoras,
    });

    try {
      const text = await this.geminiService.call(prompt, 600);
      await this.geminiService.setCache(insightKey, prompt, text);
      return { insight: text };
    } catch (err: any) {
      this.logger.error('ai-insight error:', err);
      throw new BadGatewayException('Error al contactar IA');
    }
  }

  @Post('advanced-analysis')
  async aiAdvancedAnalysis(@Body() body: { series: any[] }) {
    const { series } = body;
    if (!series?.length) throw new BadRequestException('Falta la serie');
    return this.analysisService.analyzeAdvanced(series);
  }

  @Post('ai-chat')
  async aiChat(@Body() body: AiChatDto) {
    const { question, context: ctx = {} } = body;
    if (!question) throw new BadRequestException('Falta la pregunta');

    const prompt = buildChatPrompt({
      question,
      fileName: ctx.fileName,
      totalFilas: Number(ctx.totalFilas ?? 0),
      totalVentas: Number(ctx.totalVentas ?? 0),
      topProductos: ctx.topProductos ?? [],
      topVendedores: ctx.topVendedores ?? [],
      topHoras: ctx.topHoras ?? [],
      horaVendedores: ctx.horaVendedores ?? [],
      horaProds: ctx.horaProds ?? [],
      relacionVend: ctx.relacionVend ?? [],
      reportes: ctx.reportes ?? [],
    });

    try {
      const text = await this.geminiService.call(prompt, 800);
      return { answer: text };
    } catch (err: any) {
      this.logger.error('ai-chat error:', err);
      throw new BadGatewayException('Error al contactar IA');
    }
  }

  @Post('ai-chat-stream')
  async aiChatStream(@Body() body: AiChatDto, @Res() res: express.Response) {
    const { question, context: ctx = {} } = body;
    if (!question) { res.status(400).json({ message: 'Falta la pregunta' }); return; }

    const directAnswer = resolveIntent(question, {
      totalFilas: Number(ctx.totalFilas ?? 0),
      totalVentas: Number(ctx.totalVentas ?? 0),
      topProductos: ctx.topProductos ?? [],
      topVendedores: ctx.topVendedores ?? [],
      topHoras: ctx.topHoras ?? [],
      horaVendedores: ctx.horaVendedores ?? [],
      horaProds: ctx.horaProds ?? [],
      relacionVend: ctx.relacionVend ?? [],
      fileName: ctx.fileName,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (directAnswer !== null) {
      res.write(`data: ${JSON.stringify({ token: directAnswer })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const cacheKey = this.geminiService.cacheKey(question, ctx as any);
    const cached = await this.geminiService.getCache(cacheKey);
    if (cached !== null) {
      res.write(`data: ${JSON.stringify({ token: cached })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    let pythonInsights = '';
    if ((ctx.reportes?.length ?? 0) > 1) {
      pythonInsights = this.analysisService.analyzeReports(ctx.reportes, question);
    }

    const slim = this.geminiService.trimCtx(question, ctx as any);
    const prompt = buildChatPrompt({
      question,
      fileName: slim.fileName,
      totalFilas: Number(slim.totalFilas ?? 0),
      totalVentas: Number(slim.totalVentas ?? 0),
      topProductos: slim.topProductos ?? [],
      topVendedores: slim.topVendedores ?? [],
      topHoras: slim.topHoras ?? [],
      horaVendedores: slim.horaVendedores ?? [],
      horaProds: slim.horaProds ?? [],
      relacionVend: slim.relacionVend ?? [],
      reportes: slim.reportes ?? [],
      meses: (slim as any).meses ?? [],
      dias: (slim as any).dias ?? [],
      pythonInsights,
    } as any);

    try {
      let fullText = '';
      for await (const token of this.geminiService.streamTokens(prompt)) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
        fullText += token;
      }
      if (!fullText) {
        fullText = 'Sin información disponible.';
        res.write(`data: ${JSON.stringify({ token: fullText })}\n\n`);
      }
      await this.geminiService.setCache(cacheKey, question, fullText);
    } catch (err: any) {
      this.logger.error('ai-chat-stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Error interno' })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
