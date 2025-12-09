/**
 * HTML sanitization utilities to prevent XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 * Converts <, >, &, ", ' to their HTML entities
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ""
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Sanitizes text for use in HTML attributes
 */
export function escapeHtmlAttribute(unsafe: string | null | undefined): string {
  return escapeHtml(unsafe)
}

/**
 * Converts newlines to <br> tags while escaping HTML
 * Safe for use in email templates
 */
export function nl2br(text: string | null | undefined): string {
  if (!text) return ""
  return escapeHtml(text).split("\n").join("<br>")
}

