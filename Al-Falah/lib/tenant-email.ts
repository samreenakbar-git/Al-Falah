import { dbConnect } from "./db"
import Tenant from "./models/Tenant"
import User from "./models/User"

/**
 * Get admin email for a specific tenant
 * Returns the admin user's email for the tenant, or undefined if not found
 */
export async function getTenantAdminEmail(tenantId: string): Promise<string | undefined> {
  try {
    await dbConnect()

    // Find admin user for this tenant
    const adminUser = (await User.findOne({
      tenantId,
      role: "admin",
      isActive: true,
    }).lean()) as { email?: string } | null

    return adminUser?.email
  } catch (error) {
    console.error("Error getting tenant admin email:", error)
    return undefined
  }
}

/**
 * Get admin email for current user's tenant
 * Returns the admin user's email for the tenant, or undefined if not found
 */
export async function getCurrentTenantAdminEmail(userTenantId: string | undefined): Promise<string | undefined> {
  if (!userTenantId) {
    return undefined
  }
  return getTenantAdminEmail(userTenantId)
}

/**
 * Get tenant by ID and return its email (which is the admin email)
 */
export async function getTenantEmail(tenantId: string): Promise<string | undefined> {
  try {
    await dbConnect()
    const tenant = (await Tenant.findById(tenantId).lean()) as { email?: string } | null
    return tenant?.email
  } catch (error) {
    console.error("Error getting tenant email:", error)
    return undefined
  }
}
