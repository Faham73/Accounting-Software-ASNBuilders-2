import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { ProductUpdateSchema } from '@accounting/shared';
import { ZodError } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';

/**
 * GET /api/products/[id]
 * Get a single product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'products', 'READ');

    const product = await prisma.product.findUnique({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventoryAccount: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    // Calculate stock
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

    return NextResponse.json({
      ok: true,
      data: {
        ...product,
        stock,
      },
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

/**
 * PUT /api/products/[id]
 * Update a product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'products', 'WRITE');

    // Check if product exists and belongs to company
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = ProductUpdateSchema.parse(body);

    // Check if code is being changed and if new code already exists
    if (validatedData.code && validatedData.code !== existingProduct.code) {
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
    }

    // Validate category if provided
    if (validatedData.categoryId !== undefined && validatedData.categoryId !== null) {
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
    if (validatedData.inventoryAccountId !== undefined && validatedData.inventoryAccountId !== null) {
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

    // Check if product is referenced by purchases (prevent deletion if referenced)
    if (validatedData.isActive === false) {
      const purchaseCount = await prisma.purchaseLine.count({
        where: {
          productId: params.id,
          purchase: {
            status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'] },
          },
        },
      });

      if (purchaseCount > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Cannot deactivate product that is referenced by purchases',
          },
          { status: 400 }
        );
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(validatedData.code && { code: validatedData.code }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.unit && { unit: validatedData.unit }),
        ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
        ...(validatedData.defaultPurchasePrice !== undefined && {
          defaultPurchasePrice: new Prisma.Decimal(validatedData.defaultPurchasePrice),
        }),
        ...(validatedData.defaultSalePrice !== undefined && {
          defaultSalePrice: new Prisma.Decimal(validatedData.defaultSalePrice),
        }),
        ...(validatedData.imageUrl !== undefined && { imageUrl: validatedData.imageUrl }),
        ...(validatedData.isInventory !== undefined && { isInventory: validatedData.isInventory }),
        ...(validatedData.openingStockQty !== undefined && {
          openingStockQty: new Prisma.Decimal(validatedData.openingStockQty),
        }),
        ...(validatedData.openingStockUnitCost !== undefined && {
          openingStockUnitCost: new Prisma.Decimal(validatedData.openingStockUnitCost),
        }),
        ...(validatedData.inventoryAccountId !== undefined && {
          inventoryAccountId: validatedData.inventoryAccountId,
        }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventoryAccount: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'Product',
      entityId: product.id,
      action: 'UPDATE',
      before: existingProduct,
      after: product,
      request,
    });

    return NextResponse.json({
      ok: true,
      data: product,
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
 * DELETE /api/products/[id]
 * Soft delete a product (set isActive=false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'products', 'WRITE');

    // Check if product exists and belongs to company
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    // Check if product is referenced by purchases
    const purchaseCount = await prisma.purchaseLine.count({
      where: {
        productId: params.id,
        purchase: {
          status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'] },
        },
      },
    });

    if (purchaseCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cannot delete product that is referenced by purchases',
        },
        { status: 400 }
      );
    }

    // Soft delete (set isActive=false)
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'Product',
      entityId: params.id,
      action: 'DELETE',
      before: existingProduct,
      after: product,
      request,
    });

    return NextResponse.json({
      ok: true,
      message: 'Product deleted successfully',
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
