import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import mongoose from "mongoose"

/**
 * GET /api/staff/messages/conversations - List all staff conversations for current user
 */
export async function GET(request: NextRequest) {
  try {
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

    // Build query based on role
    const query: any = {
      conversationId: { $regex: "^staff_" },
      isArchived: false,
    }

    if (user.role === "super_admin") {
      // Super admin sees conversations where all participants are admins
      // Find conversations where user is participant AND all other participants are admins
      query["participants.userId"] = user._id
      // We'll filter results to only show admin-to-admin conversations
    } else {
      // Regular staff sees their own conversations
      query["participants.userId"] = user._id
    }

    const conversations = await Conversation.find(query).sort({ lastMessageAt: -1, updatedAt: -1 }).lean()

    // For super_admin, filter to only show conversations with admins
    let filteredConversations = conversations
    if (user.role === "super_admin") {
      filteredConversations = conversations.filter((conv: any) => {
        // Check if all participants (except super_admin) are admins
        const otherParticipants = conv.participants.filter((p: any) => p.userId.toString() !== user._id.toString())
        return otherParticipants.every((p: any) => p.role === "admin")
      })
    }

    // Only show conversations that have at least one message
    // This ensures we only show conversations that have actually been started with messages
    filteredConversations = filteredConversations.filter((conv: any) => {
      // Show if messageCount > 0 OR if lastMessage exists (in case messageCount isn't updated yet)
      return (conv.messageCount && conv.messageCount > 0) || (conv.lastMessage && conv.lastMessage.trim().length > 0)
    })

    // Format conversations with unread counts
    const formattedConversations = await Promise.all(
      filteredConversations.map(async (conv: any) => {
        const participant = conv.participants.find((p: any) => p.userId.toString() === user._id.toString())
        const lastReadAt = participant?.lastReadAt || new Date(0)

        // Count unread messages
        const Message = (await import("@/lib/models/Message")).default
        const unreadCount = await Message.countDocuments({
          conversationId: conv.conversationId,
          senderId: { $ne: user._id },
          createdAt: { $gt: lastReadAt },
          isDeleted: false,
        })

        // Get other participants
        const otherParticipants = conv.participants
          .filter((p: any) => p.userId.toString() !== user._id.toString())
          .map((p: any) => ({
            userId: p.userId.toString(),
            name: p.name,
            email: p.email,
            role: p.role,
          }))

        return {
          _id: conv._id.toString(),
          conversationId: conv.conversationId,
          title: conv.title || `Chat with ${otherParticipants.map((p: any) => p.name).join(", ")}`,
          participants: [
            {
              userId: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
            },
            ...otherParticipants,
          ],
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          messageCount: conv.messageCount || 0,
        }
      }),
    )

    return NextResponse.json({ conversations: formattedConversations }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching staff conversations:", error)
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/staff/messages/conversations - Create or get a staff conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    // Only staff and super_admin can create conversations
    const allowedRoles = ["admin", "caseworker", "approver", "treasurer", "super_admin"]
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ message: "Only staff can create conversations" }, { status: 403 })
    }

    const { recipientIds } = await request.json()

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ message: "At least one recipient is required" }, { status: 400 })
    }

    // For super_admin, only allow creating conversations with admins
    if (user.role === "super_admin") {
      const recipientUsers = await User.find({
        _id: { $in: recipientIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      }).lean()

      const allAdmins = recipientUsers.every((u: any) => u.role === "admin")
      if (!allAdmins) {
        return NextResponse.json(
          {
            message: "Super admin can only create conversations with admins",
          },
          { status: 403 },
        )
      }
    }

    await dbConnect()

    // Get all participants (current user + recipients)
    const allParticipantIds = [user._id.toString(), ...recipientIds]
    const uniqueParticipantIds = [...new Set(allParticipantIds)]

    // Validate that all recipient IDs are valid ObjectIds
    const validRecipientIds = recipientIds.filter((id: string) => {
      try {
        new mongoose.Types.ObjectId(id)
        return true
      } catch {
        return false
      }
    })

    if (validRecipientIds.length !== recipientIds.length) {
      return NextResponse.json({ message: "Invalid recipient ID(s)" }, { status: 400 })
    }

    // Get user details for all participants
    const participants = await User.find({
      _id: { $in: uniqueParticipantIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean()

    // Verify all participants exist
    if (participants.length !== uniqueParticipantIds.length) {
      return NextResponse.json({ message: "One or more recipients not found" }, { status: 404 })
    }

    // Verify all participants are active
    const inactiveParticipants = participants.filter((p: any) => p.isActive === false)
    if (inactiveParticipants.length > 0) {
      return NextResponse.json({ message: "Cannot create conversation with inactive users" }, { status: 400 })
    }

    // Check if conversation already exists with these exact participants
    const existingConversation = await Conversation.findOne({
      conversationId: { $regex: "^staff_" },
      "participants.userId": { $all: uniqueParticipantIds.map((id) => new mongoose.Types.ObjectId(id)) },
      participants: { $size: uniqueParticipantIds.length },
    }).lean()

    if (existingConversation) {
      // Return existing conversation
      const formatted = {
        _id: existingConversation._id.toString(),
        conversationId: existingConversation.conversationId,
        title: existingConversation.title || "Staff Conversation",
        participants: existingConversation.participants.map((p: any) => ({
          userId: p.userId.toString(),
          name: p.name,
          email: p.email,
          role: p.role,
        })),
        lastMessage: existingConversation.lastMessage,
        lastMessageAt: existingConversation.lastMessageAt,
        messageCount: existingConversation.messageCount || 0,
      }
      return NextResponse.json({ conversation: formatted }, { status: 200 })
    }

    // Create new conversation
    const conversationId = `staff_${new mongoose.Types.ObjectId()}`
    const participantData = participants.map((p: any) => ({
      userId: p._id,
      email: p.email,
      internalEmail: p.internalEmail || p.email,
      name: p.name,
      role: p.role,
      joinedAt: new Date(),
      isActive: true,
    }))

    // Get tenantId from current user (required for Conversation model)
    // For super_admin, use the first participant's tenantId, or null if all are super_admin
    let tenantId = user.tenantId
    if (!tenantId && user.role === "super_admin" && participants.length > 0) {
      // Try to get tenantId from first participant
      const firstParticipant = participants.find((p: any) => p.tenantId)
      tenantId = firstParticipant?.tenantId || null
    }
    
    // If still no tenantId, we need to handle this - for staff conversations, we can use a default or make it optional
    // For now, if no tenantId, we'll use the first participant's tenantId or create without tenantId
    if (!tenantId && participants.length > 0) {
      const participantWithTenant = participants.find((p: any) => p.tenantId)
      tenantId = participantWithTenant?.tenantId || null
    }

    // Create a dummy caseId for staff conversations (since caseId is optional but we set it for consistency)
    const dummyCaseId = new mongoose.Types.ObjectId()

    const conversationData: any = {
      conversationId,
      caseId: dummyCaseId, // Dummy caseId for staff conversations
      title: `Chat: ${participants.map((p: any) => p.name).join(", ")}`,
      participants: participantData,
      messageCount: 0,
      isArchived: false,
    }

    // Only add tenantId if we have one (required field)
    if (tenantId) {
      conversationData.tenantId = tenantId
    }

    const conversation = await Conversation.create(conversationData)

    const formatted = {
      _id: conversation._id.toString(),
      conversationId: conversation.conversationId,
      title: conversation.title,
      participants: conversation.participants.map((p: any) => ({
        userId: p.userId.toString(),
        name: p.name,
        email: p.email,
        role: p.role,
      })),
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messageCount || 0,
    }

    return NextResponse.json({ conversation: formatted }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating staff conversation:", error)
    
    // Provide more detailed error messages
    let errorMessage = "Failed to create conversation"
    let statusCode = 500
    
    if (error.name === "ValidationError") {
      errorMessage = `Validation error: ${error.message}`
      statusCode = 400
    } else if (error.code === 11000) {
      errorMessage = "A conversation with these participants already exists"
      statusCode = 409
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ message: errorMessage }, { status: statusCode })
  }
}
