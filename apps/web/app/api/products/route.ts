import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { ProductCreateSchema, ProductListFiltersSchema } from '@accounting/shared';
import { ZodError } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';

/**
 * GET /api/products
 * List products for user's company with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'products', 'READ');

    const { searchParams } = new URL(request.url);
    const filters = ProductListFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '25',
      categoryId: searchParams.get('categoryId') || undefined,
      isActive: searchParams.get('isActive') || undefined,
    });

    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 25;

    const where: any = {
      companyId: auth.companyId,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' as const } },
        { name: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate stock for each product
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        // Calculate stock from InventoryTxn if available
        const inventorySum = await prisma.inventoryTxn.aggregate({
          where: {
            companyId: auth.companyId,
            productId: product.id,
          },
          _sum: {
            qtyIn: true,
            qtyOut: true,
          },
        });

        const qtyIn = Number(inventorySum._sum.qtyIn || 0);
        const qtyOut = Number(inventorySum._sum.qtyOut || 0);
        const stock = Number(product.openingStockQty) + qtyIn - qtyOut;

        return {
          ...product,
          stock,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      data: productsWithStock,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
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
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'products', 'WRITE');

    const body = await request.json();
    const validatedData = ProductCreateSchema.parse(body);

    // Check if product with same code already exists
    const existing = await prisma.product.findUnique({
      where: {
        companyId_code: {
          companyId: auth.companyId,
          code: validatedData.code,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Product with this code already exists',
        },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (validatedData.categoryId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category || category.companyId !== auth.companyId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Category not found or does not belong to your company',
          },
          { status: 400 }
        );
      }
    }

    // Validate inventory account if provided
    if (validatedData.inventoryAccountId) {
      const account = await prisma.account.findUnique({
        where: { id: validatedData.inventoryAccountId },
      });

      if (!account || account.companyId !== auth.companyId || !account.isActive) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Inventory account not found, inactive, or does not belong to your company',
          },
          { status: 400 }
        );
      }
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        companyId: auth.companyId,
        code: validatedData.code,
        name: validatedData.name,
        unit: validatedData.unit,
        categoryId: validatedData.categoryId || null,
        defaultPurchasePrice: new Prisma.Decimal(validatedData.defaultPurchasePrice),
        defaultSalePrice: new Prisma.Decimal(validatedData.defaultSalePrice),
        imageUrl: validatedData.imageUrl || null,
        isInventory: validatedData.isInventory,
        openingStockQty: new Prisma.Decimal(validatedData.openingStockQty),
        openingStockUnitCost: new Prisma.Decimal(validatedData.openingStockUnitCost),
        inventoryAccountId: validatedData.inventoryAccountId || null,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'Product',
      entityId: product.id,
      action: 'CREATE',
      after: product,
      request,
    });

    return NextResponse.json(
      {
        ok: true,
        data: product,
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
