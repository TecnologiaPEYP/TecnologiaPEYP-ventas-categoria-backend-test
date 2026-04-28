import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return role;
  }

  async create(data: { name: string; description?: string; permissionIds?: number[] }) {
    const exists = await this.prisma.role.findUnique({ where: { name: data.name } });
    if (exists) {
      throw new ConflictException(`El rol "${data.name}" ya existe`);
    }

    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissionIds?.length
          ? {
            create: data.permissionIds.map((permissionId) => ({
              permission: { connect: { id: permissionId } },
            })),
          }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async update(id: number, data: { name?: string; description?: string; permissionIds?: number[] }) {
    await this.findOne(id); // Verify exists

    // If permissionIds provided, replace all permissions
    if (data.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissionIds?.length
          ? {
            create: data.permissionIds.map((permissionId) => ({
              permission: { connect: { id: permissionId } },
            })),
          }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }

  async assignRoleToUser(userId: number, roleId: number) {
    // Verify role exists
    await this.findOne(roleId);

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async removeRoleFromUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user?.role) return [];

    return user.role.permissions.map((rp) => rp.permission.name);
  }
}