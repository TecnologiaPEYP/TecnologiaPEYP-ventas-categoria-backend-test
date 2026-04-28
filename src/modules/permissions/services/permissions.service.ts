import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string) {
    return this.prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }

  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }
    return permission;
  }

  async create(data: { name: string; description?: string; module: string; action: string }) {
    const exists = await this.prisma.permission.findUnique({ where: { name: data.name } });
    if (exists) {
      throw new ConflictException(`El permiso "${data.name}" ya existe`);
    }

    return this.prisma.permission.create({ data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.permission.delete({ where: { id } });
  }

  async getModules(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });
    return permissions.map((p) => p.module);
  }
}
