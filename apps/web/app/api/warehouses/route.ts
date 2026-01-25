import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';

/**
 * GET /api/warehouses
 * List active warehouses for user's company
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'warehouses', 'READ');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === null ? true : isActiveParam === 'true';

    const where: any = {
      companyId: auth.companyId,
    };

    if (isActive !== null) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: warehouses,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return createErrorResponse(error, 401);
    }
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'), 500);
  }
}

/**
 * POST /api/warehouses
 * Create a new warehouse (requires WRITE permission on warehouses)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'warehouses', 'WRITE');

    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Name and type are required',
        },
        { status: 400 }
      );
    }

    if (!['LOCAL', 'COMPANY'].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Type must be LOCAL or COMPANY',
        },
        { status: 400 }
      );
    }

    // Check if warehouse with same name already exists
    const existing = await prisma.warehouse.findUnique({
      where: {
        companyId_name: {
          companyId: auth.companyId,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Warehouse with this name already exists',
        },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: auth.companyId,
        name,
        type,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: warehouse,
      },
      { status: 201 }
    );
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
