import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import CaseNote from "@/lib/models/CaseNote"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { requireRole } from "@/lib/role-middleware"

/**
 * GET /api/cases/[caseId]/notes - Get all notes for a case
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const includeInternal = searchParams.get("includeInternal") !== "false"

    const filter: any = { caseId }
    if (!includeInternal) {
      filter.isInternal = false
    }

    const notes = await CaseNote.find(filter)
      .populate("authorId", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json({ notes }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/notes - Create a new case note
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { title, content, noteType = "internal_note", isInternal = true, priority = "medium", approvalAmount } = await request.json()

    if (!content) {
      return NextResponse.json({ message: "Content is required" }, { status: 400 })
    }

    await dbConnect()

    const { caseId } = await params
    const applicant = await ZakatApplicant.findOne({ caseId })

    if (!applicant) {
      return NextResponse.json({ message: "Case not found" }, { status: 404 })
    }

    const noteData: any = {
      applicantId: applicant._id,
      caseId,
      authorId: roleCheck.user?._id,
      authorRole: roleCheck.user?.role,
      authorEmail: roleCheck.user?.email,
      authorName: roleCheck.user?.name,
      title,
      content,
      noteType,
      isInternal,
      priority,
    }

    if (approvalAmount !== undefined && approvalAmount !== null) {
      noteData.approvalAmount = Number(approvalAmount)
    }

    const note = await CaseNote.create(noteData)

    await note.populate("authorId", "name email")

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
