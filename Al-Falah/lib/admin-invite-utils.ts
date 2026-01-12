import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}

/**
 * Generate an invitation token for admin password setup
 * Token expires in 7 days
 */
export function generateAdminInviteToken(userId: string, tenantId: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
  }
  return jwt.sign(
    {
      userId,
      tenantId,
      type: "admin_invite",
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  )
}

/**
 * Verify admin invitation token
 */
export function verifyAdminInviteToken(token: string): { userId: string; tenantId: string } | null {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded && decoded.type === "admin_invite" && decoded.userId && decoded.tenantId) {
      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
      }
    }
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
  return null
}

/**
 * Generate invitation link URL for email
 * Added tenantSlug parameter to include slug in the URL
 */
export function generateAdminInviteLink(userId: string, tenantId: string, tenantSlug: string, baseUrl: string): string {
  const token = generateAdminInviteToken(userId, tenantId)
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBaseUrl}/${tenantSlug}/staff/setup-password?token=${encodeURIComponent(token)}`
}
