export const AUTH_TOKEN_KEY = "rahmah_admin_token"

// Save token in cookies and localStorage
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  // Cookie expires in 1 hour for middleware
  document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=3600; secure; samesite=lax`
}

// Get token from localStorage or cookies
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  // Try localStorage first (client-side preference)
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) return token

  // Fall back to cookies
  const match = document.cookie.match(new RegExp("(^| )" + AUTH_TOKEN_KEY + "=([^;]+)"))
  return match ? match[2] : null
}

// Remove token from both storage locations
export function removeAuthToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0`
}

// Client-side helper
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
