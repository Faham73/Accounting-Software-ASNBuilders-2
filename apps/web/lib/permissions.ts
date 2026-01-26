/**
 * Client-safe permission helpers. No server-only imports (no @accounting/db, next/headers, etc.).
 * Use requireAuthServer / requirePermissionServer from @/lib/rbac in Server Components only.
 */
export type UserRole =
  | 'ADMIN'
  | 'ACCOUNTANT'
  | 'ENGINEER'
  | 'DATA_ENTRY'
  | 'VIEWER';

export type Resource = 'companies' | 'projects' | 'vendors' | 'costHeads' | 'paymentMethods' | 'chartOfAccounts' | 'vouchers' | 'purchases' | 'products' | 'warehouses' | 'expenses';
export type Action = 'READ' | 'WRITE' | 'POST' | 'APPROVE';

/**
 * Permissions map defining which roles can perform which actions on which resources
 */
export const permissions: Record<Resource, Partial<Record<Action, UserRole[]>>> = {
  companies: {
    READ: ['ADMIN'],
    WRITE: ['ADMIN'],
  },
  projects: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  vendors: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  costHeads: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  paymentMethods: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  chartOfAccounts: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  vouchers: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
    POST: ['ADMIN', 'ACCOUNTANT'],
    APPROVE: ['ADMIN', 'ACCOUNTANT'],
  },
  purchases: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  products: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  warehouses: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
  expenses: {
    READ: ['ADMIN', 'ACCOUNTANT', 'ENGINEER', 'DATA_ENTRY', 'VIEWER'],
    WRITE: ['ADMIN', 'ACCOUNTANT'],
  },
};

/**
 * Check if a role can perform an action on a resource
 */
export function can(role: UserRole, resource: Resource, action: Action): boolean {
  const allowedRoles = permissions[resource]?.[action];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(role);
}
