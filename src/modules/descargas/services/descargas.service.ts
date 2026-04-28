import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import PDFDocument = require('pdfkit');
import * as XLSX from 'xlsx';

type RegistroRow = {
  nombre: string;
  correo: string;
  telefono: string;
  fechaNacimiento: Date | null;
  pais: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  createdAt: Date;
};

@Injectable()
export class DescargasService {
  constructor(private prisma: PrismaService) { }

  async getClientes() {
    return this.prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateClientesPdf(): Promise<Buffer> {
    const clientes = await this.getClientes();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Lista de Contactos', { align: 'center' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' });
      doc.moveDown(1.5);

      // Table Header
      const startX = 40;
      const colWidths = [140, 160, 100, 90, 80, 100, 90]; // name, email, phone, birthDate, country, docType, docNumber
      const headers = ['Nombre', 'Email', 'Teléfono', 'Nacimiento', 'País', 'Tipo Doc.', 'Nro. Doc.'];

      let y = doc.y;

      // Draw header background
      doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 20).fill('#1e293b');

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
      let x = startX;
      headers.forEach((header, i) => {
        doc.text(header, x + 4, y, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });

      y += 22;
      doc.fillColor('#000000');

      // Table Rows
      doc.fontSize(8).font('Helvetica');
      for (const cliente of clientes) {
        if (y > 540) {
          doc.addPage();
          y = 40;
        }

        // Alternate row color
        const rowIndex = clientes.indexOf(cliente);
        if (rowIndex % 2 === 0) {
          doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 18).fill('#f8fafc');
          doc.fillColor('#000000');
        }

        const row = [
          cliente.name,
          cliente.email,
          cliente.phone,
          cliente.birthDate ? new Date(cliente.birthDate).toLocaleDateString('es-ES') : '—',
          cliente.country,
          cliente.documentType,
          cliente.documentNumber,
        ];

        x = startX;
        row.forEach((cell, i) => {
          doc.text(cell || '—', x + 4, y, { width: colWidths[i] - 8, ellipsis: true });
          x += colWidths[i];
        });

        y += 20;
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(`Total de contactos: ${clientes.length}`, startX, y + 10);

      doc.end();
    });
  }

  async generateClientesCsv(): Promise<string> {
    const clientes = await this.getClientes();

    const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha Nacimiento', 'País', 'Tipo Documento', 'Número Documento', 'Fecha Registro'];

    const rows = clientes.map((c) => [
      this.escapeCsv(c.name),
      this.escapeCsv(c.email),
      this.escapeCsv(c.phone),
      c.birthDate ? new Date(c.birthDate).toLocaleDateString('es-ES') : '',
      this.escapeCsv(c.country),
      this.escapeCsv(c.documentType),
      this.escapeCsv(c.documentNumber),
      new Date(c.createdAt).toLocaleDateString('es-ES'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // BOM for Excel UTF-8 compatibility
    return '\uFEFF' + csv;
  }

  private escapeCsv(value: string | null): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private buildRegistroCsv(rows: RegistroRow[]): string {
    const headers = ['Nombre', 'Correo', 'Teléfono', 'Fecha Nacimiento', 'País', 'Tipo Documento', 'Número Documento', 'Fecha Registro'];
    const data = rows.map((r) => [
      this.escapeCsv(r.nombre),
      this.escapeCsv(r.correo),
      this.escapeCsv(r.telefono),
      r.fechaNacimiento ? new Date(r.fechaNacimiento).toLocaleDateString('es-ES') : '',
      this.escapeCsv(r.pais),
      this.escapeCsv(r.tipoDocumento),
      this.escapeCsv(r.numeroDocumento),
      new Date(r.createdAt).toLocaleDateString('es-ES'),
    ]);
    return '\uFEFF' + [headers.join(','), ...data.map((r) => r.join(','))].join('\n');
  }

  async generateCumpleanoscsv(): Promise<string> {
    const rows = await this.prisma.registroCumpleanos.findMany({ orderBy: { createdAt: 'desc' } });
    return this.buildRegistroCsv(rows);
  }

  async generateCaptacionExcel(desde?: string, hasta?: string): Promise<Buffer> {
    const where: any = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) where.createdAt.lte = new Date(`${hasta}T23:59:59.999Z`);
    }
    const rows = await this.prisma.registroCaptacion.findMany({ where, orderBy: { createdAt: 'desc' } });

    const data = [
      ['Nombre', 'Empresa', 'Teléfono', 'Email', 'Aceptó', 'Fecha Registro'],
      ...rows.map((r) => [
        r.nombre,
        r.empresa ?? '',
        r.telefono,
        r.email,
        r.acepto ? 'Sí' : 'No',
        new Date(r.createdAt).toLocaleDateString('es-ES'),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Captación');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async generateCaptacionCsv(): Promise<string> {
    const rows = await this.prisma.registroCaptacion.findMany({ orderBy: { createdAt: 'desc' } });
    const headers = ['Nombre', 'Empresa', 'Teléfono', 'Email', 'Aceptó', 'Fecha Registro'];
    const data = rows.map((r) => [
      this.escapeCsv(r.nombre),
      this.escapeCsv(r.empresa ?? ''),
      this.escapeCsv(r.telefono),
      this.escapeCsv(r.email),
      r.acepto ? 'Sí' : 'No',
      new Date(r.createdAt).toLocaleDateString('es-ES'),
    ]);
    return '\uFEFF' + [headers.join(','), ...data.map((r) => r.join(','))].join('\n');
  }

  async generateCumpleanosExcel(desde?: string, hasta?: string): Promise<Buffer> {
    const where: any = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) where.createdAt.lte = new Date(`${hasta}T23:59:59.999Z`);
    }
    const rows = await this.prisma.registroCumpleanos.findMany({ where, orderBy: { createdAt: 'desc' } });

    const data = [
      ['Nombre', 'Correo', 'Teléfono', 'Fecha Nacimiento', 'País', 'Tipo Documento', 'Número Documento', 'Fecha Registro'],
      ...rows.map((r) => [
        r.nombre,
        r.correo,
        r.telefono,
        r.fechaNacimiento ? new Date(r.fechaNacimiento).toLocaleDateString('es-ES') : '',
        r.pais,
        r.tipoDocumento ?? '',
        r.numeroDocumento ?? '',
        new Date(r.createdAt).toLocaleDateString('es-ES'),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cumpleaños');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async generateCrmExcel(desde?: string, hasta?: string): Promise<Buffer> {
    const where: any = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) where.createdAt.lte = new Date(`${hasta}T23:59:59.999Z`);
    }
    const rows = await this.prisma.registroCrm.findMany({ where, orderBy: { createdAt: 'desc' } });

    const data = [
      ['Nombre', 'Correo', 'Teléfono', 'Fecha Nacimiento', 'País', 'Ciudad', 'Tipo Documento', 'Número Documento', 'Tipo Evento', 'Segmentos', 'Aceptó Política', 'Fecha Registro'],
      ...rows.map((r) => [
        r.nombre,
        r.correo,
        r.telefono,
        r.fechaNacimiento ? new Date(r.fechaNacimiento).toLocaleDateString('es-ES') : '',
        r.pais,
        r.ciudad ?? '',
        r.tipoDocumento ?? '',
        r.numeroDocumento ?? '',
        r.tipoEvento ?? '',
        Array.isArray(r.segmentos) ? (r.segmentos as string[]).join(', ') : '',
        r.aceptaPolitica ? 'Sí' : 'No',
        new Date(r.createdAt).toLocaleDateString('es-ES'),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro CRM');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
