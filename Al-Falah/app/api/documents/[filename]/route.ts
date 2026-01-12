import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params

    if (filename.startsWith("http")) {
      return NextResponse.redirect(filename, 302)
    }

    // Check local public/uploads first (local dev fallback)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads")
      const localPath = path.join(uploadsDir, filename)

      if (fs.existsSync(localPath)) {
        const fileBuffer = await fs.promises.readFile(localPath)
        const ext = filename.split(".").pop()?.toLowerCase()

        const mimeTypes: Record<string, string> = {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          doc: "application/msword",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          txt: "text/plain",
          csv: "text/csv",
        }

        const contentType = mimeTypes[ext || ""] || "application/octet-stream"

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "public, max-age=31536000",
          },
        })
      }
    } catch (e) {
      // ignore and fall back to blob redirect
    }

    // Fallback: redirect to Vercel Blob URL
    const blobUrl = `https://blob.vercel-storage.com/${filename}`
    return NextResponse.redirect(blobUrl, 302)
  } catch (error) {
    console.error("Document fetch error:", error)
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }
}
