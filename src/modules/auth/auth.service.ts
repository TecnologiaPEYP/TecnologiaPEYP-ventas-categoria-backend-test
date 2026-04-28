import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/services/mail.service';
import { UsersService } from '../users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private prisma: PrismaService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Extract permissions from role relation
    const permissions = user.role?.permissions?.map((rp: any) => rp.permission.name) ?? [];
    const roleName = user.role?.name ?? null;

    const payload = {
      email: user.email,
      sub: user.id,
      role: roleName,
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: roleName,
        permissions,
        name: user.name,
        profileComplete: user.profileComplete ?? false,
      }
    };
  }

  async register(data: Prisma.UserCreateInput) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Get empleado role to assign by default
    const empleadoRole = await this.prisma.role.findUnique({ where: { name: 'empleado' } });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: empleadoRole ? { connect: { id: empleadoRole.id } } : undefined,
      },
    });

    // Re-fetch with role relations for login
    const fullUser = await this.usersService.findOne(user.email);
    return this.login(fullUser);
  }

  async googleLogin(userDto: { email: string; name: string; googleId: string }) {
    if (!userDto.email) {
      throw new UnauthorizedException('Email is required');
    }

    // Check if user exists
    const existingUser = await this.usersService.findOne(userDto.email);

    if (!existingUser) {
      // New user - create with empleado role
      const empleadoRole = await this.prisma.role.findUnique({ where: { name: 'empleado' } });

      await this.prisma.user.create({
        data: {
          email: userDto.email,
          name: userDto.name,
          googleId: userDto.googleId,
          password: null,
          role: empleadoRole ? { connect: { id: empleadoRole.id } } : undefined,
        },
      });
    } else {
      // Existing user - update Google info
      await this.usersService.update(
        { email: userDto.email },
        {
          name: userDto.name,
          googleId: userDto.googleId,
        }
      );
    }

    // Re-fetch with role/permissions included
    const user = await this.usersService.findOne(userDto.email);
    return this.login(user);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new BadRequestException('Este correo no está registrado');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update({ email }, { resetToken: token, resetTokenExpiry: expiry });
    await this.mailService.sendPasswordReset(email, token);

    return { message: 'Correo de recuperación enviado exitosamente' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.usersService.update({ id: user.id }, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { message: 'Contraseña restablecida exitosamente' };
  }

  async getMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const { password, resetToken, resetTokenExpiry, ...safeUser } = user as any;
    const permissions = (user as any).role?.permissions?.map((rp: any) => rp.permission.name) ?? [];
    return {
      ...safeUser,
      role: (user as any).role?.name ?? null,
      permissions,
    };
  }
}
