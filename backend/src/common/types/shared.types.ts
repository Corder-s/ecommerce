export type UserRole = 'SUPER_ADMIN' | 'STORE_OWNER' | 'STORE_MANAGER' | 'STORE_STAFF' | 'CUSTOMER';

export interface TenantContext {
  tenantId: string;
  storeSlug: string;
}

export const VALIDATION_VERSION = '0.1.0';
