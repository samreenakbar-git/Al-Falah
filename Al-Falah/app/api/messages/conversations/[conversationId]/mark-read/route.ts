import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Message from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"

export async function POST(request: NextRequest, context: any) {
  try {
    const params = await context.params
    const conversationId = params.conversationId

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    const { error, user } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    const userId = user._id?.toString()
    if (!userId) {
      return NextResponse.json({ message: "Invalid user" }, { status: 401 })
    }

    // Allow all staff roles (admin, caseworker, approver, treasurer) to mark as read
    const isStaff = ["admin", "caseworker", "approver", "treasurer"].includes(user.role)

    await dbConnect()

    const conversation = await Conversation.findOne({ conversationId })
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.userId?.toString() === userId
    )
    if (!isParticipant && !isStaff) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Mark all unread messages in this conversation as read
    await Message.updateMany(
      {
        conversationId,
        isDeleted: false,
        "readBy.userId": { $ne: new mongoose.Types.ObjectId(userId) },
      },
      {
        $push: {
          readBy: {
            userId: new mongoose.Types.ObjectId(userId),
            readAt: new Date(),
          },
        },
      }
    )

    // Update the participant's lastReadAt timestamp
    await Conversation.updateOne(
      { conversationId, "participants.userId": new mongoose.Types.ObjectId(userId) },
      { $set: { "participants.$.lastReadAt": new Date() } }
    )

    return NextResponse.json({ message: "Conversation marked as read" }, { status: 200 })
  } catch (error: any) {
    console.error("POST mark-read error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

