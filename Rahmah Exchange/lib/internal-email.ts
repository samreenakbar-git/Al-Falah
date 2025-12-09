import User from "./models/User"

/**
 * Generate platform internal email format
 * Format: firstname.lastname@rahmah.internal
 */
export function generateInternalEmail(name: string): string {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0].toLowerCase()
  const lastName = parts.slice(1).join("").toLowerCase() || "user"
  return `${firstName}.${lastName}@rahmah.internal`
}

/**
 * Ensure user has internal email generated
 * Called when user role changes to staff role or on first creation
 */
export async function ensureInternalEmail(userId: string) {
  const user = await User.findById(userId)
  if (!user) return null

  // Only staff roles get internal emails
  if (user.role === "applicant") {
    if (user.internalEmail) {
      user.internalEmail = undefined
      user.internalEmailGenerated = false
      await user.save()
    }
    return null
  }

  // Generate if not exists
  if (!user.internalEmail) {
    user.internalEmail = generateInternalEmail(user.name)
    user.internalEmailGenerated = true
    await user.save()
  }

  return user.internalEmail
}

/**
 * Get user's email address (uses internal email for staff, regular email for applicants)
 */
export async function getUserEmailAddress(userId: string): Promise<string | null> {
  const user = await User.findById(userId)
  if (!user) return null

  // Staff members use internal email, applicants use regular email
  if (user.role !== "applicant" && user.internalEmail) {
    return user.internalEmail
  }
  return user.email
}

/**
 * Get all staff emails by role
 */
export async function getStaffEmailsByRole(role: string): Promise<string[]> {
  const staff = await User.find({ role, isActive: true })
  return staff
    .map((user) => user.internalEmail || user.email)
    .filter((email): email is string => !!email)
}

/**
 * Get all active admins' emails
 */
export async function getAdminEmails(): Promise<string[]> {
  return getStaffEmailsByRole("admin")
}

/**
 * Get all active caseworkers' emails
 */
export async function getCaseworkerEmails(): Promise<string[]> {
  return getStaffEmailsByRole("caseworker")
}

/**
 * Get all active approvers' emails
 */
export async function getApproverEmails(): Promise<string[]> {
  return getStaffEmailsByRole("approver")
}

/**
 * Get all active treasurers' emails
 */
export async function getTreasurerEmails(): Promise<string[]> {
  return getStaffEmailsByRole("treasurer")
}
