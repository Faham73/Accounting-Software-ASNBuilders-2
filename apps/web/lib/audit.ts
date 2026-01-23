import { NextRequest } from 'next/server';
import { prisma } from '@accounting/db';

export type EntityType = 'ACCOUNT' | 'VOUCHER' | 'VOUCHER_LINE';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'POST';

interface CreateAuditLogParams {
  companyId: string;
  actorUserId: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  before?: any;
  after?: any;
  request?: NextRequest;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog({
  companyId,
  actorUserId,
  entityType,
  entityId,
  action,
  before,
  after,
  request,
}: CreateAuditLogParams) {
  await prisma.auditLog.create({
    data: {
      companyId,
      actorUserId,
      entityType,
      entityId,
      action,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
    },
  });
}
