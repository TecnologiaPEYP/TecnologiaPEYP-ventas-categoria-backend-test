import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prisma: any;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new PermissionsGuard(reflector, prisma as PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('debe permitir acceso cuando no se requieren permisos', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ userId: 1, role: 'user' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso cuando la lista de permisos está vacía', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const context = createMockContext({ userId: 1, role: 'user' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('debe lanzar ForbiddenException si no hay usuario en el request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:view']);

    const context = createMockContext(null);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene rol', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:view']);
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: null });

    const context = createMockContext({ userId: 1 });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('debe permitir acceso al rol admin sin verificar permisos', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:view', 'users:manage']);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: { name: 'admin', permissions: [] },
    });

    const context = createMockContext({ userId: 1 });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso si el usuario tiene todos los permisos requeridos', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['dashboard:view']);
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      role: {
        name: 'empleado',
        permissions: [
          { permission: { name: 'dashboard:view' } },
          { permission: { name: 'profile:view' } },
        ],
      },
    });

    const context = createMockContext({ userId: 2 });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('debe denegar acceso si el usuario no tiene el permiso requerido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:manage']);
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      role: {
        name: 'empleado',
        permissions: [
          { permission: { name: 'dashboard:view' } },
        ],
      },
    });

    const context = createMockContext({ userId: 2 });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('debe requerir TODOS los permisos (AND logic)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:view', 'users:manage']);
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      role: {
        name: 'supervisor',
        permissions: [
          { permission: { name: 'users:view' } },
         
        ],
      },
    });

    const context = createMockContext({ userId: 2 });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

function createMockContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}
