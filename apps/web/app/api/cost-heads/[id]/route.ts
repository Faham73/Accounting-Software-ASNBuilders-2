import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { CostHeadUpdateSchema } from '@accounting/shared';
import { ZodError } from 'zod';

/**
 * GET /api/cost-heads/[id]
 * Get a single cost head by ID (scoped to user's company)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'costHeads', 'READ');

    const costHead = await prisma.costHead.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
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

    if (!costHead) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cost head not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: costHead,
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
 * PATCH /api/cost-heads/[id]
 * Update a cost head (requires WRITE permission)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'costHeads', 'WRITE');

    const body = await request.json();

    const validatedData = CostHeadUpdateSchema.parse(body);

    const existingCostHead = await prisma.costHead.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!existingCostHead) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cost head not found',
        },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingCostHead.name) {
      const duplicate = await prisma.costHead.findUnique({
        where: {
          companyId_name: {
            companyId: auth.companyId,
            name: validatedData.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            ok: false,
            error: 'A cost head with this name already exists',
          },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.code !== undefined) updateData.code = validatedData.code;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const updatedCostHead = await prisma.costHead.update({
      where: { id: params.id },
      data: updateData,
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
      data: updatedCostHead,
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

/**
 * DELETE /api/cost-heads/[id]
 * Soft delete a cost head by setting isActive=false (requires WRITE permission)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission(request, 'costHeads', 'WRITE');

    const existingCostHead = await prisma.costHead.findFirst({
      where: {
        id: params.id,
        companyId: auth.companyId,
      },
    });

    if (!existingCostHead) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cost head not found',
        },
        { status: 404 }
      );
    }

    const deletedCostHead = await prisma.costHead.update({
      where: { id: params.id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: deletedCostHead,
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
