import type { NextRequest } from "next/server"
import { authenticateRequest } from "./auth-middleware"
import { dbConnect } from "./db"
import Tenant from "./models/Tenant"

/**
 * Tenant middleware to ensure all requests are scoped to the user's tenant
 * Super admins (role: "super_admin") can access all tenants
 */
export async function requireTenant(request: NextRequest) {
  const { user, error } = await authenticateRequest(request)

  if (error || !user) {
    return {
      authorized: false,
      error: "Unauthorized",
      statusCode: 401,
      tenantId: null,
      user: null,
    }
  }

  // Super admin can access all tenants (for platform management)
  if (user.role === "super_admin") {
    return {
      authorized: true,
      tenantId: null, // null means no tenant restriction
      user,
      error: null,
      statusCode: 200,
    }
  }

  // All other users must have a tenantId
  if (!user.tenantId) {
    return {
      authorized: false,
      error: "User is not associated with a mosque/tenant",
      statusCode: 403,
      tenantId: null,
      user: null,
    }
  }

  // Verify tenant exists and is active
  await dbConnect()
  const tenant = (await Tenant.findById(user.tenantId).lean()) as { isActive?: boolean } | null

  if (!tenant) {
    return {
      authorized: false,
      error: "Tenant not found",
      statusCode: 404,
      tenantId: null,
      user: null,
    }
  }

  if (!tenant.isActive) {
    return {
      authorized: false,
      error: "Tenant is inactive",
      statusCode: 403,
      tenantId: null,
      user: null,
    }
  }

  return {
    authorized: true,
    tenantId: user.tenantId.toString(),
    user,
    error: null,
    statusCode: 200,
  }
}

/**
 * Get tenant ID from authenticated user
 * Returns null for super_admin, tenantId for regular users
 */
export async function getTenantId(request: NextRequest): Promise<string | null> {
  const tenantCheck = await requireTenant(request)
  if (!tenantCheck.authorized) {
    return null
  }
  return tenantCheck.tenantId
}

/**
 * Helper to build tenant filter for queries
 * Returns empty object for super_admin (no filter), or { tenantId } for regular users
 */
export async function getTenantFilter(request: NextRequest): Promise<{ tenantId?: string }> {
  const tenantCheck = await requireTenant(request)
  if (!tenantCheck.authorized) {
    throw new Error("Unauthorized")
  }

  // Super admin sees all tenants
  if (tenantCheck.tenantId === null) {
    return {}
  }

  return { tenantId: tenantCheck.tenantId }
}
