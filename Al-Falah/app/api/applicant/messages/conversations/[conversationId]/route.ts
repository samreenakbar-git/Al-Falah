import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import Message from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"

// GET - Fetch messages for a conversation (applicant)
export async function GET(request: NextRequest, context: any) {
  try {
    const { params } = context
    const conversationId = (await params).conversationId

    // Get token from Authorization header or query params
    const authHeader = request.headers.get("authorization")
    let token = ""

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7)
    } else {
      token = new URL(request.url).searchParams.get("token") || ""
    }

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyApplicantToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 })
    }

    const applicantId = decoded.applicantId
    const includeDetails = new URL(request.url).searchParams.get("details") === "true"

    await dbConnect()

    // Verify applicant is participant in conversation
    const conversation = await Conversation.findOne({ conversationId })
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const isParticipant = conversation.participants.some((p: any) => {
      try {
        const pUserId = p.userId ? p.userId.toString() : null
        return pUserId === applicantId
      } catch (e) {
        return p.userId === applicantId
      }
    })
    if (!isParticipant) {
      console.error("Access denied for applicant messaging GET", {
        applicantId,
        conversationId,
        participants: conversation.participants.map((p: any) => (p.userId ? (p.userId.toString ? p.userId.toString() : p.userId) : p)),
      })
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch messages
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 })

    // If details are requested, also return conversation info with participants
    if (includeDetails) {
      return NextResponse.json({ messages, conversation }, { status: 200 })
    }

    return NextResponse.json({ messages }, { status: 200 })
  } catch (error: any) {
    console.error("GET messages error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
