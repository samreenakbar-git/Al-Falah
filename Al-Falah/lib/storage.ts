import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import crypto from "crypto"

type UploadResult = {
  pathname: string
  url: string
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  baseUrl?: string
): Promise<UploadResult> {
  const isVercel = !!process.env.VERCEL
  const isProduction = process.env.NODE_ENV === "production"

  // In production/Vercel, try Vercel Blob first (filesystem is read-only)
  // Vercel may provide the token automatically when Blob Store is linked
  if (isVercel || isProduction) {
    try {
      // Dynamically import @vercel/blob
      // @vercel/blob can work without explicit token if Blob Store is linked to project
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { put } = require("@vercel/blob")
      
      const blob = await put(originalName, buffer, {
        access: "public",
        addRandomSuffix: true,
      })

      return {
        pathname: blob.pathname,
        url: blob.url,
      }
    } catch (err: any) {
      console.error("Vercel Blob upload failed:", err)
      // If Vercel Blob fails, provide helpful error message
      const errorMsg = err.message || "Unknown error"
      if (errorMsg.includes("token") || errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
        throw new Error(
          `Vercel Blob storage authentication failed. Please ensure your Blob Store is linked to this project, or add VERCEL_BLOB_READ_WRITE_TOKEN environment variable. Error: ${errorMsg}`
        )
      }
      throw new Error(
        `Failed to upload file to Vercel Blob: ${errorMsg}`
      )
    }
  }

  // Check for explicit token in local dev (optional)
  const vercelBlobToken = process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN

  // Local development fallback: save under public/uploads (only for local dev)
  if (vercelBlobToken) {
    // Even in local dev, prefer Vercel Blob if token is available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { put } = require("@vercel/blob")
      
      const blob = await put(originalName, buffer, {
        access: "public",
        addRandomSuffix: true,
      })

      return {
        pathname: blob.pathname,
        url: blob.url,
      }
    } catch (err) {
      console.warn("Vercel Blob upload failed in local dev, using local storage:", err)
      // fall through to local storage for local dev only
    }
  }

  // Local storage fallback: ONLY for local development
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await fsPromises.mkdir(uploadsDir, { recursive: true })

    const random = crypto.randomBytes(6).toString("hex")
    const safeName = sanitizeFilename(originalName || `upload-${Date.now()}`)
    const filename = `${Date.now()}-${random}-${safeName}`
    const filePath = path.join(uploadsDir, filename)

    await fsPromises.writeFile(filePath, buffer)

    const origin = baseUrl || process.env.NEXT_PUBLIC_API_URL || ""
    const url = origin ? `${origin.replace(/\/$/, "")}/uploads/${encodeURIComponent(filename)}` : `/uploads/${encodeURIComponent(filename)}`

    return {
      pathname: `uploads/${filename}`,
      url,
    }
  } catch (err: any) {
    // If local storage also fails, throw error
    throw new Error(
      `Failed to upload file: ${err.message || "Unknown error"}. Local file system access failed. Please configure Vercel Blob storage.`
    )
  }
}

export async function deleteStored(pathOrUrl: string) {
  const useVercelBlob = !!process.env.VERCEL_BLOB_READ_WRITE_TOKEN || !!process.env.VERCEL_BLOB_TOKEN || false

  if (useVercelBlob) {
    try {
      // Dynamically import
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { del } = require("@vercel/blob")
      await del(pathOrUrl)
      return
    } catch (err) {
      console.error("Vercel Blob deletion failed, will attempt local deletion:", err)
      // fall through
    }
  }

  try {
    // If a full URL is provided, attempt to extract the filename under /uploads/
    let filename = pathOrUrl
    try {
      const maybeUrl = new URL(pathOrUrl)
      const parts = maybeUrl.pathname.split("/")
      filename = parts[parts.length - 1]
    } catch (e) {
      // not a URL
      filename = path.basename(pathOrUrl)
    }

    const filePath = path.join(process.cwd(), "public", "uploads", decodeURIComponent(filename))
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath)
    }
  } catch (err) {
    console.error("Local file deletion failed:", err)
  }
}
