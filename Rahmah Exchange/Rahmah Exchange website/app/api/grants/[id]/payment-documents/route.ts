import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Grant from "@/lib/models/Grant"
import { requireRole } from "@/lib/role-middleware"
import { uploadBuffer } from "@/lib/storage"

/**
 * POST /api/grants/[id]/payment-documents - Upload payment documents (treasurer/admin only)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = await requireRole(request, ["treasurer", "admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { id } = await params
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No files provided" }, { status: 400 })
    }

    await dbConnect()

    const grant = await Grant.findById(id)
    if (!grant) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    const uploadedDocuments: any[] = []
    const uploadErrors: string[] = []

    for (const file of files) {
      try {
        if (file.size === 0) {
          uploadErrors.push(`${file.name}: File is empty`)
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const blob = await uploadBuffer(buffer, file.name, new URL(request.url).origin)

        const docMetadata = {
          filename: blob.pathname,
          originalname: file.name,
          url: blob.url,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date(),
          uploadedBy: roleCheck.user?._id?.toString() || "",
        }

        uploadedDocuments.push(docMetadata)
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error)
        uploadErrors.push(`${file.name}: ${error.message || "Upload failed"}`)
      }
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json(
        { message: "Failed to upload files", errors: uploadErrors },
        { status: 400 }
      )
    }

    // Add documents to grant
    // Initialize paymentDocuments if it doesn't exist
    if (!grant.paymentDocuments) {
      // Use Mongoose's set method to properly initialize the array
      grant.set('paymentDocuments', [])
    }
    // Push all documents to the array
    grant.paymentDocuments.push(...(uploadedDocuments as any[]))
    await grant.save()

    const response: any = {
      message: "Payment documents uploaded successfully",
      documents: uploadedDocuments,
    }

    if (uploadErrors.length > 0) {
      response.partialSuccess = true
      response.errors = uploadErrors
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error("Error uploading payment documents:", error)
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}

/**
 * GET /api/grants/[id]/payment-documents - Get payment documents (treasurer/admin only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = await requireRole(request, ["treasurer", "admin", "caseworker", "approver"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { id } = await params
    await dbConnect()

    const grant = await Grant.findById(id).select("paymentDocuments")
    if (!grant) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    return NextResponse.json({ documents: grant.paymentDocuments || [] }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}

