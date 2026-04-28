import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('debe retornar todos los roles con permisos y conteo de usuarios', async () => {
      const mockRoles = [
        { id: 1, name: 'admin', permissions: [], _count: { users: 2 } },
        { id: 2, name: 'empleado', permissions: [], _count: { users: 5 } },
      ];
      prisma.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll();

      expect(result).toEqual(mockRoles);
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { users: true } },
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('debe retornar un rol por ID', async () => {
      const mockRole = { id: 1, name: 'admin', permissions: [], _count: { users: 2 } };
      prisma.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOne(1);
      expect(result).toEqual(mockRole);
    });

    it('debe lanzar NotFoundException si el rol no existe', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('debe crear un rol con permisos', async () => {
      prisma.role.findUnique.mockResolvedValue(null); // No duplicate
      const created = { id: 3, name: 'supervisor', permissions: [] };
      prisma.role.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'supervisor',
        description: 'Supervisor role',
        permissionIds: [1, 2],
      });

      expect(result).toEqual(created);
      expect(prisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'supervisor',
            description: 'Supervisor role',
          }),
        }),
      );
    });

    it('debe crear un rol sin permisos', async () => {
      prisma.role.findUnique.mockResolvedValue(null);
      const created = { id: 4, name: 'viewer', permissions: [] };
      prisma.role.create.mockResolvedValue(created);

      const result = await service.create({ name: 'viewer' });
      expect(result).toEqual(created);
    });

    it('debe lanzar ConflictException si el nombre ya existe', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin' });

      await expect(
        service.create({ name: 'admin' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('debe actualizar un rol y reemplazar permisos', async () => {
      // findOne (verify exists)
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin', permissions: [], _count: { users: 1 } });
      prisma.rolePermission.deleteMany.mockResolvedValue({ count: 3 });
      prisma.role.update.mockResolvedValue({ id: 1, name: 'admin-updated' });

      const result = await service.update(1, {
        name: 'admin-updated',
        permissionIds: [4, 5],
      });

      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1 } });
      expect(prisma.role.update).toHaveBeenCalled();
      expect(result.name).toBe('admin-updated');
    });

    it('debe lanzar NotFoundException si el rol no existe', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('debe eliminar un rol existente', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 2, name: 'old', permissions: [], _count: { users: 0 } });
      prisma.role.delete.mockResolvedValue({ id: 2 });

      await service.remove(2);
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    });

    it('debe lanzar NotFoundException si el rol no existe', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // assignRoleToUser
  // ---------------------------------------------------------------------------
  describe('assignRoleToUser', () => {
    it('debe asignar un rol a un usuario', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin', permissions: [], _count: { users: 1 } });
      prisma.user.findUnique.mockResolvedValue({ id: 10, email: 'user@test.com' });
      prisma.user.update.mockResolvedValue({ id: 10, email: 'user@test.com', role: { name: 'admin' } });

      const result = await service.assignRoleToUser(10, 1);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { roleId: 1 },
        }),
      );
      expect(result).toHaveProperty('role');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin', permissions: [], _count: { users: 1 } });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el rol no existe', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(10, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // removeRoleFromUser
  // ---------------------------------------------------------------------------
  describe('removeRoleFromUser', () => {
    it('debe remover el rol de un usuario', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 10, email: 'user@test.com' });
      prisma.user.update.mockResolvedValue({ id: 10, email: 'user@test.com', role: null });

      const result = await service.removeRoleFromUser(10);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { roleId: null },
        }),
      );
      expect(result.role).toBeNull();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.removeRoleFromUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPermissions
  // ---------------------------------------------------------------------------
  describe('getUserPermissions', () => {
    it('debe retornar los nombres de permisos del usuario', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: {
          permissions: [
            { permission: { name: 'dashboard:view' } },
            { permission: { name: 'users:manage' } },
          ],
        },
      });

      const result = await service.getUserPermissions(1);
      expect(result).toEqual(['dashboard:view', 'users:manage']);
    });

    it('debe retornar array vacío si el usuario no tiene rol', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2, role: null });

      const result = await service.getUserPermissions(2);
      expect(result).toEqual([]);
    });
  });
});
