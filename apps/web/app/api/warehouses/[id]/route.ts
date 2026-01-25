import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';

/**
 * GET /api/warehouses/[id]
 * Get a single warehouse by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'warehouses', 'READ');

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Warehouse not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: warehouse,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return createErrorResponse(error, 401);
    }
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'), 500);
  }
}

/**
 * PUT /api/warehouses/[id]
 * Update a warehouse (requires WRITE permission)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'warehouses', 'WRITE');

    const body = await request.json();
    const { name, type, isActive } = body;

    // Check if warehouse exists and belongs to company
    const existing = await prisma.warehouse.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Warehouse not found',
        },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !['LOCAL', 'COMPANY'].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Type must be LOCAL or COMPANY',
        },
        { status: 400 }
      );
    }

    // Check name uniqueness if name is being changed
    if (name && name !== existing.name) {
      const nameConflict = await prisma.warehouse.findUnique({
        where: {
          companyId_name: {
            companyId: auth.companyId,
            name: name.trim(),
          },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Warehouse with this name already exists',
          },
          { status: 400 }
        );
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      ok: true,
      data: warehouse,
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
 * DELETE /api/warehouses/[id]
 * Soft delete a warehouse (set isActive=false)
 * Blocks deletion if referenced by any Purchase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'warehouses', 'WRITE');

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
      include: {
        purchases: {
          take: 1,
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Warehouse not found',
        },
        { status: 404 }
      );
    }

    // Check if referenced by any purchase
    if (warehouse.purchases.length > 0) {
      // Soft delete instead of hard delete
      const updated = await prisma.warehouse.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        ok: true,
        data: updated,
        message: 'Warehouse deactivated (referenced by purchases)',
      });
    }

    // If not referenced, we can soft delete safely
    const updated = await prisma.warehouse.update({
      where: { id: params.id },
      data: { isActive: false },
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
