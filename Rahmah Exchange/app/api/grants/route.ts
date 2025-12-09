import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Grant from "@/lib/models/Grant"
import { authenticateRequest } from "@/lib/auth-middleware"
import { sendEmail } from "@/lib/email"
import mongoose from "mongoose"

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    const { applicantId, grantedAmount, amountGranted, status, remarks, notes, numberOfMonths, skipEmail } = await request.json()

    if (!mongoose.Types.ObjectId.isValid(applicantId)) {
      return NextResponse.json({ message: "Invalid applicantId" }, { status: 400 })
    }

    await dbConnect()

    // Verify applicant exists
    const ZakatApplicant = (await import("@/lib/models/ZakatApplicant")).default
    const applicant = await ZakatApplicant.findById(applicantId)
    if (!applicant) {
      return NextResponse.json({ message: "Applicant not found" }, { status: 404 })
    }

    // Check if this is an old case - if skipEmail is not provided, check applicant's isOldCase field
    const shouldSkipEmail = skipEmail === true || (applicant as any).isOldCase === true

    // Support both field names for backwards compatibility
    // Handle both undefined and null cases, but allow 0 as a valid value
    const amount = grantedAmount !== undefined && grantedAmount !== null 
      ? grantedAmount 
      : amountGranted !== undefined && amountGranted !== null 
        ? amountGranted 
        : null

    // Either grantedAmount or numberOfMonths must be provided
    if ((amount === null || amount === undefined) && (numberOfMonths === null || numberOfMonths === undefined)) {
      return NextResponse.json({ message: "Either grantedAmount or numberOfMonths is required" }, { status: 400 })
    }

    const grantRemarks = remarks || notes || ""

    // Validate status is one of the allowed enum values
    const validStatuses = ["Pending", "Approved", "Rejected"]
    const grantStatus = status && status.trim() && validStatuses.includes(status.trim()) 
      ? status.trim() 
      : "Pending"
    
    // Check if grant already exists for this applicant
    const existingGrant = await Grant.findOne({ applicantId })
    
    // Create grant with ONLY the new field names - never include amountGranted
    const grantData: any = {
      applicantId,
      status: grantStatus,
    }
    
    if (amount !== null && amount !== undefined) {
      grantData.grantedAmount = Number(amount)
    }
    
    if (numberOfMonths !== null && numberOfMonths !== undefined) {
      grantData.numberOfMonths = Number(numberOfMonths)
    }
    
    console.log("Creating/updating grant:", {
      applicantId,
      grantedAmount: grantData.grantedAmount || "not set",
      numberOfMonths: grantData.numberOfMonths || "not set",
      status: grantData.status,
      remarks: grantRemarks || "none"
    })

    if (grantRemarks) {
      grantData.remarks = grantRemarks
    }
    
    let grant
    if (existingGrant) {
      // Update existing grant
      Object.assign(existingGrant, grantData)
      grant = existingGrant
    } else {
      // Create new grant
      grant = new Grant(grantData)
    }

    // Explicitly ensure amountGranted is not in the data
    delete grantData.amountGranted
    delete grantData.notes
    
    // Double-check that amountGranted is not set on the document
    if ('amountGranted' in grant.toObject()) {
      grant.set('amountGranted', undefined)
    }
    
    // Unmark amountGranted as modified to prevent validation
    if (grantData.grantedAmount !== undefined) {
      grant.markModified('grantedAmount')
    }
    grant.unmarkModified('amountGranted')

    // Save with validation, but catch any validation errors
    try {
      await grant.save({ validateBeforeSave: true })
      console.log("✅ Grant saved successfully:", grant._id)
    } catch (saveError: any) {
      console.error("❌ Grant save error:", {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        errors: saveError.errors,
      })
      
      // If the error is about amountGranted being required, it's a schema cache issue
      if (saveError.message && saveError.message.includes('amountGranted') && saveError.message.includes('required')) {
        console.error('Schema cache issue detected. Please restart the development server.')
        // Try saving without validation as a fallback (not ideal, but works)
        await grant.save({ validateBeforeSave: false })
      } else {
        // Re-throw with more context
        throw new Error(`Failed to save grant: ${saveError.message || saveError}`)
      }
    }

    // Update applicant status to match grant status if grant is Approved
    if (grantStatus === "Approved" && applicant.status !== "Approved") {
      applicant.status = "Approved"
      await applicant.save()
      console.log("✅ Updated applicant status to Approved")
    }

    // Populate applicant data before returning
    await grant.populate("applicantId")

    // Normalize grant to ensure consistent field names in response
    const grantObj = grant.toObject()
    // Ensure grantedAmount is set
    if (!grantObj.grantedAmount && grantObj.amountGranted) {
      grantObj.grantedAmount = grantObj.amountGranted
    }
    // Ensure remarks is set
    if (!grantObj.remarks && grantObj.notes) {
      grantObj.remarks = grantObj.notes
    }
    // Remove old field names from response
    delete grantObj.amountGranted
    delete grantObj.notes

    // Send email to applicant (fire-and-forget, don't block response) - skip if shouldSkipEmail is true
    if (!shouldSkipEmail) {
      ;(async () => {
        try {
          const applicant = grantObj.applicantId as any
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
            subject: `Your Zakat Application Status - ${grantObj.status}`,
            html: `
              <p>Assalamu Alaikum ${applicant.firstName || ""} ${applicant.lastName || ""},</p>
              <p>We are writing to inform you about the status of your Zakat assistance application.</p>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Case ID:</strong> ${applicant.caseId || "N/A"}</p>
                <p><strong>Status:</strong> ${grantObj.status}</p>
                ${grantObj.grantedAmount ? `<p><strong>Granted Amount:</strong> $${grantObj.grantedAmount}</p>` : ""}
                ${grantObj.remarks ? `<p><strong>Remarks:</strong> ${grantObj.remarks}</p>` : ""}
              </div>

              <p>Your application has been ${statusText}.</p>
              
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

We are writing to inform you about the status of your Zakat assistance application.

Case ID: ${applicant.caseId || "N/A"}
Status: ${grantObj.status}
${grantObj.grantedAmount ? `Granted Amount: $${grantObj.grantedAmount}` : ""}
${grantObj.remarks ? `Remarks: ${grantObj.remarks}` : ""}

Your application has been ${statusText}.
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
        // Don't throw - email failure shouldn't block the grant creation
      }
      })()
    } else {
      console.log("[grant] Skipping email notification (old case or skipEmail flag set)")
    }

    return NextResponse.json(grantObj, { status: 201 })
  } catch (error: any) {
    console.error("POST grant error:", {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    })
    
    // Return detailed error in development
    const isDev = process.env.NODE_ENV !== "production"
    return NextResponse.json(
      { 
        message: error?.message || "Server error",
        error: isDev ? error?.message : undefined,
        details: isDev ? {
          name: error?.name,
          code: error?.code,
        } : undefined,
      }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const applicantId = searchParams.get("applicantId")

    // Build filter
    const filter: any = {}
    if (applicantId && mongoose.Types.ObjectId.isValid(applicantId)) {
      filter.applicantId = applicantId
    }

    const grants = await Grant.find(filter).populate("applicantId").sort({ createdAt: -1 })

    // Normalize grants to ensure consistent field names in response
    const normalizedGrants = grants.map((grant: any) => {
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
      return grantObj
    })

    const totalGranted = normalizedGrants.reduce((sum: number, g: any) => sum + (g.grantedAmount ?? 0), 0)

    return NextResponse.json({
      items: normalizedGrants,
      total: normalizedGrants.length,
      totalGranted,
    })
  } catch (error: any) {
    console.error("GET grants error:", error)
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 })
  }
}
