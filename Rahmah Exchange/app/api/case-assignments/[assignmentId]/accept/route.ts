import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import CaseAssignment from "@/lib/models/CaseAssignment"
import { requireRole } from "@/lib/role-middleware"
import mongoose from "mongoose"

/**
 * POST /api/case-assignments/[assignmentId]/accept - Accept case assignment
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const roleCheck = await requireRole(request, ["caseworker"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()

    const { assignmentId } = await params

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ message: "Invalid assignment ID" }, { status: 400 })
    }

    const assignment = await CaseAssignment.findById(assignmentId)

    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 })
    }

    if (assignment.assignedTo.toString() !== roleCheck.user?._id?.toString()) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 })
    }

    assignment.status = "active"
    assignment.acceptedAt = new Date()
    await assignment.save()

    await assignment.populate("applicantId").populate("assignedTo").populate("assignedBy")

    return NextResponse.json({ assignment }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
