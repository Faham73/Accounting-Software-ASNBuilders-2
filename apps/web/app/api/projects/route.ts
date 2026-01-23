import { NextRequest, NextResponse } from 'next/server';
import {
  requirePermission,
  createErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/rbac';
import { prisma } from '@accounting/db';
import { ProjectCreateSchema } from '@accounting/shared';
import { ZodError } from 'zod';

/**
 * GET /api/projects
 * List projects for user's company with optional filters
 * Query params: q (search), status, active (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'projects', 'READ');

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const activeParam = searchParams.get('active');
    const active = activeParam === null ? true : activeParam === 'true';

    // Build where clause
    const where: any = {
      companyId: auth.companyId,
    };

    // Filter by active status
    if (active !== null) {
      where.isActive = active;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Search by name (case-insensitive)
    if (q) {
      where.name = {
        contains: q,
        mode: 'insensitive',
      };
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        clientName: true,
        clientContact: true,
        siteLocation: true,
        startDate: true,
        expectedEndDate: true,
        contractValue: true,
        status: true,
        assignedManager: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: projects,
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
 * POST /api/projects
 * Create a new project (requires WRITE permission)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'projects', 'WRITE');

    const body = await request.json();

    // Validate input with Zod
    const validatedData = ProjectCreateSchema.parse(body);

    // Create project (companyId from auth context)
    const project = await prisma.project.create({
      data: {
        companyId: auth.companyId,
        name: validatedData.name,
        clientName: validatedData.clientName,
        clientContact: validatedData.clientContact,
        siteLocation: validatedData.siteLocation,
        startDate: validatedData.startDate,
        expectedEndDate: validatedData.expectedEndDate,
        contractValue: validatedData.contractValue,
        status: validatedData.status || 'DRAFT',
        assignedManager: validatedData.assignedManager,
        isActive: validatedData.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        clientContact: true,
        siteLocation: true,
        startDate: true,
        expectedEndDate: true,
        contractValue: true,
        status: true,
        assignedManager: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: project,
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
