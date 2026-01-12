import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/jwt-utils"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protected routes for super admin (no masjid slug)
  const superAdminRoutes = [
    "/staff/dashboard",
    "/staff/tenants",
    "/staff/users",
    "/staff/cases",
    "/staff/messages",
    "/staff/messages-applicants",
    "/staff/shared-profiles",
  ]

  // Check if path matches super admin routes
  const isSuperAdminRoute = superAdminRoutes.some((route) => pathname.startsWith(route))

  // Check if path matches dynamic masjid staff routes
  const isDynamicStaffRoute =
    /^\/[^/]+\/staff\/(dashboard|cases|profile|messages|users|tenants|shared-profiles|messages-applicants)/.test(
      pathname,
    )

  const isProtectedRoute = isSuperAdminRoute || isDynamicStaffRoute

  // Get token from cookies
  const token = request.cookies.get("rahmah_admin_token")?.value

  // If accessing protected route without token, redirect to appropriate login
  if (isProtectedRoute && !token) {
    if (isSuperAdminRoute) {
      return NextResponse.redirect(new URL("/staff/login", request.url))
    }

    const masjidSlugMatch = pathname.match(/^\/([^/]+)\/staff/)
    if (masjidSlugMatch) {
      const masjidSlug = masjidSlugMatch[1]
      return NextResponse.redirect(new URL(`/${masjidSlug}/staff/login`, request.url))
    }

    return NextResponse.redirect(new URL("/staff/login", request.url))
  }

  // Verify user has proper role to access the route
  if (token && isProtectedRoute) {
    try {
      const decoded = verifyToken(token)
      if (decoded) {
        // If trying to access super admin routes, user must be super_admin
        if (isSuperAdminRoute && decoded.role !== "super_admin") {
          return NextResponse.redirect(new URL("/", request.url))
        }

        // If trying to access dynamic staff routes, user must NOT be super_admin (or must belong to that tenant)
        if (isDynamicStaffRoute && decoded.role === "super_admin") {
          // Super admin accessing masjid-specific route - redirect to super admin dashboard
          return NextResponse.redirect(new URL("/staff/dashboard", request.url))
        }
      }
    } catch (err) {
      // Token verification failed, continue
    }
  }

  const isSuperAdminLoginRoute = /^\/staff\/(login|signup|setup-password)/.test(pathname)
  const isDynamicLoginRoute = /^\/[^/]+\/staff\/(login|signup|setup-password)/.test(pathname)

  if ((isSuperAdminLoginRoute || isDynamicLoginRoute) && token) {
    try {
      const decoded = verifyToken(token)
      if (decoded) {
        // If super admin trying to access login, redirect to super admin dashboard
        if (decoded.role === "super_admin" && isSuperAdminLoginRoute) {
          return NextResponse.redirect(new URL("/staff/dashboard", request.url))
        }

        // If regular staff trying to access login, redirect to their masjid dashboard
        if (decoded.role !== "super_admin" && isDynamicLoginRoute) {
          const masjidSlugMatch = pathname.match(/^\/([^/]+)\/staff/)
          if (masjidSlugMatch) {
            const masjidSlug = masjidSlugMatch[1]
            return NextResponse.redirect(new URL(`/${masjidSlug}/staff/dashboard`, request.url))
          }
        }
      }
    } catch (err) {
      // Token verification failed, continue
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/staff/:path*", "/:masjidSlug/staff/:path*"],
}
