import { type NextRequest, NextResponse } from "next/server"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"

// GET /api/applicant-token/verify?token=... -> { applicantId }
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token")
    if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 })

    const decoded = verifyApplicantToken(token)
    if (!decoded || !decoded.applicantId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    return NextResponse.json({ applicantId: decoded.applicantId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Verification failed" }, { status: 500 })
  }
}
