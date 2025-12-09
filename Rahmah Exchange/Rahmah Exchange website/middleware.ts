import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Staff routes that require authentication
  const protectedRoutes = ["/staff/dashboard", "/staff/cases", "/staff/profile"]

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Get token from cookies (middleware runs server-side)
  const token = request.cookies.get("rahmah_admin_token")?.value

  // If accessing protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/staff/login", request.url))
  }

  // If already logged in and trying to access login/signup, redirect to dashboard
  if ((pathname === "/staff/login" || pathname === "/staff/signup") && token) {
    return NextResponse.redirect(new URL("/staff/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/staff/:path*"],
}
