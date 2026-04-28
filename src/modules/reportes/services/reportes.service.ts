import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateReporteDto } from '../dto/create-reporte.dto';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateReporteDto, userId?: number) {
    // Strip compressedRawRows before saving — raw rows can be several MB and exceed
    // MySQL's max_allowed_packet limit. The frontend falls back to aggregated data gracefully.
    const { compressedRawRows: _, ...datosToSave } = dto.datos as any;

    return this.prisma.reporteGuardado.create({
      data: {
        nombre: dto.nombre,
        fileName: dto.fileName ?? null,
        datos: datosToSave,
        userId: userId ?? null,
      },
      select: { id: true, nombre: true, fileName: true, createdAt: true, userId: true },
    });
  }

  async findAll(userId?: number) {
    return this.prisma.reporteGuardado.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, nombre: true, fileName: true, createdAt: true, userId: true },
    });
  }

  async findOne(id: number) {
    const r = await this.prisma.reporteGuardado.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Reporte ${id} no encontrado`);
    return r;
  }

  async remove(id: number, userId?: number) {
    const r = await this.prisma.reporteGuardado.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Reporte ${id} no encontrado`);
    if (userId && r.userId !== null && r.userId !== userId) {
      throw new NotFoundException(`Reporte ${id} no encontrado`);
    }
    return this.prisma.reporteGuardado.delete({ where: { id } });
  }
}
