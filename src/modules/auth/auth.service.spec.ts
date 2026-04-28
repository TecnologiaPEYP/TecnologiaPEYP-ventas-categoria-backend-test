import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';


// Mock de bcrypt para no hacer hashing real (lento) y controlar resultados
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

let prismaService: Partial<PrismaService>;
let usersService: Partial<UsersService>;
let jwtService: Partial<JwtService>;
let mailService: Partial<MailService>;
let service: AuthService;

describe('AuthService', () => {
  beforeEach(() => {
    prismaService = {
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'empleado' }),
      },
      user: {
        create: jest.fn().mockImplementation(({ data }) => {
          // Si es registro normal, simula usuario con role null (será re-fetch con findOne)
          if (data.password) {
            return {
              id: 1,
              ...data,
              profileComplete: false,
              role: null,
              permissions: [],
            };
          }
          // Si es Google, simula usuario con role empleado
          return {
            id: 1,
            ...data,
            profileComplete: false,
            role: { name: 'empleado', permissions: [] },
            permissions: [],
          };
        }),
      },
    };
    usersService = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      findByResetToken: jest.fn(),
    };
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock de las dependencias
    usersService = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findByResetToken: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked_token'),
    };

    mailService = {
      sendPasswordReset: jest.fn(),
    };

    prismaService = {
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'empleado' }),
      },
      user: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 1,
          ...data,
          profileComplete: false,
          role: { name: 'empleado', permissions: [] },
          permissions: [],
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // validateUser (Verificación de Contraseña)
  // ---------------------------------------------------------------------------
  describe('validateUser', () => {
    it('debe devolver los datos del usuario (sin password) si la contraseña es correcta', async () => {
      const mockUser = { id: 1, email: 'test@test.com', password: 'hashed_password', name: 'Test' };
      
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Contraseñas coinciden

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toEqual({ id: 1, email: 'test@test.com', name: 'Test' }); // Comprobamos que NO devuelve el password
      expect(usersService.findOne).toHaveBeenCalledWith('test@test.com');
    });

    it('debe devolver null si el usuario no existe', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);
      
      const result = await service.validateUser('test@test.com', 'password123');
      expect(result).toBeNull();
    });

    it('debe devolver null si la contraseña es incorrecta', async () => {
      const mockUser = { id: 1, email: 'test@test.com', password: 'hashed_password' };
      
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Contraseñas NO coinciden

      const result = await service.validateUser('test@test.com', 'wrong_password');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // login (Generación de Token)
  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('debe devolver un access token y datos del usuario con permisos', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        profileComplete: false,
        role: {
          name: 'empleado',
          permissions: [
            { permission: { name: 'dashboard:view' } },
            { permission: { name: 'profile:view' } },
          ],
        },
      };
      const result = await service.login(user);
      
      expect(result).toHaveProperty('access_token', 'mocked_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('profileComplete', false);
      expect(result.user).toHaveProperty('role', 'empleado');
      expect(result.user).toHaveProperty('permissions', ['dashboard:view', 'profile:view']);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: 'empleado',
        permissions: ['dashboard:view', 'profile:view'],
      });
    });

    it('debe manejar usuario sin rol asignado', async () => {
      const user = { id: 2, email: 'norole@test.com', name: 'No Role', profileComplete: false, role: null };
      const result = await service.login(user);

      expect(result.user.role).toBeNull();
      expect(result.user.permissions).toEqual([]);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: null,
        permissions: [],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // register (Registro normal)
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('debe hashear la contraseña, crear el usuario y devolver token (auto-login)', async () => {
      const registerData = { email: 'new@test.com', password: 'plain', name: 'New User' };
      const hashedPassword = 'hashed_123';
      const createdUser = {
        id: 1,
        email: 'new@test.com',
        name: 'New User',
        password: hashedPassword,
        profileComplete: false,
        role: null,
      };
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (usersService.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.register(registerData);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({
        password: hashedPassword,
      }));
      expect(result).toHaveProperty('access_token', 'mocked_token');
      expect(result).toHaveProperty('user');
      expect(result.user.permissions).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // googleLogin
  // ---------------------------------------------------------------------------
  describe('googleLogin', () => {
    it('debe hacer login exitoso: update + re-fetch con relaciones', async () => {
      const googleDto = { email: 'google@test.com', name: 'Google User', googleId: '12345' };
      const savedUser = { id: 1, ...googleDto, role: { name: 'empleado', permissions: [] } };
      const userWithRole = {
        id: 1,
        ...googleDto,
        role: { name: 'empleado', permissions: [{ permission: { name: 'dashboard:view' } }] },
      };

      (usersService.update as jest.Mock).mockResolvedValue(savedUser);
      (usersService.findOne as jest.Mock).mockResolvedValue(userWithRole);

      const loginSpy = jest.spyOn(service, 'login').mockResolvedValue({});

      await service.googleLogin(googleDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith('google@test.com');
      expect(loginSpy).toHaveBeenCalledWith(userWithRole);
    });

    it('debe lanzar UnauthorizedException si no hay email', async () => {
        const invalidDto = { email: '', name: 'No Email', googleId: '123' };
        
        await expect(service.googleLogin(invalidDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('debe enviar un correo si el usuario existe', async () => {
      // Mock de usuario existente
      const mockUser = { 
        id: 1, 
        email: 'test@test.com', 
        name: 'Test', 
        password: 'pass', 
        googleId: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (usersService.update as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await service.forgotPassword('test@test.com');
      
      expect(usersService.findOne).toHaveBeenCalledWith('test@test.com');
      expect(usersService.update).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });

    it('debe lanzar BadRequestException si el usuario no existe', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);
      
      await expect(service.forgotPassword('unknown@test.com')).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('debe resetear la contraseña con un token valido', async () => {
      const mockUser = { 
        id: 1, 
        email: 'test@example.com',
        resetToken: 'valid_token', 
        resetTokenExpiry: new Date(Date.now() + 10000) 
      };
      (usersService.findByResetToken as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      (usersService.update as jest.Mock).mockResolvedValue(mockUser);

      await service.resetPassword('valid_token', 'new_password');

      expect(usersService.update).toHaveBeenCalledWith(
        { id: 1 }, 
        expect.objectContaining({ 
            password: 'hashed_new_password',
            resetToken: null 
        })
      );
    });

    it('debe lanzar BadRequestException si el token es invalido o expirado', async () => {
      (usersService.findByResetToken as jest.Mock).mockResolvedValue(null);
      
      await expect(service.resetPassword('invalid', 'new')).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getMe (Obtener datos del usuario autenticado)
  // ---------------------------------------------------------------------------
  describe('getMe', () => {
    it('debe devolver los datos del usuario con rol y permisos como strings', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        lastName: 'User',
        cedula: '12345',
        birthDate: new Date(),
        phone: '555-1234',
        position: 'Dev',
        profileComplete: true,
        role: {
          name: 'empleado',
          permissions: [
            { permission: { name: 'dashboard:view' } },
            { permission: { name: 'profile:view' } },
          ],
        },
        password: 'hashed',
        resetToken: null,
        resetTokenExpiry: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe(1);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetToken');
      expect(result).not.toHaveProperty('resetTokenExpiry');
      expect(result).toHaveProperty('email', 'test@test.com');
      expect(result).toHaveProperty('profileComplete', true);
      expect(result).toHaveProperty('role', 'empleado');
      expect(result).toHaveProperty('permissions', ['dashboard:view', 'profile:view']);
    });

    it('debe manejar usuario sin rol', async () => {
      const mockUser = {
        id: 2,
        email: 'norole@test.com',
        name: 'No Role',
        role: null,
        password: 'hashed',
        resetToken: null,
        resetTokenExpiry: null,
      };

      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe(2);
      expect(result).toHaveProperty('role', null);
      expect(result).toHaveProperty('permissions', []);
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
    });
  });
});
