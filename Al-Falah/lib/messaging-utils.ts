/**
 * Generate internal email address from user name
 * Format: firstname.lastname@rahmah.internal
 */
export function generateInternalEmail(fullName: string): string {
  if (!fullName) return ""

  const parts = fullName.toLowerCase().trim().split(/\s+/)
  const firstName = parts[0]
  const lastName = parts[parts.length - 1]

  if (!firstName || !lastName) return ""

  return `${firstName}.${lastName}@rahmah.internal`
}

/**
 * Validate internal email format
 */
export function isValidInternalEmail(email: string): boolean {
  const pattern = /^[a-z]+\.[a-z]+@rahmah\.internal$/i
  return pattern.test(email)
}

/**
 * Extract name from internal email
 * "john.smith@rahmah.internal" → "John Smith"
 */
export function extractNameFromInternalEmail(email: string): string {
  if (!isValidInternalEmail(email)) return ""

  const [namePart] = email.split("@")
  const [firstName, lastName] = namePart.split(".")

  return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${
    lastName.charAt(0).toUpperCase() + lastName.slice(1)
  }`
}

/**
 * Create conversation ID from case
 */
export function generateConversationId(caseId: string): string {
  return `case_${caseId}`
}

/**
 * Extract case ID from conversation ID
 */
export function extractCaseIdFromConversationId(conversationId: string): string {
  return conversationId.replace("case_", "")
}
