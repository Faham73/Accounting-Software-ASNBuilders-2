import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { createAuditLog } from '@/lib/audit';
import { validateVoucherBalance, isLeafAccount } from '@/lib/voucher';

/**
 * POST /api/vouchers/[id]/post
 * Post a draft voucher (change status to POSTED)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'vouchers', 'POST');

    const voucher = await prisma.voucher.findUnique({
      where: { id: params.id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!voucher || voucher.companyId !== auth.companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Voucher not found',
        },
        { status: 404 }
      );
    }

    // Only DRAFT vouchers can be posted
    if (voucher.status !== 'DRAFT') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Only DRAFT vouchers can be posted',
        },
        { status: 400 }
      );
    }

    // Validate balance
    const balanceCheck = validateVoucherBalance(
      voucher.lines.map((line) => ({
        debit: Number(line.debit),
        credit: Number(line.credit),
      }))
    );
    if (!balanceCheck.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: balanceCheck.error,
        },
        { status: 400 }
      );
    }

    // Validate all accounts are active
    const inactiveAccounts = voucher.lines.filter((line) => !line.account.isActive);
    if (inactiveAccounts.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cannot post voucher with inactive accounts',
        },
        { status: 400 }
      );
    }

    // Validate all accounts are leaf accounts (no children)
    for (const line of voucher.lines) {
      const isLeaf = await isLeafAccount(line.accountId);
      if (!isLeaf) {
        return NextResponse.json(
          {
            ok: false,
            error: `Account ${line.account.code} (${line.account.name}) is not a leaf account and cannot be used in voucher lines`,
          },
          { status: 400 }
        );
      }
    }

    const before = { ...voucher };

    // Update voucher status to POSTED
    const updated = await prisma.voucher.update({
      where: { id: params.id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedByUserId: auth.userId,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        postedBy: {
          select: { id: true, name: true, email: true },
        },
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'VOUCHER',
      entityId: updated.id,
      action: 'POST',
      before,
      after: updated,
      request,
    });

    return NextResponse.json({
      ok: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return createErrorResponse(error, 401);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse(error, 403);
    }
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'), 500);
  }
}
