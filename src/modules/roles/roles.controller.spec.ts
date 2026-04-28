import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './services/roles.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: Partial<RolesService>;

  beforeEach(async () => {
    rolesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignRoleToUser: jest.fn(),
      removeRoleFromUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: rolesService },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar todos los roles', async () => {
      const mockRoles = [{ id: 1, name: 'admin' }, { id: 2, name: 'empleado' }];
      (rolesService.findAll as jest.Mock).mockResolvedValue(mockRoles);

      const result = await controller.findAll();
      expect(result).toEqual(mockRoles);
    });
  });

  describe('findOne', () => {
    it('debe retornar un rol por id', async () => {
      const mockRole = { id: 1, name: 'admin' };
      (rolesService.findOne as jest.Mock).mockResolvedValue(mockRole);

      const result = await controller.findOne(1);
      expect(result).toEqual(mockRole);
      expect(rolesService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('debe crear un rol', async () => {
      const dto = { name: 'nuevo', description: 'Test', permissionIds: [1, 2] };
      const created = { id: 3, ...dto };
      (rolesService.create as jest.Mock).mockResolvedValue(created);

      const result = await controller.create(dto);
      expect(result).toEqual(created);
      expect(rolesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('debe actualizar un rol', async () => {
      const dto = { name: 'updated', permissionIds: [3] };
      const updated = { id: 1, ...dto };
      (rolesService.update as jest.Mock).mockResolvedValue(updated);

      const result = await controller.update(1, dto);
      expect(result).toEqual(updated);
      expect(rolesService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('debe eliminar un rol', async () => {
      (rolesService.remove as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await controller.remove(1);
      expect(result).toEqual({ id: 1 });
      expect(rolesService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('assignRole', () => {
    it('debe asignar un rol a un usuario', async () => {
      const dto = { userId: 10, roleId: 1 };
      const mockResult = { id: 10, email: 'test@test.com', role: { name: 'admin' } };
      (rolesService.assignRoleToUser as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.assignRole(dto);
      expect(result).toEqual(mockResult);
      expect(rolesService.assignRoleToUser).toHaveBeenCalledWith(10, 1);
    });
  });

  describe('removeFromUser', () => {
    it('debe remover el rol de un usuario', async () => {
      const mockResult = { id: 10, email: 'test@test.com', role: null };
      (rolesService.removeRoleFromUser as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.removeFromUser(10);
      expect(result).toEqual(mockResult);
      expect(rolesService.removeRoleFromUser).toHaveBeenCalledWith(10);
    });
  });
});
