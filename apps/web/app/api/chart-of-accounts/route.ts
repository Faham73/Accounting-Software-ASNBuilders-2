import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { AccountCreateSchema, AccountListFiltersSchema } from '@accounting/shared';
import { ZodError } from 'zod';
import { createAuditLog } from '@/lib/audit';

/**
 * GET /api/chart-of-accounts
 * List accounts for user's company with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'chartOfAccounts', 'READ');

    const { searchParams } = new URL(request.url);
    const filters = AccountListFiltersSchema.parse({
      q: searchParams.get('q') || undefined,
      type: searchParams.get('type') || undefined,
      active: searchParams.get('active') === null ? undefined : searchParams.get('active') === 'true',
      parentId: searchParams.get('parentId') || undefined,
    });

    const where: any = {
      companyId: auth.companyId,
    };

    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.q) {
      where.OR = [
        { code: { contains: filters.q, mode: 'insensitive' as const } },
        { name: { contains: filters.q, mode: 'insensitive' as const } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: { id: true },
        },
        _count: {
          select: { voucherLines: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: accounts,
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
 * POST /api/chart-of-accounts
 * Create a new account
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'chartOfAccounts', 'WRITE');

    const body = await request.json();
    const validatedData = AccountCreateSchema.parse(body);

    // Validate parent belongs to same company if provided
    if (validatedData.parentId) {
      const parent = await prisma.account.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parent || parent.companyId !== auth.companyId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Parent account not found or does not belong to your company',
          },
          { status: 400 }
        );
      }
    }

    // Check code uniqueness
    const existing = await prisma.account.findUnique({
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
          error: 'Account code already exists for this company',
        },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        companyId: auth.companyId,
        code: validatedData.code,
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: { id: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityType: 'ACCOUNT',
      entityId: account.id,
      action: 'CREATE',
      after: account,
      request,
    });

    return NextResponse.json(
      {
        ok: true,
        data: account,
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
