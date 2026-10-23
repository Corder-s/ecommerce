import { Reflector } from '@nestjs/core';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantAccessGuard } from './tenant-access.guard';
import { PlatformRole, TenantRole, MembershipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../interfaces/auth.interface';

describe('TenantAccessGuard (Tenant Isolation & Authorization)', () => {
  let guard: TenantAccessGuard;
  let reflector: Reflector;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    name: 'Artisan Ramesh',
    email: 'ramesh@example.com',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'membership-1',
        tenantId: 'tenant-diyas-1',
        role: TenantRole.STORE_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      {
        id: 'membership-2',
        tenantId: 'tenant-dhoop-2',
        role: TenantRole.CUSTOMER,
        status: MembershipStatus.ACTIVE,
      },
    ],
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantAccessGuard(reflector);
  });

  const createMockContext = (requestData: Record<string, any>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => requestData,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should throw UnauthorizedException if user is not authenticated', () => {
    const context = createMockContext({
      headers: { 'x-tenant-id': 'tenant-diyas-1' },
      user: undefined,
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException if tenant context is missing', () => {
    const context = createMockContext({
      headers: {},
      params: {},
      query: {},
      user: mockUser,
    });

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('should grant access to authorised tenant and populate tenantContext', () => {
    const request = {
      headers: { 'x-tenant-id': 'tenant-diyas-1' },
      params: {},
      query: {},
      user: mockUser,
    };
    const context = createMockContext(request);

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const allowed = guard.canActivate(context);

    expect(allowed).toBe(true);
    expect((request as any).tenantContext).toEqual({
      tenantId: 'tenant-diyas-1',
      role: TenantRole.STORE_OWNER,
      membershipId: 'membership-1',
      status: MembershipStatus.ACTIVE,
    });
  });

  it('should reject unauthorized cross-tenant requests with ForbiddenException', () => {
    const request = {
      headers: { 'x-tenant-id': 'tenant-unauthorized-3' },
      params: {},
      query: {},
      user: mockUser,
    };
    const context = createMockContext(request);

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(
        'Cross-tenant access rejected: You do not have an active membership in tenant "tenant-unauthorized-3".',
      ),
    );
  });

  it('should reject access if user role within tenant is insufficient', () => {
    // User is only a CUSTOMER in tenant-dhoop-2, but endpoint requires STORE_OWNER
    const request = {
      headers: { 'x-tenant-id': 'tenant-dhoop-2' },
      params: {},
      query: {},
      user: mockUser,
    };
    const context = createMockContext(request);

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user role matches required role', () => {
    // User is STORE_OWNER in tenant-diyas-1
    const request = {
      headers: { 'x-tenant-id': 'tenant-diyas-1' },
      params: {},
      query: {},
      user: mockUser,
    };
    const context = createMockContext(request);

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([TenantRole.STORE_OWNER]);

    const allowed = guard.canActivate(context);
    expect(allowed).toBe(true);
  });
});
