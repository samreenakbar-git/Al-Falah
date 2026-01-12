import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Conversation from "@/lib/models/Conversation"
import Message from "@/lib/models/Message"
import ZakatApplicant from "@/lib/models/ZakatApplicant"

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

    // Allow all staff roles (admin, caseworker, approver, treasurer, super_admin) to see conversations
    // Non-staff users (applicants) can only see their own conversations
    const isStaff = ["admin", "caseworker", "approver", "treasurer", "super_admin"].includes(user.role)

    await dbConnect()

    // Build MongoDB query
    const query: any = { isArchived: archived }

    if (!isStaff) {
      // Applicants: only conversations where they are a participant
      query["participants.userId"] = userId
    } else {
      // Staff: restrict by masjid (tenant) so each masjid only sees its own conversations
      if (user.role !== "super_admin" && user.tenantId) {
        query.tenantId = user.tenantId
      }
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

    // Filter out conversations where the applicant (caseId) is deleted or null
    // Also verify the applicant actually exists in the database
    const validConversations = await Promise.all(
      conversations.map(async (conv) => {
        // If caseId is null or undefined, filter it out
        if (!conv.caseId) return null
        // If caseId is an object but missing required fields, filter it out
        if (typeof conv.caseId === 'object' && (!conv.caseId.firstName || !conv.caseId.caseId)) {
          return null
        }
        // Verify the applicant actually exists in the database
        if (conv.caseId && typeof conv.caseId === 'object' && conv.caseId._id) {
          const applicantExists = await ZakatApplicant.findById(conv.caseId._id).lean()
          if (!applicantExists) {
            return null
          }
        }
        return conv
      })
    )
    
    // Remove null entries (filtered out conversations)
    const filteredConversations = validConversations.filter((conv) => conv !== null) as ConversationWithParticipants[]

    const total = await Conversation.countDocuments(query)

    // Count unread messages for each conversation
    const conversationsWithUnread = await Promise.all(
      filteredConversations.map(async (conv) => {
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
