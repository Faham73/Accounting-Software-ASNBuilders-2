import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
);

/**
 * Verify JWT token without database lookup (for middleware)
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /login to be public
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect /dashboard and /dashboard/* routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value;

    // If no token or token is invalid, redirect to login
    if (!token || !(await verifyToken(token))) {
      const loginUrl = new URL('/login', request.url);
      // Preserve the intended destination for redirect after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
