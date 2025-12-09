import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Conversation from "@/lib/models/Conversation"
import Message from "@/lib/models/Message"

// Define a local type for conversation objects returned from .lean()
type ConversationWithParticipants = {
  _id: mongoose.Types.ObjectId
  conversationId: string
  caseId?: any
  participants: {
    userId: string
    lastReadAt?: Date
  }[]
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
  lastMessageAt?: Date
  [key: string]: any
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { error, user } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    const userId = user._id?.toString()
    if (!userId) {
      return NextResponse.json({ message: "Invalid user" }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    const archived = searchParams.get("archived") === "true"
    const skip = (page - 1) * limit

    // Allow all staff roles (admin, caseworker, approver, treasurer) to see all conversations
    // Non-staff users (applicants) can only see their own conversations
    const isStaff = ["admin", "caseworker", "approver", "treasurer"].includes(user.role)

    await dbConnect()

    // Build MongoDB query
    const query: any = { isArchived: archived }
    if (!isStaff) {
      query["participants.userId"] = userId
    }

    // Debug logging
    console.log("Querying conversations with:", query)
    console.log("Authenticated user:", user)

    // Fetch conversations
    // Use .lean() to get plain objects, then cast to expected type
    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("caseId", "caseId firstName lastName email")
      .lean() as ConversationWithParticipants[]

    const total = await Conversation.countDocuments(query)

    // Count unread messages for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const userParticipant = conv.participants.find(p => p.userId === userId)
        const lastReadAt = userParticipant?.lastReadAt

        const unreadCount = await Message.countDocuments({
          conversationId: conv.conversationId,
          isDeleted: false,
          createdAt: { $gt: lastReadAt || conv.createdAt },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        })

        return {
          ...conv,
          unreadCount,
        }
      })
    )

    return NextResponse.json({
      conversations: conversationsWithUnread,
      total,
      page,
      limit,
    })
  } catch (error: any) {
    console.error("GET conversations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
