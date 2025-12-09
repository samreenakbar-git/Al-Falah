import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import CaseNote from "@/lib/models/CaseNote"
import { requireRole } from "@/lib/role-middleware"
import mongoose from "mongoose"

/**
 * PATCH /api/cases/[caseId]/notes/[noteId] - Update case note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; noteId: string }> }
) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { title, content, priority, isResolved, approvalAmount } = await request.json()
    await dbConnect()

    const { noteId } = await params

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 })
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (content) updateData.content = content
    if (priority) updateData.priority = priority
    if (approvalAmount !== undefined) {
      updateData.approvalAmount = approvalAmount !== null && approvalAmount !== "" ? Number(approvalAmount) : undefined
    }
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved
      if (isResolved) {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = roleCheck.user?._id
      }
    }

    const note = await CaseNote.findByIdAndUpdate(noteId, updateData, { new: true }).populate(
      "authorId",
      "name email"
    )

    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 })
    }

    return NextResponse.json({ note }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/cases/[caseId]/notes/[noteId] - Delete case note (admin and approver only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; noteId: string }> }
) {
  const roleCheck = await requireRole(request, ["admin", "approver", "caseworker", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()

    const { noteId } = await params

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 })
    }

    const note = await CaseNote.findByIdAndDelete(noteId)

    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Note deleted successfully" }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
