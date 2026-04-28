import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      permission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('debe retornar todos los permisos ordenados por módulo y acción', async () => {
      const mockPerms = [
        { id: 1, name: 'dashboard:view', module: 'dashboard', action: 'view' },
        { id: 2, name: 'users:manage', module: 'users', action: 'manage' },
      ];
      prisma.permission.findMany.mockResolvedValue(mockPerms);

      const result = await service.findAll();
      expect(result).toEqual(mockPerms);
      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findByModule
  // ---------------------------------------------------------------------------
  describe('findByModule', () => {
    it('debe retornar permisos de un módulo específico', async () => {
      const mockPerms = [
        { id: 1, name: 'users:view', module: 'users', action: 'view' },
        { id: 2, name: 'users:manage', module: 'users', action: 'manage' },
      ];
      prisma.permission.findMany.mockResolvedValue(mockPerms);

      const result = await service.findByModule('users');
      expect(result).toEqual(mockPerms);
      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: { module: 'users' },
        orderBy: { action: 'asc' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('debe retornar un permiso por ID', async () => {
      const mockPerm = { id: 1, name: 'dashboard:view' };
      prisma.permission.findUnique.mockResolvedValue(mockPerm);

      const result = await service.findOne(1);
      expect(result).toEqual(mockPerm);
    });

    it('debe lanzar NotFoundException si el permiso no existe', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('debe crear un nuevo permiso', async () => {
      prisma.permission.findUnique.mockResolvedValue(null); // No duplicate
      const data = { name: 'reports:view', module: 'reports', action: 'view', description: 'Ver reportes' };
      prisma.permission.create.mockResolvedValue({ id: 13, ...data });

      const result = await service.create(data);
      expect(result).toHaveProperty('id', 13);
      expect(prisma.permission.create).toHaveBeenCalledWith({ data });
    });

    it('debe lanzar ConflictException si el nombre ya existe', async () => {
      prisma.permission.findUnique.mockResolvedValue({ id: 1, name: 'dashboard:view' });

      await expect(
        service.create({ name: 'dashboard:view', module: 'dashboard', action: 'view' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('debe eliminar un permiso existente', async () => {
      prisma.permission.findUnique.mockResolvedValue({ id: 5, name: 'old:perm' });
      prisma.permission.delete.mockResolvedValue({ id: 5 });

      await service.remove(5);
      expect(prisma.permission.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('debe lanzar NotFoundException si el permiso no existe', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getModules
  // ---------------------------------------------------------------------------
  describe('getModules', () => {
    it('debe retornar lista de módulos distintos', async () => {
      prisma.permission.findMany.mockResolvedValue([
        { module: 'dashboard' },
        { module: 'users' },
        { module: 'settings' },
      ]);

      const result = await service.getModules();
      expect(result).toEqual(['dashboard', 'users', 'settings']);
      expect(prisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { module: true },
          distinct: ['module'],
        }),
      );
    });
  });
});
