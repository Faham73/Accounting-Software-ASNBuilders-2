import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@accounting/db';
import { signToken, getCookieOptions } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });

    // Verify user exists and is active
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await signToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    // Create response with user data
    const response = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      },
    });

    // Set httpOnly cookie
    response.cookies.set('token', token, getCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    );
  }
}
