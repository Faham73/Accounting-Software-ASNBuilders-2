import { UserRole } from '@accounting/db';

export type Resource = 'companies' | 'projects' | 'vendors' | 'costHeads' | 'paymentMethods' | 'chartOfAccounts' | 'vouchers';
export type Action = 'READ' | 'WRITE' | 'POST';

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
