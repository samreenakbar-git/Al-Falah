import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { sendEmail } from "@/lib/email"
import { generateApplicantToken } from "@/lib/applicant-token-utils"

/**
 * POST /api/applicants/request-login-link
 * Applicants can request a login link via email
 */
export async function POST(request: NextRequest) {
  try {
    const { email, caseId } = await request.json()

    if (!email && !caseId) {
      return NextResponse.json(
        { message: "Email or Case ID required" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find applicant by email or case ID
    let applicant
    if (email) {
      applicant = await ZakatApplicant.findOne({ email: email.toLowerCase() })
    } else if (caseId) {
      applicant = await ZakatApplicant.findOne({ caseId })
    }

    if (!applicant) {
      return NextResponse.json(
        { message: "Application not found" },
        { status: 404 }
      )
    }

    // Generate login token
    const token = generateApplicantToken(applicant._id.toString())

    // Generate portal URL
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/applicant-portal/${applicant._id}?token=${token}`

    // Send email
    const emailResult = await sendEmail({
      to: applicant.email,
      subject: "Your Rahmah Exchange Application Portal Link",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to Rahmah Exchange</h2>
          <p>Dear ${applicant.firstName},</p>
          <p>Click the link below to access your application portal and manage your documents:</p>
          <p>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Access Your Application
            </a>
          </p>
          <p>Or copy this link: <a href="${portalUrl}">${portalUrl}</a></p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            This link will work for 30 days. If it expires, you can request a new one.
          </p>
          <p>Best regards,<br>Rahmah Exchange Team</p>
        </div>
      `,
    })

    if (emailResult.error) {
      return NextResponse.json(
        { message: "Failed to send email", error: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: "Login link sent to your email",
        email: applicant.email,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Request login link error:", error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}
