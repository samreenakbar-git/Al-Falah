import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import DocumentAudit from "@/lib/models/DocumentAudit"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import { requireRole } from "@/lib/role-middleware"
import { deleteStored } from "@/lib/storage"

// DELETE document (applicant OR caseworker)
export async function DELETE(request: NextRequest, context: any) {
  try {
    const { params } = context
    const applicantId = (await params).id
    let documentId = (await params).documentId
    
    // Decode the documentId in case it was URL encoded
    try {
      documentId = decodeURIComponent(documentId)
    } catch {
      // If decoding fails, use original
    }

    const authHeader = request.headers.get("authorization")
    let actionBy = "applicant"
    let deletedBy = ""

    if (authHeader?.startsWith("Bearer ")) {
      // Staff member (caseworker/admin) deleting document
      const roleCheck = await requireRole(request, ["admin", "caseworker"])
      if (!roleCheck.authorized) {
        return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
      }
      actionBy = "caseworker"
      deletedBy = roleCheck.user?.email || "caseworker"
    } else {
      // Applicant deleting their own document - verify token and ownership
      const token = new URL(request.url).searchParams.get("token") || ""
      if (!token) {
        return NextResponse.json({ error: "Unauthorized: Token required" }, { status: 401 })
      }

      const decoded = verifyApplicantToken(token)
      if (!decoded || decoded.applicantId !== applicantId) {
        return NextResponse.json({ error: "Unauthorized: Invalid token or not your document" }, { status: 403 })
      }

      actionBy = "applicant"
      deletedBy = applicantId
    }

    await dbConnect()

    const applicant = await ZakatApplicant.findById(applicantId)
    if (!applicant) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Find the document - try multiple ways to match
    let docIndex = -1
    let document: any = null
    
    // Try to find by _id (ObjectId or string)
    for (let i = 0; i < applicant.documents.length; i++) {
      const doc = applicant.documents[i] as any
      const docIdStr = doc._id ? (typeof doc._id === 'string' ? doc._id : doc._id.toString()) : null
      
      if (docIdStr === documentId || doc.filename === documentId || doc._id?.toString() === documentId) {
        docIndex = i
        document = doc
        break
      }
    }
    
    if (docIndex === -1 || !document) {
      console.error("Document not found", { 
        documentId, 
        availableDocs: applicant.documents.map((d: any) => ({ 
          _id: d._id?.toString(), 
          filename: d.filename 
        })) 
      })
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete from storage (Vercel Blob or local)
    try {
      await deleteStored(document.url)
    } catch (err) {
      console.error("File deletion error:", err)
    }

    // Remove from documents array
    applicant.documents.splice(docIndex, 1)
    await applicant.save()

    // Log this deletion
    const audit = new DocumentAudit({
      applicantId,
      documentId: document.filename,
      action: "deleted",
      actionBy,
      uploadedBy: deletedBy || applicant.email,
      originalFilename: document.originalname,
      fileSize: document.size,
      mimeType: document.mimeType,
    })
    await audit.save()

    return NextResponse.json({ message: "Document deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("DELETE document error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
