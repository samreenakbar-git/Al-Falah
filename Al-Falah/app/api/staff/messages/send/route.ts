import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Message from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { sendEmail } from "@/lib/email"
import mongoose from "mongoose"

/**
 * POST /api/staff/messages/send - Send a message in a staff conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    // Only staff and super_admin can send messages
    const allowedRoles = ["admin", "caseworker", "approver", "treasurer", "super_admin"]
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ message: "Only staff can send messages" }, { status: 403 })
    }

    const formData = await request.formData()
    const conversationId = formData.get("conversationId")?.toString()
    const body = formData.get("body")?.toString()

    if (!conversationId || !body) {
      return NextResponse.json({ message: "conversationId and body are required" }, { status: 400 })
    }

    await dbConnect()

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      conversationId,
      "participants.userId": user._id,
    })

    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found or access denied" }, { status: 404 })
    }

    // Get all participants except sender
    const recipients = conversation.participants.filter(
      (p: any) => p.userId.toString() !== user._id.toString()
    )

    // Get tenantId from conversation or user (required for Message model, but optional for staff conversations)
    let tenantId: mongoose.Types.ObjectId | null | undefined =
      conversation.tenantId instanceof mongoose.Types.ObjectId
        ? conversation.tenantId
        : conversation.tenantId
        ? new mongoose.Types.ObjectId(conversation.tenantId as any)
        : undefined

    if (!tenantId && user.tenantId) {
      tenantId =
        user.tenantId instanceof mongoose.Types.ObjectId
          ? user.tenantId
          : new mongoose.Types.ObjectId(user.tenantId as any)
    }
    // If still no tenantId, try to get from first participant
    if (!tenantId && recipients.length > 0) {
      const firstRecipient = await User.findById(recipients[0].userId).lean()
      if (firstRecipient && (firstRecipient as any).tenantId) {
        const tId = (firstRecipient as any).tenantId
        tenantId =
          tId instanceof mongoose.Types.ObjectId ? tId : new mongoose.Types.ObjectId(tId as any)
      }
    }

    // Create message (caseId and tenantId are optional for staff conversations)
    // Handle potential index errors gracefully
    let message
    try {
      const messageData: any = {
        conversationId,
        caseId: conversation.caseId || undefined, // Optional for staff conversations
        senderId: user._id,
        senderEmail: user.internalEmail || user.email,
        senderRole: user.role,
        senderName: user.name,
        body,
        messageType: "text",
        recipientIds: recipients.map((p: any) => p.userId),
        recipientEmails: recipients.map((p: any) => p.email || p.internalEmail),
        readBy: [
          {
            userId: user._id,
            readAt: new Date(),
          },
        ],
      }

      // Only add tenantId if we have one
      if (tenantId) {
        messageData.tenantId = tenantId
      }

      message = await Message.create(messageData)
    } catch (createError: any) {
      // If error is about parallel arrays index, try to drop it and retry
      if (createError.message && createError.message.includes("parallel arrays")) {
        console.warn("Parallel arrays index error detected, attempting to fix...")
        try {
          const db = mongoose.connection.db
          if (db) {
            const collection = db.collection("messages")
            const indexes = await collection.listIndexes().toArray()
            const problematicIndex = indexes.find(
              (idx: any) =>
                idx.name === "recipientIds_1_readBy_1" ||
                idx.name === "readBy_1_recipientIds_1" ||
                (idx.key && idx.key.recipientIds && idx.key.readBy)
            )
            
            if (problematicIndex) {
              await collection.dropIndex(problematicIndex.name)
              console.log(`Dropped problematic index: ${problematicIndex.name}`)
              // Retry message creation
              const retryMessageData: any = {
                conversationId,
                caseId: conversation.caseId || undefined,
                senderId: user._id,
                senderEmail: user.internalEmail || user.email,
                senderRole: user.role,
                senderName: user.name,
                body,
                messageType: "text",
                recipientIds: recipients.map((p: any) => p.userId),
                recipientEmails: recipients.map((p: any) => p.email || p.internalEmail),
                readBy: [
                  {
                    userId: user._id,
                    readAt: new Date(),
                  },
                ],
              }

              // Only add tenantId if we have one
              if (tenantId) {
                retryMessageData.tenantId = tenantId
              }

              message = await Message.create(retryMessageData)
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        } catch (fixError: any) {
          console.error("Failed to fix index and create message:", fixError)
          throw createError // Throw original error
        }
      } else {
        throw createError
      }
    }

    // Update conversation
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastMessage: body,
          lastMessageAt: new Date(),
        },
        $inc: {
          messageCount: 1,
        },
      }
    )

    // Send email notifications to recipients
    for (const recipient of recipients) {
      try {
        const recipientUser = await User.findById(recipient.userId).lean() as any
        if (recipientUser && recipientUser.emailOnNewMessage) {
          await sendEmail({
            to: recipientUser.email,
            subject: `New message from ${user.name} - Staff Chat`,
            html: `
              <p>You have a new message from <strong>${user.name}</strong>:</p>
              <p>${body}</p>
              <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/staff/messages">View Message</a></p>
            `,
          })
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError)
      }
    }

    const formattedMessage = {
      _id: message._id.toString(),
      body: message.body,
      senderName: message.senderName,
      senderEmail: message.senderEmail,
      senderRole: message.senderRole,
      senderId: message.senderId?.toString() || "",
      createdAt: message.createdAt,
      readBy: message.readBy || [],
    }

    return NextResponse.json({ message: formattedMessage }, { status: 201 })
  } catch (error: any) {
    console.error("Error sending staff message:", error)
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
  }
}

