import { randomBytes } from "crypto"

export function generateCaseId(): string {
  return randomBytes(3).toString("hex").toUpperCase().substring(0, 6)
}

export function generateFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split(".").pop() || "bin"
  return `${timestamp}-${random}.${ext}`
}

export function getDocumentUrl(filename: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${baseUrl}/api/documents/${filename}`
}
