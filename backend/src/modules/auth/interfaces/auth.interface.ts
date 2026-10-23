import {
  PlatformRole,
  TenantRole,
  MembershipStatus,
  UserStatus,
  TenantStatus,
} from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  platformRole: PlatformRole;
  status?: UserStatus;
  memberships: {
    id: string;
    tenantId: string;
    role: TenantRole;
    status: MembershipStatus;
    tenantStatus?: TenantStatus;
  }[];
}

export interface VerifiedTokenPayload {
  sub: string;
  iss?: string;
  aud?: string | string[];
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
  membershipId: string;
  status: MembershipStatus;
}
