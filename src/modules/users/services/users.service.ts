import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        cedula: true,
        phone: true,
        birthDate: true,
        position: true,
        profileComplete: true,
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.prisma.user.create({ data });
    return this.findById(user.id) as Promise<User>;
  }

  async createUser(data: { email: string; password: string; name?: string; roleId?: number }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        ...(data.roleId ? { role: { connect: { id: data.roleId } } } : {}),
      },
    });
    return this.findById(user.id);
  }

  async upsert(where: Prisma.UserWhereUniqueInput, create: Prisma.UserCreateInput, update: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.upsert({
      where,
      create,
      update,
    });
  }

  async update(where: Prisma.UserWhereUniqueInput, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where,
      data,
    });
  }

  async updateProfile(userId: number, data: Partial<User>) {
    // Check if all required profile fields are filled
    const isProfileComplete = !!(data.name && data.lastName && data.cedula && data.birthDate && data.phone && data.position);

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          lastName: data.lastName,
          cedula: data.cedula,
          birthDate: data.birthDate,
          phone: data.phone,
          position: data.position,
          profileComplete: isProfileComplete,
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          cedula: true,
          birthDate: true,
          phone: true,
          position: true,
          profileComplete: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string) || '';
        if (target.includes('cedula')) {
          throw new ConflictException('Esta cédula ya está registrada por otro usuario');
        }
        throw new ConflictException('Ya existe un registro con estos datos');
      }
      throw error;
    }
  }

  async findByResetToken(resetToken: string) {
    return this.prisma.user.findFirst({ where: { resetToken } });
  }

  async adminUpdate(id: number, data: {
    name?: string;
    lastName?: string;
    cedula?: string;
    birthDate?: string;
    phone?: string;
    position?: string;
    roleId?: number;
    profileComplete?: boolean;
  }) {
    // Verify user exists
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.cedula !== undefined && { cedula: data.cedula }),
          ...(data.birthDate !== undefined && { birthDate: new Date(data.birthDate) }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.position !== undefined && { position: data.position }),
          ...(data.roleId !== undefined && { roleId: data.roleId }),
          ...(data.profileComplete !== undefined && { profileComplete: data.profileComplete }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          cedula: true,
          birthDate: true,
          phone: true,
          position: true,
          profileComplete: true,
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string) || '';
        if (target.includes('cedula')) {
          throw new ConflictException('Esta cédula ya está registrada por otro usuario');
        }
        throw new ConflictException('Ya existe un registro con estos datos');
      }
      throw error;
    }
  }

  async remove(id: number) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: `Usuario con ID ${id} eliminado exitosamente` };
  }
}