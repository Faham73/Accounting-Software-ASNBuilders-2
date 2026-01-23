import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { ProjectCostSummaryFiltersSchema } from '@accounting/shared';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { getProjectAllocatedOverhead } from '@/lib/reports/overhead';

/**
 * GET /api/projects/[id]/cost-summary
 * Get project cost summary grouped by cost category
 * Only includes expense lines from POSTED vouchers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'projects', 'READ');

    // Verify project exists and belongs to user's company
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const includeAllocatedOverhead = searchParams.get('includeAllocatedOverhead') === 'true';
    const filters = ProjectCostSummaryFiltersSchema.parse({
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      vendorId: searchParams.get('vendorId') || undefined,
      costHeadId: searchParams.get('costHeadId') || undefined,
      category: searchParams.get('category') || undefined,
      paymentMethodId: searchParams.get('paymentMethodId') || undefined,
    });

    // Build voucher where clause first
    const voucherWhere: Prisma.VoucherWhereInput = {
      status: 'POSTED', // Only POSTED vouchers
      companyId: auth.companyId,
    };

    // Date range filter on voucher
    if (filters.from || filters.to) {
      voucherWhere.date = {};
      if (filters.from) {
        voucherWhere.date.gte = new Date(filters.from);
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        voucherWhere.date.lte = toDate;
      }
    }

    // Build where clause for expense lines only
    const where: Prisma.VoucherLineWhereInput = {
      companyId: auth.companyId,
      account: {
        type: 'EXPENSE', // Only expense accounts
      },
      voucher: voucherWhere,
      // Project matching: prefer line.projectId, fallback to voucher.projectId
      OR: [
        { projectId: params.id },
        {
          AND: [
            { projectId: null },
            { voucher: { ...voucherWhere, projectId: params.id } },
          ],
        },
      ],
    };

    // Additional filters
    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }
    if (filters.costHeadId) {
      where.costHeadId = filters.costHeadId;
    }
    if (filters.paymentMethodId) {
      where.paymentMethodId = filters.paymentMethodId;
    }

    // Category filter
    if (filters.category) {
      where.costHead = {
        projectCostCategoryMaps: {
          some: {
            companyId: auth.companyId,
            category: filters.category,
            isActive: true,
          },
        },
      };
    }

    // Get all expense lines for the project
    const lines = await prisma.voucherLine.findMany({
      where,
      include: {
        costHead: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get all cost category mappings for this company
    const categoryMaps = await prisma.projectCostCategoryMap.findMany({
      where: {
        companyId: auth.companyId,
        isActive: true,
      },
      select: {
        costHeadId: true,
        category: true,
        costHead: {
          select: {
            name: true,
          },
        },
      },
    });

    const categoryMapByCostHead = new Map(
      categoryMaps.map((map) => [map.costHeadId, map.category])
    );

    // Group by category
    const categoryTotals = new Map<
      'CIVIL' | 'MATERIALS' | 'MATI_KATA' | 'DHALAI' | 'OTHERS',
      number
    >();

    // Initialize all categories
    const categories: Array<'CIVIL' | 'MATERIALS' | 'MATI_KATA' | 'DHALAI' | 'OTHERS'> = [
      'CIVIL',
      'MATERIALS',
      'MATI_KATA',
      'DHALAI',
      'OTHERS',
    ];
    categories.forEach((cat) => categoryTotals.set(cat, 0));

    // Calculate cost per line: debit - credit (returns reduce cost)
    lines.forEach((line) => {
      const costAmount = Number(line.debit) - Number(line.credit);
      const category = line.costHeadId
        ? categoryMapByCostHead.get(line.costHeadId) || 'OTHERS'
        : 'OTHERS';
      categoryTotals.set(category, categoryTotals.get(category)! + costAmount);
    });

    // Build summary by category
    const summaryByCategory = categories.map((category) => {
      const amount = categoryTotals.get(category) || 0;
      return {
        key: category,
        name: category
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        amount,
      };
    });

    // Calculate grand total
    let totalCost = Array.from(categoryTotals.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    // Add allocated overhead if requested
    let allocatedOverhead = 0;
    if (includeAllocatedOverhead && filters.from && filters.to) {
      // Calculate allocated overhead for each month in the date range
      const fromDate = new Date(filters.from);
      const toDate = new Date(filters.to);
      const currentMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      
      while (currentMonth <= toDate) {
        const monthAllocated = await getProjectAllocatedOverhead(
          auth.companyId,
          params.id,
          currentMonth
        );
        allocatedOverhead += monthAllocated;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      totalCost += allocatedOverhead;
    }

    return NextResponse.json({
      ok: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
        },
        filtersApplied: {
          from: filters.from,
          to: filters.to,
          vendorId: filters.vendorId,
          costHeadId: filters.costHeadId,
          category: filters.category,
          paymentMethodId: filters.paymentMethodId,
          includeAllocatedOverhead,
        },
        summaryByCategory,
        grandTotals: {
          totalCost,
          allocatedOverhead: includeAllocatedOverhead ? allocatedOverhead : undefined,
        },
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
