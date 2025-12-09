import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Grant from "@/lib/models/Grant"
import { authenticateRequest } from "@/lib/auth-middleware"
import { sendEmail } from "@/lib/email"
import { getTreasurerEmails, getCaseworkerEmails } from "@/lib/internal-email"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    const { id } = await params
    await dbConnect()

    // Use grant ID, not applicantId
    const grant = await Grant.findById(id).populate("applicantId")
    if (!grant) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    // Normalize grant to ensure consistent field names in response
    const grantObj = grant.toObject()
    // Ensure grantedAmount is set (migrate from amountGranted if needed)
    if (grantObj.grantedAmount === undefined || grantObj.grantedAmount === null) {
      grantObj.grantedAmount = grantObj.amountGranted ?? 0
    }
    // Ensure remarks is set (migrate from notes if needed)
    if (!grantObj.remarks && grantObj.notes) {
      grantObj.remarks = grantObj.notes
    }
    // Ensure status has a default
    if (!grantObj.status) {
      grantObj.status = "Pending"
    }
    // Remove old field names from response
    delete grantObj.amountGranted
    delete grantObj.notes

    return NextResponse.json(grantObj)
  } catch (error: any) {
    console.error("GET grant error:", error)
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    const { id } = await params
    const { grantedAmount, amountGranted, status, remarks, notes, numberOfMonths } = await request.json()

    await dbConnect()

    // Support both field names for backwards compatibility
    const updateData: any = {}
    if (grantedAmount !== undefined || amountGranted !== undefined) {
      updateData.grantedAmount = grantedAmount || amountGranted
    }
    if (status !== undefined) {
      updateData.status = status
    }
    if (remarks !== undefined || notes !== undefined) {
      updateData.remarks = remarks || notes || ""
    }
    if (numberOfMonths !== undefined) {
      updateData.numberOfMonths = numberOfMonths
    }

    const updated = await Grant.findByIdAndUpdate(id, updateData, { new: true }).populate("applicantId")

    if (!updated) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    // Normalize grant to ensure consistent field names in response
    const grantObj = updated.toObject()
    // Ensure grantedAmount is set (migrate from amountGranted if needed)
    if (!grantObj.grantedAmount && grantObj.amountGranted) {
      grantObj.grantedAmount = grantObj.amountGranted
    }
    // Ensure remarks is set (migrate from notes if needed)
    if (!grantObj.remarks && grantObj.notes) {
      grantObj.remarks = grantObj.notes
    }
    // Ensure status has a default
    if (!grantObj.status) {
      grantObj.status = "Pending"
    }
    // Remove old field names from response
    delete grantObj.amountGranted
    delete grantObj.notes

    // Check if this is an old case - skip emails for old cases
    const applicant = grantObj.applicantId as any
    const isOldCase = applicant && (applicant as any).isOldCase === true

    // Send email to applicant when grant is updated (fire-and-forget) - skip if old case
    if (!isOldCase) {
      ;(async () => {
        try {
          if (applicant && applicant.email) {
          const baseUrl = new URL(request.url).origin
          const statusPageUrl = `${baseUrl}/`

          const statusText =
            grantObj.status === "Approved"
              ? "approved"
              : grantObj.status === "Rejected"
                ? "rejected"
                : "pending review"

          await sendEmail({
            to: applicant.email,
            subject: `Your Zakat Application Status Updated - ${grantObj.status}`,
            html: `
              <p>Assalamu Alaikum ${applicant.firstName || ""} ${applicant.lastName || ""},</p>
              <p>We are writing to inform you that your Zakat assistance application status has been updated.</p>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Case ID:</strong> ${applicant.caseId || "N/A"}</p>
                <p><strong>Status:</strong> ${grantObj.status}</p>
                ${grantObj.grantedAmount ? `<p><strong>Granted Amount:</strong> $${grantObj.grantedAmount}</p>` : ""}
                ${grantObj.remarks ? `<p><strong>Remarks:</strong> ${grantObj.remarks}</p>` : ""}
              </div>

              <p>Your application status has been updated to: <strong>${grantObj.status}</strong></p>
              
              ${grantObj.status === "Approved" && grantObj.grantedAmount
                ? `<p><strong>Congratulations!</strong> Your application has been approved and a grant of $${grantObj.grantedAmount} has been allocated to you.</p>`
                : ""}

              <p>You can check your application status on our website.</p>
              <p><a href="${statusPageUrl}" style="color: #0d9488; text-decoration: underline;">View Application Status</a></p>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
              <p>JazakAllahu Khairan.</p>
              <p>— Rahmah Foundation Team</p>
            `,
            text: `Assalamu Alaikum ${applicant.firstName || ""} ${applicant.lastName || ""},

We are writing to inform you that your Zakat assistance application status has been updated.

Case ID: ${applicant.caseId || "N/A"}
Status: ${grantObj.status}
${grantObj.grantedAmount ? `Granted Amount: $${grantObj.grantedAmount}` : ""}
${grantObj.remarks ? `Remarks: ${grantObj.remarks}` : ""}

Your application status has been updated to: ${grantObj.status}
${grantObj.status === "Approved" && grantObj.grantedAmount
                ? `Congratulations! Your application has been approved and a grant of $${grantObj.grantedAmount} has been allocated to you.`
                : ""}

You can check your application status on our website: ${statusPageUrl}

If you have any questions, please don't hesitate to contact us.
JazakAllahu Khairan.

— Rahmah Foundation Team`,
          })
        }
        } catch (emailError) {
          console.error("[grant] Failed to send email:", emailError)
          // Don't throw - email failure shouldn't block the grant update
        }
      })()
    } else {
      console.log("[grant] Skipping email notification (old case)")
    }

    return NextResponse.json(grantObj)
  } catch (error: any) {
    console.error("PUT grant error:", error)
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    const { id } = await params
    await dbConnect()

    const deleted = await Grant.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Grant deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
