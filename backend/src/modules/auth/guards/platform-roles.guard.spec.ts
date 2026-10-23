import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PlatformRolesGuard } from './platform-roles.guard';
import { PlatformRole } from '@prisma/client';
import { AuthenticatedUser } from '../interfaces/auth.interface';

describe('PlatformRolesGuard (Platform-level Authorization)', () => {
  let guard: PlatformRolesGuard;
  let reflector: Reflector;

  const regularUser: AuthenticatedUser = {
    id: 'user-regular',
    name: 'Normal Seller',
    email: 'seller@example.com',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const superAdminUser: AuthenticatedUser = {
    id: 'user-admin',
    name: 'System Super Admin',
    email: 'admin@gaushilp.example',
    platformRole: PlatformRole.SUPER_ADMIN,
    memberships: [],
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PlatformRolesGuard(reflector);
  });

  const createMockContext = (user: any) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          // Attacker attempts to forge role in body or headers
          body: { platformRole: 'SUPER_ADMIN' },
          headers: { 'x-role': 'SUPER_ADMIN' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow access if route has no platform role requirement', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext(regularUser);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if user is not in request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformRole.SUPER_ADMIN]);

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject non-admin user attempting to access SUPER_ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformRole.SUPER_ADMIN]);

    const context = createMockContext(regularUser);
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Insufficient platform permissions. Required: [SUPER_ADMIN]'),
    );
  });

  it('should grant access to verified SUPER_ADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformRole.SUPER_ADMIN]);

    const context = createMockContext(superAdminUser);
    expect(guard.canActivate(context)).toBe(true);
  });
});
