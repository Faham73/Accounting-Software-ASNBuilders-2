import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { CostHeadCreateSchema } from '@accounting/shared';
import { ZodError } from 'zod';

/**
 * GET /api/cost-heads
 * List cost heads for user's company with optional filters
 * Query params: q (search), active (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'costHeads', 'READ');

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const activeParam = searchParams.get('active');
    const active = activeParam === null ? true : activeParam === 'true';

    const where: any = {
      companyId: auth.companyId,
    };

    if (active !== null) {
      where.isActive = active;
    }

    if (q) {
      where.name = {
        contains: q,
        mode: 'insensitive',
      };
    }

    const costHeads = await prisma.costHead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: costHeads,
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
 * POST /api/cost-heads
 * Create a new cost head (requires WRITE permission)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'costHeads', 'WRITE');

    const body = await request.json();

    const validatedData = CostHeadCreateSchema.parse(body);

    // Check for duplicate name within company (enforced by unique constraint, but check for better error)
    const existing = await prisma.costHead.findUnique({
      where: {
        companyId_name: {
          companyId: auth.companyId,
          name: validatedData.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A cost head with this name already exists',
        },
        { status: 409 }
      );
    }

    const costHead = await prisma.costHead.create({
      data: {
        companyId: auth.companyId,
        name: validatedData.name,
        code: validatedData.code,
        isActive: validatedData.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: costHead,
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
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A cost head with this name already exists',
        },
        { status: 409 }
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
