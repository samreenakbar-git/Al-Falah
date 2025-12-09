import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Grant from "@/lib/models/Grant"
import { requireRole } from "@/lib/role-middleware"

/**
 * DELETE /api/grants/[id]/payment-documents/[documentId] - Delete payment document (treasurer/admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const roleCheck = await requireRole(request, ["treasurer", "admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { id, documentId } = await params
    await dbConnect()

    const grant = await Grant.findById(id)
    if (!grant) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    if (!grant.paymentDocuments || grant.paymentDocuments.length === 0) {
      return NextResponse.json({ message: "No payment documents found" }, { status: 404 })
    }

    // Decode documentId if it's URL encoded
    const decodedDocumentId = decodeURIComponent(documentId)

    // Find and remove the document
    const docIndex = grant.paymentDocuments.findIndex(
      (doc: any) =>
        doc._id?.toString() === decodedDocumentId ||
        doc.filename === decodedDocumentId ||
        doc.url?.includes(decodedDocumentId)
    )

    if (docIndex === -1) {
      return NextResponse.json({ message: "Payment document not found" }, { status: 404 })
    }

    grant.paymentDocuments.splice(docIndex, 1)
    await grant.save()

    return NextResponse.json({ message: "Payment document deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting payment document:", error)
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}

