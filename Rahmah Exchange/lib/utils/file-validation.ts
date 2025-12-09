/**
 * File validation utilities for security
 */

// Allowed MIME types for document uploads
const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // Microsoft Office (optional - uncomment if needed)
  // "application/msword",
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // "application/vnd.ms-excel",
  // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
] as const

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate file MIME type
 */
export function isValidMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase() as any)
}

/**
 * Validate file extension
 */
export function isValidExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (!ext) return false
  return ALLOWED_EXTENSIONS.includes(ext as any)
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Detect MIME type from file buffer (magic number detection)
 * This provides additional security beyond trusting the client-provided MIME type
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null

  // PDF: starts with %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf"
  }

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg"
  }

  // PNG: starts with 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png"
  }

  // GIF: starts with GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif"
  }

  // WebP: starts with RIFF and contains WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp"
  }

  return null
}

/**
 * Comprehensive file validation
 * Returns error message if invalid, null if valid
 */
export function validateFile(
  file: { name: string; size: number; type?: string | null },
  buffer?: Buffer
): string | null {
  // Validate file name
  if (!file.name || file.name.trim().length === 0) {
    return "File name is required"
  }

  // Validate file size
  if (!isValidFileSize(file.size)) {
    if (file.size === 0) {
      return "File is empty"
    }
    return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
  }

  // Validate extension
  if (!isValidExtension(file.name)) {
    return `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`
  }

  // Validate MIME type if provided
  if (file.type && !isValidMimeType(file.type)) {
    return `MIME type not allowed: ${file.type}`
  }

  // If buffer is provided, validate actual file content
  if (buffer) {
    const detectedMimeType = detectMimeType(buffer)
    if (detectedMimeType) {
      // Verify detected MIME type matches allowed types
      if (!isValidMimeType(detectedMimeType)) {
        return `File content type not allowed: ${detectedMimeType}`
      }
      // If client provided MIME type, verify it matches detected type
      if (file.type && detectedMimeType !== file.type.toLowerCase()) {
        return `File MIME type mismatch. Detected: ${detectedMimeType}, Provided: ${file.type}`
      }
    } else if (file.type) {
      // If we can't detect MIME type but client provided one, trust extension check
      // This handles edge cases where magic number detection might fail
    }
  }

  return null
}

