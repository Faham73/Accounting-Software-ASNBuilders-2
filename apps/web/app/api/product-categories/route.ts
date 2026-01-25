import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { can } from '@/lib/permissions';

/**
 * GET /api/product-categories
 * List active product categories for user's company
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const categories = await prisma.productCategory.findMany({
      where: {
        companyId: auth.companyId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: categories,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return createErrorResponse(error, 401);
    }
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'), 500);
  }
}

/**
 * POST /api/product-categories
 * Create a new product category (requires WRITE permission on products)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if (!can(auth.role, 'products', 'WRITE')) {
      throw new ForbiddenError('You do not have permission to create product categories');
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Category name is required',
        },
        { status: 400 }
      );
    }

    // Check if category with same name already exists
    const existing = await prisma.productCategory.findUnique({
      where: {
        companyId_name: {
          companyId: auth.companyId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Category with this name already exists',
        },
        { status: 400 }
      );
    }

    const category = await prisma.productCategory.create({
      data: {
        companyId: auth.companyId,
        name: name.trim(),
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: category,
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
