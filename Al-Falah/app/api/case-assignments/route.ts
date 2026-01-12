import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import CaseAssignment from "@/lib/models/CaseAssignment"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"
import { sendEmail } from "@/lib/email"

/**
 * GET /api/case-assignments - List assignments
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "caseworker"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get("assignedTo")
    const status = searchParams.get("status")

    const filter: any = {}
    if (assignedTo) filter.assignedTo = assignedTo
    if (status) filter.status = status
    // Caseworkers can only see their own assignments
    if (roleCheck.user?.role === "caseworker") {
      filter.assignedTo = roleCheck.user._id
    }

    const assignments = await CaseAssignment.find(filter)
      .populate("applicantId", "firstName lastName caseId")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json({ assignments }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/case-assignments - Assign case to manager (admin only)
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { caseId, assignedToId, priority = "medium", assignmentNotes } = await request.json()

    if (!caseId || !assignedToId) {
      return NextResponse.json({ message: "caseId and assignedToId required" }, { status: 400 })
    }

    await dbConnect()

    const applicant = await ZakatApplicant.findOne({ caseId })
    if (!applicant) {
      return NextResponse.json({ message: "Case not found" }, { status: 404 })
    }

    const caseworker = await User.findById(assignedToId)
    if (!caseworker || caseworker.role !== "caseworker") {
      return NextResponse.json({ message: "Invalid caseworker" }, { status: 400 })
    }

    const assignment = await CaseAssignment.create({
      applicantId: applicant._id,
      caseId,
      assignedTo: assignedToId,
      assignedBy: roleCheck.user?._id,
      priority,
      assignmentNotes,
      notificationSent: true,
      notificationSentAt: new Date(),
    })

    // Send notification email
    await sendEmail({
      to: caseworker.internalEmail || caseworker.email,
      subject: `New Case Assignment: ${applicant.firstName} ${applicant.lastName}`,
      html: `
        <p>Dear ${caseworker.name},</p>
        <p>A new case has been assigned to you.</p>
        <p><strong>Case Details:</strong></p>
        <ul>
          <li>Case ID: ${applicant.caseId}</li>
          <li>Applicant: ${applicant.firstName} ${applicant.lastName}</li>
          <li>Priority: ${priority}</li>
          <li>Amount Requested: $${applicant.amountRequested}</li>
        </ul>
        ${assignmentNotes ? `<p><strong>Notes:</strong> ${assignmentNotes}</p>` : ""}
        <p>Please review the case and update the status accordingly.</p>
      `,
    })

    await assignment.populate("applicantId").populate("assignedTo").populate("assignedBy")

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
