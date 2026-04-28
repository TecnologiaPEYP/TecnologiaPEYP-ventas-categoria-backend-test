import { Controller, Post, Body, UnauthorizedException, HttpException, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      const user = await this.authService.validateUser(body.email, body.password);
      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      return await this.authService.login(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new HttpException(
        { message: 'Error interno en login', detail: error?.message || String(error) },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
        return await this.authService.register(body);
    } catch (error) {
        if (error.code === 'P2002') {
             throw new HttpException('El correo ya está registrado', HttpStatus.CONFLICT);
        }
        throw error;
    }
  }

  @Post('google')
  async googleAuth(@Body() body: { email: string; name: string; googleId: string; }) {
      return this.authService.googleLogin(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }
}
