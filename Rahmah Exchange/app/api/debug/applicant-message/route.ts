import { type NextRequest, NextResponse } from "next/server"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    let token = ""
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7)
    else token = new URL(request.url).searchParams.get("token") || ""

    const decoded = token ? verifyApplicantToken(token) : null

    const formData = await request.formData()
    const conversationId = formData.get("conversationId")?.toString() || null
    const body = formData.get("body")?.toString() || null
    const messageType = formData.get("messageType")?.toString() || null
    const attachments = (formData.getAll("attachments") || []).map((f: any) => ({ name: f?.name, size: f?.size }))

    return NextResponse.json({
      ok: true,
      tokenPresent: !!token,
      tokenDecoded: decoded,
      conversationId,
      body,
      messageType,
      attachmentsCount: attachments.length,
      attachments,
    })
  } catch (err: any) {
    console.error("Debug endpoint error:", err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
