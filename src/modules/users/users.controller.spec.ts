import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('debe retornar la lista de usuarios', async () => {
      const mockUsers = [
        { id: 1, email: 'a@test.com', name: 'A', role: { name: 'admin' } },
        { id: 2, email: 'b@test.com', name: 'B', role: null },
      ];
      (usersService.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const result = await controller.findAll();
      expect(result).toEqual(mockUsers);
    });
  });

  // ---------------------------------------------------------------------------
  // getProfile
  // ---------------------------------------------------------------------------
  describe('getProfile', () => {
    it('debe retornar el perfil del usuario con rol como string y permisos', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        lastName: 'User',
        password: 'hashed',
        resetToken: null,
        resetTokenExpiry: null,
        role: {
          name: 'empleado',
          permissions: [
            { permission: { name: 'dashboard:view' } },
            { permission: { name: 'profile:view' } },
          ],
        },
        profileComplete: true,
      };
      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const req = { user: { userId: 1 } };
      const result = await controller.getProfile(req);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetToken');
      expect(result).toHaveProperty('role', 'empleado');
      expect(result).toHaveProperty('permissions', ['dashboard:view', 'profile:view']);
    });

    it('debe manejar usuario sin rol', async () => {
      const mockUser = {
        id: 2,
        email: 'norole@test.com',
        name: 'No Role',
        password: 'hashed',
        resetToken: null,
        resetTokenExpiry: null,
        role: null,
        profileComplete: false,
      };
      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const req = { user: { userId: 2 } };
      const result = await controller.getProfile(req);

      expect(result).toHaveProperty('role', null);
      expect(result).toHaveProperty('permissions', []);
    });

    it('debe retornar null si el usuario no existe', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      const req = { user: { userId: 999 } };
      const result = await controller.getProfile(req);
      expect(result).toBeNull();
    });

    it('debe lanzar error si no hay userId en el request', async () => {
      const req = { user: {} };

      await expect(controller.getProfile(req)).rejects.toThrow('User not found in request');
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------
  describe('updateProfile', () => {
    it('debe actualizar el perfil con fecha de nacimiento', async () => {
      const dto = {
        name: 'John',
        lastName: 'Doe',
        cedula: '12345',
        birthDate: '1990-01-15',
        phone: '555-1234',
        position: 'Developer',
      };
      const expected = { id: 1, ...dto, profileComplete: true };
      (usersService.updateProfile as jest.Mock).mockResolvedValue(expected);

      const req = { user: { userId: 1 } };
      const result = await controller.updateProfile(req, dto as any);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'John',
          birthDate: expect.any(Date),
        }),
      );
      expect(result).toEqual(expected);
    });

    it('debe propagar ConflictException de cédula duplicada', async () => {
      const dto = { name: 'John', cedula: 'DUPLICATE' };
      (usersService.updateProfile as jest.Mock).mockRejectedValue(
        new ConflictException('Esta cédula ya está registrada por otro usuario'),
      );

      const req = { user: { userId: 1 } };
      await expect(controller.updateProfile(req, dto as any)).rejects.toThrow(ConflictException);
    });
  });
});
