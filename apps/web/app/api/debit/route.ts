import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { ZodError } from 'zod';
import { z } from 'zod';
import { getCompanyTotals } from '@/lib/projects/projectTotals.server';

const DebitListFiltersSchema = z.object({
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
});

/**
 * GET /api/debit
 * List debit entries (voucher lines) company-wide with optional project filter
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'vouchers', 'READ');

    const { searchParams } = new URL(request.url);
    const filters = DebitListFiltersSchema.parse({
      projectId: searchParams.get('projectId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '25',
    });

    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 25;

    const where: any = {
      companyId: auth.companyId,
      debit: { gt: 0 },
    };

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    const voucherDateFilter: any = {};
    if (filters.dateFrom) {
      voucherDateFilter.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      voucherDateFilter.lte = filters.dateTo;
    }

    if (Object.keys(voucherDateFilter).length > 0) {
      where.voucher = {
        date: voucherDateFilter,
      };
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [debitLines, total, totals] = await Promise.all([
      prisma.voucherLine.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          voucher: {
            select: {
              id: true,
              voucherNo: true,
              date: true,
              type: true,
              narration: true,
            },
          },
          account: {
            select: { id: true, code: true, name: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.voucherLine.count({ where }),
      getCompanyTotals(auth.companyId, filters.projectId),
    ]);

    return NextResponse.json({
      ok: true,
      data: debitLines,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      totals: {
        debit: totals.debit,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.errors[0]?.message || 'Validation error',
        },
        { status: 400 }
      );
    }
    if (error instanceof UnauthorizedError) {
      return createErrorResponse(error, 401);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse(error, 403);
    }
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'), 500);
  }
}
