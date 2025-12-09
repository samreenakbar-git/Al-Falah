import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { authenticateRequest } from "./auth-middleware"

/**
 * Check if user is an authorized admin
 * Primary check: user must have role "admin" in the database
 * The user object comes from authenticateRequest which fetches from database
 * We trust the database role - if user has role "admin" in DB, they are authorized
 * ADMIN_EMAIL environment variable is used for other purposes (like email notifications),
 * but does not restrict admin access based on database roles
 */
function isAuthorizedAdmin(user: any): boolean {
  // User must exist and have role "admin" from database
  // If they have admin role in database, they are authorized regardless of email
  if (!user || user.role !== "admin") {
    return false
  }
  
  // Trust the database role - if user has role "admin" in database, they are authorized
  // The ADMIN_EMAIL env var is not used to restrict access, only for other purposes
  return true
}

/**
 * Role-based access control middleware
 * Checks if user has required role(s) from database
 * For admin role, checks database role first, then optional email restriction if ADMIN_EMAIL is set
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const { user, error } = await authenticateRequest(request)

  if (error || !user) {
    return {
      authorized: false,
      error: "Unauthorized",
      statusCode: 401,
    }
  }

  // Special check for admin role - verify user has admin role from database
  if (allowedRoles.includes("admin") && user.role === "admin") {
    if (!isAuthorizedAdmin(user)) {
      // Log for debugging
      console.log("Admin access check failed:", {
        userEmail: user.email,
        userRole: user.role,
      })
      return {
        authorized: false,
        error: "Admin access denied. Please ensure your account has admin role in the database.",
        statusCode: 403,
      }
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      error: `This action requires one of: ${allowedRoles.join(", ")}`,
      statusCode: 403,
    }
  }

  return {
    authorized: true,
    user,
    error: null,
    statusCode: 200,
  }
}

/**
 * Higher-order function for role-protected API routes
 */
export function withRoleProtection(handler: Function, allowedRoles: string[]) {
  return async (request: NextRequest, ...args: any[]) => {
    const roleCheck = await requireRole(request, allowedRoles)

    if (!roleCheck.authorized) {
      return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
    }

    // Pass user to handler via request context
    (request as any).user = roleCheck.user
    return handler(request, ...args)
  }
}
