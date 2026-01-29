import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { PurchaseCreateSchema, PurchaseListFiltersSchema } from '@accounting/shared';
import { ZodError } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';

/**
 * GET /api/purchases
 * List purchases for user's company with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'purchases', 'READ');

    const { searchParams } = new URL(request.url);
    const filters = PurchaseListFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '25',
      projectId: searchParams.get('projectId') || undefined,
      subProjectId: searchParams.get('subProjectId') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });

    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 25;

    const where: any = {
      companyId: auth.companyId,
    };

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.subProjectId) {
      where.subProjectId = filters.subProjectId;
    }

    if (filters.supplierId) {
      where.supplierVendorId = filters.supplierId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { challanNo: { contains: filters.search, mode: 'insensitive' as const } },
        { reference: { contains: filters.search, mode: 'insensitive' as const } },
        {
          supplierVendor: {
            name: { contains: filters.search, mode: 'insensitive' as const },
          },
        },
        {
          project: {
            name: { contains: filters.search, mode: 'insensitive' as const },
          },
        },
      ];
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          project: {
            select: { id: true, name: true },
          },
          subProject: {
            select: { id: true, name: true },
          },
          supplierVendor: {
            select: { id: true, name: true },
          },
          voucher: {
            select: { id: true, voucherNo: true },
          },
          lines: {
            select: { lineType: true },
          },
          _count: {
            select: { attachments: true },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    // Calculate totals for current filter
    const totals = await prisma.purchase.aggregate({
      where,
      _sum: {
        total: true,
        paidAmount: true,
        dueAmount: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: purchases,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      totals: {
        total: totals._sum.total?.toNumber() || 0,
        paid: totals._sum.paidAmount?.toNumber() || 0,
        due: totals._sum.dueAmount?.toNumber() || 0,
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

/**
 * POST /api/purchases
 * Create a new purchase
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'purchases', 'WRITE');

    const body = await request.json();
    const validatedData = PurchaseCreateSchema.parse(body);

    // Validate project exists and belongs to company
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    });

    if (!project || project.companyId !== auth.companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Project not found or does not belong to your company',
        },
        { status: 400 }
      );
    }

    // Validate sub-project if provided
    if (validatedData.subProjectId) {
      const subProject = await prisma.project.findUnique({
        where: { id: validatedData.subProjectId },
      });

      if (!subProject || subProject.companyId !== auth.companyId || subProject.parentProjectId !== validatedData.projectId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Sub-project not found, does not belong to your company, or is not a child of the main project',
          },
          { status: 400 }
        );
      }
    }

    // Validate supplier vendor
    const supplier = await prisma.vendor.findUnique({
      where: { id: validatedData.supplierVendorId },
    });

    if (!supplier || supplier.companyId !== auth.companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Supplier not found or does not belong to your company',
        },
        { status: 400 }
      );
    }

    // Validate payment account if provided (must be system account)
    if (validatedData.paymentAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: validatedData.paymentAccountId },
      });

      if (!account || account.companyId !== auth.companyId || !account.isActive || !account.isSystem) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Payment account not found, inactive, or is not a system account',
          },
          { status: 400 }
        );
      }
    }

    // Validate stock items for MATERIAL lines
    const materialLines = validatedData.lines.filter((line) => line.lineType === 'MATERIAL');
    if (materialLines.length > 0) {
      const stockItemIds = materialLines
        .map((line) => line.stockItemId)
        .filter((id): id is string => Boolean(id));
      
      if (stockItemIds.length !== materialLines.length) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Stock item is required for all MATERIAL lines',
          },
          { status: 400 }
        );
      }

      const stockItems = await prisma.stockItem.findMany({
        where: {
          id: { in: stockItemIds },
          companyId: auth.companyId,
          isActive: true,
        },
      });

      if (stockItems.length !== stockItemIds.length) {
        return NextResponse.json(
          {
            ok: false,
            error: 'One or more stock items not found, inactive, or do not belong to your company',
          },
          { status: 400 }
        );
      }
    }

    // Compute totals server-side
    const subtotal = validatedData.lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const discount = validatedData.discountPercent
      ? new Prisma.Decimal(subtotal).mul(validatedData.discountPercent).div(100)
      : new Prisma.Decimal(0);
    const total = new Prisma.Decimal(subtotal).minus(discount);
    const paidAmount = new Prisma.Decimal(validatedData.paidAmount || 0);
    const dueAmount = total.minus(paidAmount);

    // Create purchase with lines and attachments in a transaction
    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          companyId: auth.companyId,
          date: validatedData.date,
          challanNo: validatedData.challanNo || null,
          projectId: validatedData.projectId,
          subProjectId: validatedData.subProjectId || null,
          supplierVendorId: validatedData.supplierVendorId,
          reference: validatedData.reference || null,
          discountPercent: validatedData.discountPercent ? new Prisma.Decimal(validatedData.discountPercent) : null,
          subtotal: new Prisma.Decimal(subtotal),
          total,
          paidAmount,
          dueAmount,
          paymentAccountId: validatedData.paymentAccountId || null,
          status: 'DRAFT',
          lines: {
            create: validatedData.lines.map((line) => {
              // Compute lineTotal from qty * unitRate if not provided
              let lineTotal = line.lineTotal;
              if ((line.lineType === 'MATERIAL' || line.lineType === 'SERVICE') && line.quantity && line.unitRate) {
                lineTotal = line.quantity * line.unitRate;
              }

              return {
                lineType: line.lineType,
                stockItemId: line.stockItemId || null,
                quantity: line.quantity ? new Prisma.Decimal(line.quantity) : null,
                unit: line.unit || null,
                unitRate: line.unitRate ? new Prisma.Decimal(line.unitRate) : null,
                description: line.description || null,
                lineTotal: new Prisma.Decimal(lineTotal),
              };
            }),
          },
          attachments: {
            create: (validatedData.attachments || []).map((att) => ({
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              mimeType: att.mimeType,
              sizeBytes: att.sizeBytes,
            })),
          },
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
          subProject: {
            select: { id: true, name: true },
          },
          supplierVendor: {
            select: { id: true, name: true },
          },
          lines: {
            include: {
              stockItem: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
          attachments: true,
        },
      });

      return newPurchase;
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'Purchase',
      entityId: purchase.id,
      action: 'CREATE',
      after: purchase,
      request,
    });

    return NextResponse.json(
      {
        ok: true,
        data: purchase,
      },
      { status: 201 }
    );
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
