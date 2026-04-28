import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let permissionsService: Partial<PermissionsService>;

  beforeEach(async () => {
    permissionsService = {
      findAll: jest.fn(),
      findByModule: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      getModules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        { provide: PermissionsService, useValue: permissionsService },
        { provide: PrismaService, useValue: { permission: {} } },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar todos los permisos', async () => {
      const mockPerms = [{ id: 1, name: 'dashboard:view' }];
      (permissionsService.findAll as jest.Mock).mockResolvedValue(mockPerms);

      const result = await controller.findAll();
      expect(result).toEqual(mockPerms);
    });
  });

  describe('getModules', () => {
    it('debe retornar lista de módulos', async () => {
      const modules = ['dashboard', 'users', 'settings'];
      (permissionsService.getModules as jest.Mock).mockResolvedValue(modules);

      const result = await controller.getModules();
      expect(result).toEqual(modules);
    });
  });

  describe('findByModule', () => {
    it('debe retornar permisos de un módulo', async () => {
      const mockPerms = [{ id: 1, name: 'users:view' }, { id: 2, name: 'users:manage' }];
      (permissionsService.findByModule as jest.Mock).mockResolvedValue(mockPerms);

      const result = await controller.findByModule('users');
      expect(result).toEqual(mockPerms);
      expect(permissionsService.findByModule).toHaveBeenCalledWith('users');
    });
  });

  describe('create', () => {
    it('debe crear un nuevo permiso', async () => {
      const dto = { name: 'reports:view', module: 'reports', action: 'view' };
      const created = { id: 13, ...dto };
      (permissionsService.create as jest.Mock).mockResolvedValue(created);

      const result = await controller.create(dto);
      expect(result).toEqual(created);
      expect(permissionsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('remove', () => {
    it('debe eliminar un permiso', async () => {
      (permissionsService.remove as jest.Mock).mockResolvedValue({ id: 5 });

      const result = await controller.remove(5);
      expect(result).toEqual({ id: 5 });
      expect(permissionsService.remove).toHaveBeenCalledWith(5);
    });
  });
});
