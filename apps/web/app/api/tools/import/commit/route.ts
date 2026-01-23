import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { createAuditLog } from '@/lib/audit';
import { generateVoucherNumber } from '@/lib/voucher';
import { VoucherGroup } from '@/lib/importTools';

/**
 * POST /api/tools/import/commit
 * Import vouchers into database as DRAFT
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'vouchers', 'WRITE');

    const body = await request.json();
    const { vouchers }: { vouchers: any[] } = body;

    if (!vouchers || !Array.isArray(vouchers) || vouchers.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No vouchers provided',
        },
        { status: 400 }
      );
    }

    // Validate all vouchers have no errors
    const vouchersWithErrors = vouchers.filter((v) => v.errors && v.errors.length > 0);
    if (vouchersWithErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot import vouchers with errors. ${vouchersWithErrors.length} voucher(s) have errors.`,
        },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ voucherKey: string; error: string }>,
      voucherIds: [] as string[],
    };

    // Import each voucher in a transaction
    for (const voucher of vouchers) {
      try {
        // Convert date string to Date object
        const voucherDate = voucher.header.date instanceof Date
          ? voucher.header.date
          : new Date(voucher.header.date);

        if (isNaN(voucherDate.getTime())) {
          throw new Error('Invalid date');
        }

        // Generate voucher number
        const voucherNo = await generateVoucherNumber(auth.companyId, voucherDate);

        // Create voucher with lines in transaction
        const created = await prisma.$transaction(async (tx) => {
          const newVoucher = await tx.voucher.create({
            data: {
              companyId: auth.companyId,
              voucherNo,
              date: voucherDate,
              type: voucher.header.type || 'JOURNAL',
              status: 'DRAFT',
              narration: voucher.header.narration || null,
              createdByUserId: auth.userId,
              lines: {
                create: voucher.lines.map((line) => ({
                  companyId: auth.companyId,
                  accountId: line.accountId,
                  description: line.description || null,
                  debit: line.debit,
                  credit: line.credit,
                })),
              },
            },
            include: {
              lines: {
                include: {
                  account: {
                    select: { id: true, code: true, name: true },
                  },
                },
              },
            },
          });

          return newVoucher;
        });

        // Create audit log
        await createAuditLog({
          companyId: auth.companyId,
          actorUserId: auth.userId,
          entityType: 'VOUCHER',
          entityId: created.id,
          action: 'CREATE',
          after: created,
          request,
        });

        results.imported++;
        results.voucherIds.push(created.id);
      } catch (error) {
        results.skipped++;
        results.errors.push({
          voucherKey: voucher.key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: results,
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
