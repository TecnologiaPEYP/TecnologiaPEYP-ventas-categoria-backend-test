import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ role: 'user' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ role: 'admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ role: 'user' });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'superadmin']);

    const context = createMockContext({ role: 'superadmin' });
    expect(guard.canActivate(context)).toBe(true);
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
