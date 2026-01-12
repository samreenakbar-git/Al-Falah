import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Conversation from "@/lib/models/Conversation"
import Message from "@/lib/models/Message"

/**
 * GET /api/staff/messages/conversations/[conversationId] - Get messages in a staff conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    // Only staff and super_admin can access
    const allowedRoles = ["admin", "caseworker", "approver", "treasurer", "super_admin"]
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ message: "Only staff can access this" }, { status: 403 })
    }

    await dbConnect()

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      conversationId: decodeURIComponent(conversationId),
      "participants.userId": user._id,
    }).lean()

    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found or access denied" }, { status: 404 })
    }

    // Get messages
    const messages = await Message.find({
      conversationId: decodeURIComponent(conversationId),
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .lean()

    // Update lastReadAt for current user
    await Conversation.updateOne(
      {
        _id: conversation._id,
        "participants.userId": user._id,
      },
      {
        $set: {
          "participants.$.lastReadAt": new Date(),
        },
      }
    )

    const formattedMessages = messages.map((msg: any) => ({
      _id: msg._id.toString(),
      body: msg.body,
      senderName: msg.senderName,
      senderEmail: msg.senderEmail,
      senderRole: msg.senderRole,
      senderId: msg.senderId?.toString(),
      createdAt: msg.createdAt,
      readBy: msg.readBy || [],
      attachments: msg.attachments || [],
    }))

    return NextResponse.json({ messages: formattedMessages }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching staff messages:", error)
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
  }
}

