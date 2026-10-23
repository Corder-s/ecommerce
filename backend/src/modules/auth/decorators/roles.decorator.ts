import { SetMetadata } from '@nestjs/common';
import { PlatformRole, TenantRole } from '@prisma/client';

export const PLATFORM_ROLES_KEY = 'platformRoles';
export const RequirePlatformRole = (...roles: PlatformRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);
export const Roles = RequirePlatformRole;

export const TENANT_ROLES_KEY = 'tenantRoles';
export const RequireTenantRole = (...roles: TenantRole[]) => SetMetadata(TENANT_ROLES_KEY, roles);
