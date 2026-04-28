import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './services/reportes.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { GeminiService } from './services/gemini.service';
import { AnalysisService } from './services/analysis.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportesController],
  providers: [ReportesService, ExcelParserService, GeminiService, AnalysisService],
})
export class ReportesModule { }
