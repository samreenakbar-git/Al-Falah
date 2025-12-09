import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Notification from "@/lib/models/Notification"
import { authenticateRequest } from "@/lib/auth-middleware"

// GET notifications
export async function GET(request: NextRequest) {
  try {
    const { error } = await authenticateRequest(request)
    if (error) return NextResponse.json({ message: error }, { status: 401 })

    await dbConnect()

    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const sort = url.searchParams.get("sort") || "-createdAt"
    const applicantId = url.searchParams.get("applicantId")

    const query = applicantId ? { applicantId } : {}
    const notifications = await Notification.find(query).sort(sort).limit(limit).populate("applicantId")

    return NextResponse.json({
      items: notifications,
      total: await Notification.countDocuments(query),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
