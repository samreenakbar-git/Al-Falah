import { NextResponse } from "next/server"

/**
 * Get allowed CORS origins from environment variable
 * Falls back to "*" only in development for convenience
 * In production, should be set to specific allowed origins
 */
function getAllowedOrigin(): string {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  if (allowedOrigins) {
    return allowedOrigins
  }
  // In development, allow all origins for convenience
  // In production, this should be restricted via CORS_ALLOWED_ORIGINS env var
  if (process.env.NODE_ENV === "development") {
    return "*"
  }
  // Default to empty string (no CORS) in production if not configured
  return ""
}

export function addCorsHeaders(response: Response) {
  const allowedOrigin = getAllowedOrigin()
  if (!allowedOrigin) {
    return response // No CORS headers if not configured
  }
  
  const headers = new Headers(response.headers)
  headers.set("Access-Control-Allow-Origin", allowedOrigin)
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  headers.set("Access-Control-Allow-Credentials", "true")
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function handleCorsOptions() {
  const allowedOrigin = getAllowedOrigin()
  if (!allowedOrigin) {
    return new NextResponse(null, { status: 403 })
  }
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  })
}
