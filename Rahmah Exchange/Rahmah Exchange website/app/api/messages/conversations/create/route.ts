import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Conversation from "@/lib/models/Conversation"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import User from "@/lib/models/User"
import { generateConversationId } from "@/lib/messaging-utils"

// POST - Create or get conversation for a case
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(request)
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 })
    }

    const userId = user?._id?.toString()

    const { caseId, participantIds } = await request.json()

    if (!caseId) {
      return NextResponse.json(
        { error: "Missing caseId" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get the case - caseId can be either MongoDB ObjectId or caseId string
    let zakatCase = null
    if (caseId.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      zakatCase = await ZakatApplicant.findById(caseId)
    } else {
      // It's a caseId string, find by caseId field
      zakatCase = await ZakatApplicant.findOne({ caseId: caseId })
    }
    
    if (!zakatCase) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      )
    }

    // Use the actual caseId string for conversation ID generation
    const actualCaseId = zakatCase.caseId || zakatCase._id.toString()
    const conversationId = generateConversationId(actualCaseId)

    // Check if conversation already exists
    let conversation = await Conversation.findOne({ conversationId })

    if (conversation) {
      return NextResponse.json(
        { conversation, isNew: false },
        { status: 200 }
      )
    }

    // Create new conversation
    // Always include: applicant (case creator), current user, and specified participants
    const participants = [
      // Add applicant as participant
      {
        userId: zakatCase._id,
        email: zakatCase.email,
        internalEmail: zakatCase.email,
        name: `${zakatCase.firstName} ${zakatCase.lastName}`,
        role: "applicant",
        joinedAt: new Date(),
        lastReadAt: new Date(),
        isActive: true,
      },
    ]

    // Add current staff user
    if (userId) {
      const currentUser = await User.findById(userId)
      if (currentUser) {
        participants.push({
          userId: userId,
          email: currentUser.email,
          internalEmail: currentUser.internalEmail || currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          joinedAt: new Date(),
          lastReadAt: new Date(),
          isActive: true,
        })
      }
    }

    // Add any additional participants
    const participantsSet = new Set([...(participantIds || [])])
    for (const participantId of participantsSet) {
      // Skip if already added (current user)
      if (participantId === userId) continue
      
      const participant = await User.findById(participantId)
      if (participant) {
        participants.push({
          userId: participantId,
          email: participant.email,
          internalEmail: participant.internalEmail || participant.email,
          name: participant.name,
          role: participant.role,
          joinedAt: new Date(),
          lastReadAt: new Date(),
          isActive: true,
        })
      }
    }

    const title = `Zakat Application - ${zakatCase.firstName} ${zakatCase.lastName} (${zakatCase.caseId})`

    conversation = new Conversation({
      caseId: zakatCase._id, // Store MongoDB ObjectId reference
      conversationId,
      participants,
      title,
      description: `Communication thread for ${zakatCase.caseId}`,
      messageCount: 0,
      lastMessageAt: new Date(),
    })

    await conversation.save()

    return NextResponse.json(
      { conversation, isNew: true },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST conversation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
