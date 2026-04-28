import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ProductRelacionesService {
  constructor(private prisma: PrismaService) { }

  /** Devuelve todas las relaciones como mapa { PRODUCTO: 'RELACION' } */
  async findAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.productoRelacion.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.producto] = r.relacion;
    return map;
  }

  /** Crea o actualiza la relación de un producto */
  async upsert(producto: string, relacion: string) {
    const key = producto.toUpperCase().trim();
    return this.prisma.productoRelacion.upsert({
      where: { producto: key },
      update: { relacion },
      create: { producto: key, relacion },
    });
  }

  /** Elimina la relación de un producto */
  async remove(producto: string) {
    const key = producto.toUpperCase().trim();
    return this.prisma.productoRelacion.delete({ where: { producto: key } });
  }

  /** Elimina todas las relaciones */
  async clearAll() {
    return this.prisma.productoRelacion.deleteMany();
  }

  /** Reemplaza TODAS las relaciones de una vez (bulk save) */
  async bulkUpsert(overrides: Record<string, string>) {
    const entries = Object.entries(overrides);
    return this.prisma.$transaction(async (tx) => {
      await tx.productoRelacion.deleteMany();
      if (entries.length > 0) {
        await tx.productoRelacion.createMany({
          data: entries.map(([producto, relacion]) => ({
            producto: producto.toUpperCase().trim(),
            relacion,
          })),
          skipDuplicates: true,
        });
      }
      return { saved: entries.length };
    });
  }
}
