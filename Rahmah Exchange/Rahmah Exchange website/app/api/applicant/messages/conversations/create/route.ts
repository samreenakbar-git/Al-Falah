import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import Conversation from "@/lib/models/Conversation"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import User from "@/lib/models/User"

// POST - Create or get conversation for applicant
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { conversationId, title } = body

    if (!applicantId) {
      return NextResponse.json({ error: "Invalid applicant token" }, { status: 401 })
    }

    await dbConnect()

    // Get the applicant
    const applicant = await ZakatApplicant.findById(applicantId)
    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 })
    }

    // Use provided conversationId or generate one
    const convId = conversationId || `applicant-${applicantId}`

    // Check if conversation already exists - try both conversationId and caseId
    let conversation = await Conversation.findOne({ 
      $or: [
        { conversationId: convId },
        { caseId: applicant._id }
      ]
    })

    if (conversation) {
      // Update conversationId if it doesn't match
      if (conversation.conversationId !== convId) {
        conversation.conversationId = convId
        await conversation.save()
      }
      // 🔧 FIX: Add admins if they're missing from existing conversation
      try {
        const adminUsers = await User.find({ role: { $in: ["admin", "caseworker", "approver", "treasurer"] } })
        let conversationUpdated = false
        
        console.log(`Found ${adminUsers.length} admin users to potentially add`)
        
        for (const admin of adminUsers) {
          const alreadyParticipant = conversation.participants.some(
            (p: any) => p.userId?.toString() === admin._id.toString()
          )
          
          if (!alreadyParticipant) {
            // Map role to valid enum value
            let validRole = admin.role
            if (!["applicant", "caseworker", "approver", "treasurer", "admin"].includes(admin.role)) {
              // Default to caseworker if role is invalid
              validRole = "caseworker"
              console.warn(`Invalid role ${admin.role} for user ${admin.email}, defaulting to caseworker`)
            }
            
            conversation.participants.push({
              userId: admin._id,
              email: admin.email,
              internalEmail: admin.internalEmail || admin.email,
              name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
              role: validRole,
              joinedAt: new Date(),
              lastReadAt: new Date(0),
              isActive: true,
            })
            conversationUpdated = true
            console.log(`✅ Added admin ${admin.email} to conversation ${convId}`)
          }
        }
        
        if (conversationUpdated) {
          await conversation.save()
          console.log(`✅ Conversation updated with admin participants. Total participants: ${conversation.participants.length}`)
        } else {
          console.log(`ℹ️ All admins already in conversation`)
        }
      } catch (err) {
        console.error("Failed to add admins to existing conversation:", err)
      }
      // 🔧 END FIX
      
      return NextResponse.json(
        { conversation, conversationId: convId, isNew: false },
        { status: 200 }
      )
    }

    // Create new conversation
    // Get admin/staff users to add as participants (including treasurer)
    const adminUsers = await User.find({ role: { $in: ["admin", "caseworker", "approver", "treasurer"] } })
    
    console.log(`Creating new conversation with ${adminUsers.length} admin users`)
    
    const participants = [
      {
        userId: applicant._id,
        email: applicant.email,
        internalEmail: applicant.email,
        name: `${applicant.firstName} ${applicant.lastName}`,
        role: "applicant",
        joinedAt: new Date(),
        lastReadAt: new Date(),
        isActive: true,
      },
    ]

    // Add admin/staff users as participants
    for (const admin of adminUsers) {
      // Map role to valid enum value
      let validRole = admin.role
      if (!["applicant", "caseworker", "approver", "treasurer", "admin"].includes(admin.role)) {
        // Default to caseworker if role is invalid
        validRole = "caseworker"
        console.warn(`Invalid role ${admin.role} for user ${admin.email}, defaulting to caseworker`)
      }
      
      participants.push({
        userId: admin._id,
        email: admin.email,
        internalEmail: admin.internalEmail || admin.email,
        name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
        role: validRole,
        joinedAt: new Date(),
        lastReadAt: new Date(),
        isActive: true,
      })
    }

    const conversationTitle =
      title || `Zakat Application - ${applicant.firstName} ${applicant.lastName} (${applicant.caseId})`

    conversation = new Conversation({
      caseId: applicant._id,
      conversationId: convId,
      participants,
      title: conversationTitle,
      description: `Communication thread for applicant ${applicant.caseId}`,
      messageCount: 0,
      lastMessageAt: new Date(),
    })

    try {
      await conversation.save()
      console.log(`✅ Created new conversation with ${participants.length} participants`)
    } catch (saveErr: any) {
      // Handle duplicate key error for unique fields
      if (saveErr?.code === 11000) {
        // E11000 = MongoDB duplicate key error
        const field = Object.keys(saveErr?.keyPattern || {})[0]
        console.warn(`Conversation already exists for ${field}:`, { field, applicantId: applicant._id, convId, error: saveErr.message })
        
        // Try to find and return existing conversation
        const existingConv = await Conversation.findOne({ 
          $or: [
            { caseId: applicant._id },
            { conversationId: convId }
          ]
        })
        
        if (existingConv) {
          // Update conversationId if needed
          if (existingConv.conversationId !== convId) {
            try {
              existingConv.conversationId = convId
              await existingConv.save()
            } catch (updateErr: any) {
              // If update fails due to duplicate, just return the existing one
              console.warn("Could not update conversationId, returning existing:", updateErr.message)
            }
          }
          return NextResponse.json(
            { conversation: existingConv, conversationId: existingConv.conversationId, isNew: false },
            { status: 200 }
          )
        }
      }
      // Re-throw if not a duplicate key error
      console.error("Error saving conversation:", saveErr)
      throw saveErr
    }

    return NextResponse.json(
      { conversation, conversationId: convId, isNew: true },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST applicant conversation error:", {
      message: error?.message,
      code: error?.code,
      keyPattern: error?.keyPattern,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    })
    
    // Return detailed error in development
    const isDev = process.env.NODE_ENV !== "production"
    let errorMessage = error?.message || "Failed to create conversation"
    
    // Provide more user-friendly error messages
    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || {})[0]
      errorMessage = `A conversation already exists for this application. Please refresh the page.`
    } else if (error?.name === "ValidationError") {
      errorMessage = `Validation error: ${error.message}`
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: isDev ? error?.code : undefined,
        details: isDev ? {
          keyPattern: error?.keyPattern,
          name: error?.name,
        } : undefined,
      }, 
      { status: 500 }
    )
  }
}
