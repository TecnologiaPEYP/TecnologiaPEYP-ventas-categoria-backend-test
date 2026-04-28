import { Injectable, NotFoundException } from '@nestjs/common';

import * as XLSX from 'xlsx';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateRegistroDto } from '../dto/create-registro.dto';
import { CreateCaptacionDto } from '../dto/create-captacion.dto';
import { UpdateCaptacionDto } from '../dto/update-captacion.dto';
import { UpdateCrmDto } from '../dto/update-crm.dto';
import { UpdateCumpleanosDto } from '../dto/update-cumpleanos.dto';
import { CreateCrmDto } from '../dto/create-crm.dto';

@Injectable()
export class RegistrosService {
  constructor(private prisma: PrismaService) { }

  async createCumpleanos(dto: CreateRegistroDto) {
    return this.prisma.registroCumpleanos.create({
      data: {
        nombre: dto.nombre,
        correo: dto.correo,
        telefono: dto.telefono,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        pais: dto.pais,
        ciudad: dto.ciudad ?? null,
        tipoDocumento: dto.tipoDocumento ?? null,
        numeroDocumento: dto.numeroDocumento ?? null,
        categoria: dto.categoria ?? null,
        subcategoria: dto.subcategoria ?? null,
        aceptaPolitica: dto.aceptaPolitica ?? false,
      },
    });
  }

  async findAllCumpleanos() {
    return this.prisma.registroCumpleanos.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCaptacion(dto: CreateCaptacionDto) {
    return this.prisma.registroCaptacion.create({
      data: {
        nombre: dto.nombre,
        empresa: dto.empresa,
        telefono: dto.telefono,
        email: dto.email,
        acepto: dto.acepto,
      },
    });
  }

  async findAllCaptacion() {
    return this.prisma.registroCaptacion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCaptacion(id: number, dto: UpdateCaptacionDto) {
    const existing = await this.prisma.registroCaptacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Registro ${id} no encontrado`);
    return this.prisma.registroCaptacion.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCaptacion(id: number) {
    const existing = await this.prisma.registroCaptacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Registro ${id} no encontrado`);
    return this.prisma.registroCaptacion.delete({ where: { id } });
  }

  async findAllCrm() {
    return this.prisma.registroCrm.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCrm(id: number, dto: UpdateCrmDto) {
    const existing = await this.prisma.registroCrm.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Registro CRM ${id} no encontrado`);
    return this.prisma.registroCrm.update({
      where: { id },
      data: {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento !== undefined
          ? (dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null)
          : undefined,
      },
    });
  }

  async updateCumpleanos(id: number, dto: UpdateCumpleanosDto) {
    const existing = await this.prisma.registroCumpleanos.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Registro cumpleaños ${id} no encontrado`);
    return this.prisma.registroCumpleanos.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.correo !== undefined && { correo: dto.correo }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.pais !== undefined && { pais: dto.pais }),
        ...(dto.tipoDocumento !== undefined && { tipoDocumento: dto.tipoDocumento ?? '' }),
        ...(dto.numeroDocumento !== undefined && { numeroDocumento: dto.numeroDocumento ?? '' }),
        ...(dto.fechaNacimiento !== undefined && { fechaNacimiento: new Date(dto.fechaNacimiento) }),
      },
    });
  }

  async createCrm(dto: CreateCrmDto) {
    return this.prisma.registroCrm.create({
      data: {
        segmentos: dto.segmentos ?? [],
        nombre: dto.nombre,
        correo: dto.correo,
        telefono: dto.telefono,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        pais: dto.pais,
        ciudad: dto.ciudad,
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento,
        tipoEvento: dto.tipoEvento,
        aceptaPolitica: dto.aceptaPolitica ?? true,
        categoria: dto.categoria ?? null,
        subcategoria: dto.subcategoria ?? null,
      },
    });
  }

  async importCaptacionExcel(buffer: Buffer): Promise<{ created: number; skipped: number }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const nombre = String(row['Nombre'] || row['nombre'] || '').trim();
      const telefono = String(row['Teléfono'] || row['Telefono'] || row['telefono'] || '').trim();
      const email = String(row['Email'] || row['email'] || '').trim();
      const empresa = String(row['Empresa'] || row['empresa'] || '').trim();
      const aceptoRaw = row['Aceptó'] ?? row['Acepto'] ?? row['acepto'] ?? false;
      const acepto = aceptoRaw === true || String(aceptoRaw).toLowerCase() === 'sí' || String(aceptoRaw).toLowerCase() === 'si';

      if (!nombre || !telefono || !email) {
        skipped++;
        continue;
      }

      await this.prisma.registroCaptacion.create({
        data: { nombre, telefono, email, empresa: empresa || null, acepto },
      });
      created++;
    }

    return { created, skipped };
  }
}
