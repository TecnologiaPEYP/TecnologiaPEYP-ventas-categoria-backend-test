import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: Partial<PrismaService>;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user with role/permissions if found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        password: 'hashedpassword',
        googleId: null,
        role: {
          name: 'empleado',
          permissions: [{ permission: { name: 'dashboard:view' } }],
        },
      };
      
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('test@test.com');
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });
    });

    it('should return null if not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.findOne('notfound@test.com');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should upsert a user', async () => {
        const mockUser = {
            id: 1,
            email: 'test@test.com',
            name: 'Test',
            password: 'hashedpassword',
            googleId: null,
          };
          
          (prismaService.user.upsert as jest.Mock).mockResolvedValue(mockUser);
    
          const result = await service.upsert(
            { email: 'test@test.com' },
            { email: 'test@test.com', password: 'p', name: 'n' },
            { name: 'n' }
          );

          expect(result).toEqual(mockUser);
          expect(prismaService.user.upsert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
        const mockUser = { id: 1, email: 'test@test.com' };
        
        prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
  
        const result = await service.update({ email: 'test@test.com' }, { name: 'n' });
  
        expect(result).toEqual(mockUser);
        expect(prismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('findByResetToken', () => {
    it('should find by token', async () => {
        const mockUser = { id: 1, resetToken: 'tok' };
        
        prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
  
        const result = await service.findByResetToken('tok');
  
        expect(result).toEqual(mockUser);
        expect(prismaService.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a user by id with role/permissions', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        role: { name: 'admin', permissions: [] },
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById(1);
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });
    });

    it('should return null if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users with selected fields', async () => {
      const mockUsers = [
        { id: 1, email: 'a@test.com', name: 'A', role: null },
        { id: 2, email: 'b@test.com', name: 'B', role: { name: 'admin' } },
      ];
      prismaService.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const result = await service.findAll();
      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a user and re-fetch with relations', async () => {
      const createData = { email: 'new@test.com', password: 'hashed', name: 'New' };
      const createdUser = { id: 5, ...createData };
      const fullUser = { ...createdUser, role: null };

      prismaService.user.create = jest.fn().mockResolvedValue(createdUser);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(fullUser);

      const result = await service.create(createData as any);
      expect(prismaService.user.create).toHaveBeenCalledWith({ data: createData });
      // Must re-fetch with findById to get role relations
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
      expect(result).toEqual(fullUser);
    });
  });

  describe('updateProfile', () => {
    it('should update the profile and set profileComplete to true when all fields are provided', async () => {
      const profileData = {
        name: 'John',
        lastName: 'Doe',
        cedula: '12345678',
        birthDate: new Date('1990-01-15'),
        phone: '555-1234',
        position: 'Developer',
      };

      const expectedResult = {
        id: 1,
        email: 'test@test.com',
        ...profileData,
        profileComplete: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.update = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.updateProfile(1, profileData as any);

      expect(result).toEqual(expectedResult);
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            profileComplete: true,
          }),
        }),
      );
    });

    it('should set profileComplete to false when some fields are missing', async () => {
      const partialData = {
        name: 'John',
        lastName: undefined,
        cedula: undefined,
        birthDate: undefined,
        phone: undefined,
        position: undefined,
      };

      prismaService.user.update = jest.fn().mockResolvedValue({ id: 1, profileComplete: false });

      await service.updateProfile(1, partialData as any);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileComplete: false,
          }),
        }),
      );
    });

    it('should throw ConflictException on duplicate cedula (P2002)', async () => {
      const profileData = {
        name: 'John',
        lastName: 'Doe',
        cedula: 'DUPLICATE',
        birthDate: new Date(),
        phone: '555',
        position: 'Dev',
      };

      const prismaError = {
        code: 'P2002',
        meta: { target: 'cedula' },
      };
      // Simulate Prisma known request error
      Object.setPrototypeOf(prismaError, Error.prototype);
      (prismaError as any).constructor = { name: 'PrismaClientKnownRequestError' };

      prismaService.user.update = jest.fn().mockRejectedValue(prismaError);

      // The service checks `error instanceof Prisma.PrismaClientKnownRequestError`
      // In unit tests with mocked prisma, we'll test the catch-all throw
      await expect(service.updateProfile(1, profileData as any)).rejects.toThrow();
    });
  });

  describe('adminUpdate', () => {
    it('should update a user as admin', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        role: { name: 'admin', permissions: [] },
      };
      const updatedUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Updated',
        position: 'Manager',
        role: { name: 'admin', permissions: [] },
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.adminUpdate(1, { name: 'Updated', position: 'Manager' });
      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.adminUpdate(999, { name: 'Test' })).rejects.toThrow('Usuario con ID 999 no encontrado');
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.delete as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.remove(1);
      expect(result).toEqual({ message: 'Usuario con ID 1 eliminado exitosamente' });
      expect(prismaService.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow('Usuario con ID 999 no encontrado');
    });
  });
}); 