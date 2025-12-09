import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import DocumentAudit from "@/lib/models/DocumentAudit"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import { uploadBuffer } from "@/lib/storage"
import { requireRole } from "@/lib/role-middleware"

// POST - Upload new documents (applicant OR caseworker on behalf of applicant)
export async function POST(request: NextRequest, context: any) {
  try {
    const { params } = context
    const applicantId = (await params).id

    const authHeader = request.headers.get("authorization")
    let uploadedBy = ""
    let actionBy = "applicant"

    if (authHeader?.startsWith("Bearer ")) {
      // Staff member uploading on behalf of applicant
      const roleCheck = await requireRole(request, ["admin", "caseworker"])
      if (!roleCheck.authorized) {
        return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
      }
      actionBy = "caseworker"
      uploadedBy = roleCheck.user?.email || "caseworker"
    } else {
      // Applicant uploading their own documents
      const token = new URL(request.url).searchParams.get("token")
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const decoded = verifyApplicantToken(token)
      if (!decoded || decoded.applicantId !== applicantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      uploadedBy = "applicant"
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (err: any) {
      console.error("Error parsing form data:", err)
      return NextResponse.json(
        { error: "Invalid request format. Please ensure files are properly attached." },
        { status: 400 }
      )
    }

    const uploadedFiles = formData.getAll("documents")

    // Validate that files were provided
    if (!uploadedFiles || uploadedFiles.length === 0) {
      // Check if files might be under a different key
      const allKeys = Array.from(formData.keys())
      console.log("FormData keys:", allKeys)
      console.log("Uploaded files count:", uploadedFiles.length)
      
      return NextResponse.json(
        { 
          error: "No files provided. Please select at least one file to upload.",
          debug: { keys: allKeys, filesCount: uploadedFiles.length }
        },
        { status: 400 }
      )
    }

    console.log(`Received ${uploadedFiles.length} file(s) for upload`)

    await dbConnect()

    const applicant = await ZakatApplicant.findById(applicantId)
    if (!applicant) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const documentMetadata: any[] = []
    const uploadErrors: string[] = []

    // Upload each file to Vercel Blob
    for (const f of uploadedFiles) {
      // Check if it's a valid file object
      if (!f) {
        uploadErrors.push("Empty file entry")
        continue
      }

      // In serverless environments, FormData files might not be true File instances
      // Check for arrayBuffer method (works for both File and Blob-like objects)
      if (typeof f !== "object" || typeof (f as any).arrayBuffer !== "function") {
        uploadErrors.push("Invalid file object - missing arrayBuffer method")
        continue
      }

      // Get file name - handle both File objects and File-like objects
      const fileObj = f as any
      const originalName = fileObj.name || fileObj.filename || `upload-${Date.now()}.${fileObj.type?.split('/')[1] || 'bin'}`
      
      try {
        const buffer = Buffer.from(await fileObj.arrayBuffer())
        
        // Validate file size (e.g., max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (buffer.length > maxSize) {
          uploadErrors.push(`${originalName}: File size exceeds 10MB limit`)
          continue
        }

        if (buffer.length === 0) {
          uploadErrors.push(`${originalName}: File is empty`)
          continue
        }

        const blob = await uploadBuffer(buffer, originalName, new URL(request.url).origin)

        const docMetadata = {
          filename: blob.pathname,
          originalname: originalName,
          mimeType: fileObj.type || "application/octet-stream",
          size: buffer.length,
          url: blob.url,
          uploadedAt: new Date(),
          // Don't set _id - Mongoose will auto-generate ObjectId for subdocuments
        }

        documentMetadata.push(docMetadata)

        const audit = new DocumentAudit({
          applicantId,
          documentId: blob.pathname,
          action: "uploaded",
          actionBy,
          uploadedBy,
          originalFilename: originalName,
          fileSize: buffer.length,
          mimeType: fileObj.type || "application/octet-stream",
        })
        await audit.save()

        console.log(`Document uploaded: ${blob.pathname} by ${uploadedBy}`)
      } catch (err: any) {
        console.error(`File upload error for ${originalName}:`, err)
        const errorMessage = err.message || "Upload failed"
        // Include more details in error message for debugging
        const detailedError = err.stack ? `${errorMessage} (${err.stack.split('\n')[0]})` : errorMessage
        uploadErrors.push(`${originalName}: ${detailedError}`)
      }
    }

    if (documentMetadata.length === 0) {
      console.error("All file uploads failed:", {
        totalFiles: uploadedFiles.length,
        errors: uploadErrors,
        applicantId
      })
      return NextResponse.json(
        { 
          error: "Failed to upload documents", 
          details: uploadErrors.length > 0 ? uploadErrors : ["No valid files were provided"],
          debug: {
            filesReceived: uploadedFiles.length,
            filesProcessed: documentMetadata.length,
            errors: uploadErrors
          }
        },
        { status: 400 }
      )
    }

    // Add documents to applicant
    if (documentMetadata.length > 0) {
      applicant.documents.push(...documentMetadata)
      await applicant.save()
    }

    if (uploadErrors.length > 0 && documentMetadata.length > 0) {
      return NextResponse.json(
        { 
          message: `Documents uploaded successfully, but some failed: ${uploadErrors.join(", ")}`, 
          applicant 
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: "Documents uploaded successfully", applicant },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("POST documents error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: any) {
  try {
    const { params } = context
    const applicantId = (await params).id

    // Verify auth (applicant token OR caseworker role)
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const roleCheck = await requireRole(request, ["admin", "caseworker"])
      if (!roleCheck.authorized) {
        return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
      }
    } else {
      const token = new URL(request.url).searchParams.get("token")
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const decoded = verifyApplicantToken(token)
      if (!decoded || decoded.applicantId !== applicantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    await dbConnect()
    const applicant = await ZakatApplicant.findById(applicantId, "documents")
    if (!applicant) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Get audit trail for all documents
    const auditLogs = await DocumentAudit.find({ applicantId }).sort({ createdAt: -1 })

    return NextResponse.json(
      { documents: applicant.documents, auditLogs },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
