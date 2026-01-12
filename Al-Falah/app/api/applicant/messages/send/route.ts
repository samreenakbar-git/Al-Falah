import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import Message from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import User from "@/lib/models/User"
import { sendEmail } from "@/lib/email"
import { uploadBuffer } from "@/lib/storage"
import { escapeHtml, nl2br } from "@/lib/utils/html-sanitize"

// POST - Send a message as applicant
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

    const formData = await request.formData()
    const conversationId = formData.get("conversationId")?.toString()
    const body = formData.get("body")?.toString() || ""
    const messageType = formData.get("messageType")?.toString() || "text"
    
    // Extract and validate recipientIds - filter out empty/null values
    const recipientIds = (formData.getAll("recipientIds") as string[]).filter(Boolean)

    // Check for attachments
    const uploadedFiles = formData.getAll("attachments") as any[]
    const hasAttachments = uploadedFiles.some(f => f && typeof f === "object" && typeof f.arrayBuffer === "function")

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required field: conversationId is required" },
        { status: 400 }
      )
    }

    // Require either body text or attachments
    if (!body.trim() && !hasAttachments) {
      return NextResponse.json(
        { error: "Message must contain either text or attachments" },
        { status: 400 }
      )
    }

    if (recipientIds.length === 0) {
      console.warn("No recipientIds provided in message send", {
        applicantId,
        conversationId,
      })
    }

    // Diagnostic logging to help debug 500 errors
    try {
      const uploadedFilesPreview = (formData.getAll("attachments") || []).map((f: any) => ({ name: f?.name, size: f?.size }))
      console.log("POST applicant message start", {
        applicantId,
        conversationId,
        bodyPreview: body?.slice(0, 200),
        messageType,
        attachments: uploadedFilesPreview,
      })
    } catch (e) {
      console.warn("Could not log form preview", e)
    }

    await dbConnect()

    // 🔧 FORCE DROP BAD INDEXES - TEMPORARY FIX
    const db = mongoose.connection.db
    if (db) {
      const collection = db.collection("messages")
      try {
        await collection.dropIndexes()
        console.log("✅✅✅ ALL INDEXES DROPPED ✅✅✅")
      } catch (e: any) {
        console.log("⚠️ Drop index result:", e.message)
      }
    }
    // 🔧 END FIX

    // Get applicant details first (needed for tenantId)
    const applicant = await ZakatApplicant.findById(applicantId)
    if (!applicant) {
      return NextResponse.json(
        { error: "Applicant not found" },
        { status: 404 }
      )
    }

    // Get conversation, scoped to this applicant's tenant
    const conversation = await Conversation.findOne({
      tenantId: applicant.tenantId,
      conversationId,
    })
    if (!conversation) {
      console.error("Conversation not found", { conversationId, applicantId })
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // 🔧 AUTO-ADD ADMINS TO CONVERSATION IF MISSING
    try {
const adminUsers = await User.find({ name: "Admin" })
      let conversationUpdated = false
      
      console.log(`🔍 Checking conversation participants. Found ${adminUsers.length} admin users in database`)
      console.log(`Current participants: ${conversation.participants.length}`)
      
      for (const admin of adminUsers) {
        const alreadyParticipant = conversation.participants.some(
          (p: any) => p.userId?.toString() === admin._id.toString()
        )
        
        if (!alreadyParticipant) {
          conversation.participants.push({
            userId: admin._id,
            email: admin.email,
            internalEmail: admin.internalEmail || admin.email,
            name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
            role: admin.role,
            joinedAt: new Date(),
            lastReadAt: new Date(0),
            isActive: true,
          })
          conversationUpdated = true
          console.log(`✅ Added admin ${admin.email} (ID: ${admin._id}) to conversation`)
        }
      }
      
      if (conversationUpdated) {
        await conversation.save()
        console.log(`✅✅✅ CONVERSATION UPDATED! Total participants now: ${conversation.participants.length}`)
      } else {
        console.log(`ℹ️ All ${adminUsers.length} admins already in conversation`)
      }
    } catch (err) {
      console.error("❌ Failed to add admins to conversation:", err)
    }
    // 🔧 END AUTO-ADD ADMINS

    // Verify applicant is participant
    const isParticipant = conversation.participants.some((p: any) => {
      try {
        const pUserId = p.userId ? p.userId.toString() : null
        return pUserId === applicantId
      } catch (e) {
        return p.userId === applicantId
      }
    })
    if (!isParticipant) {
      console.error("Access denied for applicant messaging SEND", {
        applicantId,
        conversationId,
        participants: conversation.participants.map((p: any) => (p.userId ? (p.userId.toString ? p.userId.toString() : p.userId) : p)),
      })
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Handle file attachments (already checked above, but process here)
    const attachments: any[] = []

    for (const f of uploadedFiles) {
      if (f && typeof f === "object" && typeof f.arrayBuffer === "function") {
        const originalName = (f as any).name || `upload-${Date.now()}`
        const buffer = Buffer.from(await (f as any).arrayBuffer())

        try {
          const blob = await uploadBuffer(buffer, originalName, new URL(request.url).origin)

          attachments.push({
            filename: blob.pathname,
            originalname: originalName,
            mimeType: f.type || "application/octet-stream",
            size: buffer.length,
            url: blob.url,
            uploadedAt: new Date(),
          })
        } catch (err) {
          console.error("File upload error:", err)
        }
      }
    }

    // Ensure sender email is present to satisfy schema requirements
    const senderEmail = applicant.email || `applicant-${applicantId}@no-reply.local`
    const senderName = `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Applicant"

    // Create message with proper ObjectId references
    // Use a default message if body is empty but attachments exist
    const messageBody = body.trim() || (attachments.length > 0 ? "📎 Shared file(s)" : "")
    
    const messageData: any = {
      tenantId: applicant.tenantId,
      caseId: applicant._id,
      body: messageBody,
      conversationId,
      applicantId: applicant._id,
      senderEmail,
      senderId: null,
      senderRole: "applicant",
      senderName,
      messageType,
      attachments,
      readBy: [
        {
          userId: applicant._id,
          readAt: new Date(),
        },
      ],
    }

    // If recipientIds were provided from the frontend, convert to ObjectIds and attach
    // If no recipientIds provided, automatically send to all staff in the conversation
    let validRecipientObjectIds: any[] = []
    
    if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      for (const rid of recipientIds) {
        try {
          if (rid && typeof rid === "string" && mongoose.Types.ObjectId.isValid(rid)) {
            validRecipientObjectIds.push(new mongoose.Types.ObjectId(rid))
          } else if (rid && typeof rid === "string") {
            console.warn("Invalid ObjectId format received:", rid)
          }
        } catch (e) {
          console.warn("Error converting recipientId:", e, "id:", rid)
        }
      }
    }
    
    // If no recipientIds provided, get all staff from conversation participants
    if (validRecipientObjectIds.length === 0) {
      const staffParticipants = conversation.participants.filter(
        (p: any) => p.role && p.role !== "applicant" && p.userId
      )
      for (const staff of staffParticipants) {
        try {
          if (staff.userId && mongoose.Types.ObjectId.isValid(staff.userId)) {
            validRecipientObjectIds.push(new mongoose.Types.ObjectId(staff.userId))
          }
        } catch (e) {
          console.warn("Error converting staff userId:", e, "id:", staff.userId)
        }
      }
      console.log(`📧 Auto-selected ${validRecipientObjectIds.length} staff members from conversation`)
    }
    
    if (validRecipientObjectIds.length > 0) {
      messageData.recipientIds = validRecipientObjectIds
      // Populate recipientEmails if users exist
      try {
        const recipientUsers = await User.find({ _id: { $in: validRecipientObjectIds } })
        messageData.recipientEmails = recipientUsers.map((r) => r.internalEmail).filter(Boolean)
      } catch (e) {
        console.warn("Could not populate recipient emails", e)
      }
    }

    const message = new Message(messageData)

    try {
      await message.save()
      console.log("Applicant message saved", { messageId: message._id?.toString(), conversationId })
    } catch (saveError: any) {
      console.error("Failed to save message", saveError?.message)
      const isDev = process.env.NODE_ENV !== "production"
      return NextResponse.json(
        { error: "Failed to save message", details: isDev ? saveError : undefined },
        { status: 500 }
      )
    }

    // Update conversation
    try {
      const lastMessageText = messageBody.length > 0 
        ? messageBody.substring(0, 100)
        : attachments.length > 0 
          ? `📎 Shared ${attachments.length} file(s)`
          : "New message"
      
      await Conversation.updateOne(
        { conversationId },
        {
          messageCount: (conversation.messageCount || 0) + 1,
          lastMessageAt: new Date(),
          lastMessage: lastMessageText,
        }
      )
    } catch (updateError: any) {
      console.error("Failed to update conversation", updateError, updateError?.stack)
    }

    // Send email notifications ONLY to caseworker and admin participants (NOT to applicant)
    const staffParticipants = conversation.participants.filter(
      (p: any) => p.role !== "applicant" && (p.role === "caseworker" || p.role === "admin")
    )

    // Also exclude applicant email if somehow included
    const applicantEmail = applicant?.email?.toLowerCase()

    if (Array.isArray(staffParticipants) && staffParticipants.length > 0) {
      for (const participant of staffParticipants) {
        // Skip if this is the applicant's email
        if (participant.email && participant.email.toLowerCase() !== applicantEmail) {
          // Double-check role is caseworker or admin
          if (participant.role === "caseworker" || participant.role === "admin") {
            const emailBody = messageBody || (attachments.length > 0 ? `Shared ${attachments.length} file(s)` : "New message")
            const notificationHtml = generateMessageEmailTemplate(
              applicant?.firstName || "Applicant",
              conversation.title || "Your case",
              emailBody,
              message._id.toString()
            )

            await sendEmail({
              to: participant.email,
              subject: `New message from ${applicant?.firstName || "Applicant"} - ${conversation.title}`,
              html: notificationHtml,
            }).catch((err) => {
              console.error(`Failed to send email to ${participant.email}:`, err)
            })
          }
        }
      }
    }

    return NextResponse.json(
      { message: "Message sent successfully", data: message },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST applicant message error:", error?.message || error, {
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
    })
    return NextResponse.json(
      { 
        error: error?.message || "Internal Server Error",
        code: error?.code,
      }, 
      { status: 500 }
    )
  }
}

function generateMessageEmailTemplate(
  senderName: string,
  caseInfo: string,
  messageBody: string,
  messageId: string
): string {
  // Sanitize all user input
  const safeSenderName = escapeHtml(senderName)
  const safeCaseInfo = escapeHtml(caseInfo)
  const safeMessageBody = nl2br(messageBody)
  const safeMessageId = escapeHtml(messageId)
  const safeBaseUrl = escapeHtml(process.env.NEXT_PUBLIC_API_URL || "https://rahmah.local")
  
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
          .button { display: inline-block; background: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Message from Applicant</h2>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${safeSenderName}</strong> sent you a message regarding <strong>${safeCaseInfo}</strong>.</p>
            
            <div class="message-box">
              <p>${safeMessageBody}</p>
            </div>

            <p>
              <a href="${safeBaseUrl}/messages?id=${safeMessageId}" class="button">
                View in Messages
              </a>
            </p>

            <p>You can reply to this message directly in your messages portal.</p>
            
            <div class="footer">
              <p>© 2025 Rahmah Exchange. This is an automated message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>`
}
