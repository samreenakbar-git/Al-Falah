import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"
import { authenticateRequest } from "@/lib/auth-middleware"
import Message from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { sendEmail } from "@/lib/email"
import { uploadBuffer } from "@/lib/storage"

// POST - Send a message (staff only: admin, caseworker, approver, treasurer)
export async function POST(request: NextRequest) {
  try {
    console.log("🟢 Admin POST message endpoint called")

    // -------------------------------
    // 1. Authenticate user and check role
    // -------------------------------
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      console.warn("⚠️ Unauthorized attempt", { error, hasUser: !!user })
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })
    }

    console.log("🔹 User authenticated:", { userId: user._id, email: user.email, role: user.role })

    // Check by email if role is not set properly
    const userEmail = (user.email || "").toLowerCase()
    const userInternalEmail = (user.internalEmail || "").toLowerCase()
    
    // Allowed staff emails
    const allowedStaffEmails = [
      "staff@gmail.com",
      "caseworker@rahmah.internal",
      "approver@rahmah.internal",
      "treasurer@rahmah.internal",
      "admin@rahmah.internal"
    ]
    
    // Check by role first, then fallback to email check
    const allowedRoles = ["admin", "caseworker", "approver", "treasurer"]
    const userRole = user.role || ""
    const isStaffByRole = allowedRoles.includes(userRole)
    const isStaffByEmail = allowedStaffEmails.includes(userEmail) || allowedStaffEmails.includes(userInternalEmail)
    const isStaff = isStaffByRole || isStaffByEmail
    
    if (!isStaff) {
      console.warn("⚠️ Non-staff user attempted to send message", { 
        userRole, 
        userEmail,
        userInternalEmail,
        allowedRoles,
        allowedStaffEmails,
        userId: user._id
      })
      return NextResponse.json({ 
        message: `Unauthorized: only staff can send messages. Your role: ${userRole || "none"}, Email: ${userEmail}` 
      }, { status: 403 })
    }

    const senderEmail = user.internalEmail || user.email
    const senderName = user.name || "Staff"
    
    // Determine senderRole based on email or role
    let senderRole = "caseworker" // default
    const userEmailLower = (user.email || "").toLowerCase()
    const userInternalEmailLower = (user.internalEmail || "").toLowerCase()
    
    if (user.role && ["admin", "caseworker", "approver", "treasurer"].includes(user.role)) {
      senderRole = user.role === "admin" ? "caseworker" : user.role
    } else if (userEmailLower.includes("treasurer") || userInternalEmailLower.includes("treasurer")) {
      senderRole = "treasurer"
    } else if (userEmailLower.includes("approver") || userInternalEmailLower.includes("approver")) {
      senderRole = "approver"
    } else if (userEmailLower.includes("caseworker") || userInternalEmailLower.includes("caseworker")) {
      senderRole = "caseworker"
    } else if (userEmailLower.includes("admin") || userInternalEmailLower.includes("admin") || userEmailLower === "staff@gmail.com") {
      senderRole = "caseworker"
    }
    
    console.log("🔹 Staff user detected:", senderEmail, "Role:", user.role, "SenderRole:", senderRole)

    const formData = await request.formData()
    const conversationId = formData.get("conversationId")?.toString()
    const body = formData.get("body")?.toString()
    const messageType = formData.get("messageType")?.toString() || "text"
    const recipientIds = (formData.getAll("recipientIds") as string[]).filter(Boolean)

    console.log("🔹 Form data parsed", { conversationId, bodyPreview: body?.slice(0, 50), messageType, recipientIds })

    if (!conversationId || !body) {
      console.warn("⚠️ Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: conversationId and body are required" },
        { status: 400 }
      )
    }

    await dbConnect()
    console.log("✅ Database connected")

    // -------------------------------
    // 2. Fetch conversation
    // -------------------------------
    const conversation = await Conversation.findOne({ conversationId })
    console.log("🔹 Conversation fetched:", conversation?._id?.toString())

    if (!conversation) {
      console.error("❌ Conversation not found", { conversationId })
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // -------------------------------
    // 3. Handle attachments
    // -------------------------------
    const uploadedFiles = formData.getAll("attachments") as any[]
    const attachments: any[] = []

    for (const f of uploadedFiles) {
      if (f && typeof f.arrayBuffer === "function") {
        const originalName = f.name || `upload-${Date.now()}`
        const buffer = Buffer.from(await f.arrayBuffer())

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
          console.log("📎 File uploaded:", originalName)
        } catch (err) {
          console.error("❌ File upload error:", err)
        }
      }
    }

    // -------------------------------
    // 4. Prepare message data
    // -------------------------------
    const messageData: any = {
      conversationId,
      senderEmail: senderEmail,
      senderName: senderName,
      senderId: user._id,
      body,
      messageType,
      attachments,
      readBy: [{ userId: user._id, readAt: new Date() }],
      caseId: conversation.caseId,
      senderRole: senderRole,
    }

    console.log("🔹 Message data prepared", { attachmentsCount: attachments.length })

    // Attach recipientIds if provided
    if (recipientIds.length > 0) {
      const validRecipientObjectIds: any[] = []
      for (const rid of recipientIds) {
        if (rid && mongoose.Types.ObjectId.isValid(rid)) {
          validRecipientObjectIds.push(new mongoose.Types.ObjectId(rid))
        }
      }
      if (validRecipientObjectIds.length > 0) {
        messageData.recipientIds = validRecipientObjectIds
        console.log("🔹 Valid recipient IDs:", validRecipientObjectIds)
        try {
          const recipientUsers = await User.find({ _id: { $in: validRecipientObjectIds } })
          messageData.recipientEmails = recipientUsers.map(r => r.internalEmail).filter(Boolean)
          console.log("🔹 Recipient emails populated:", messageData.recipientEmails)
        } catch (e) {
          console.error("❌ Could not populate recipient emails", e)
        }
      }
    }

    // -------------------------------
    // 5. Save message
    // -------------------------------
    const message = new Message(messageData)
    await message.save()
    console.log("✅ Admin message saved:", message._id?.toString())

    // -------------------------------
    // 6. Update conversation
    // -------------------------------
    await Conversation.updateOne(
      { conversationId },
      {
        messageCount: (conversation.messageCount || 0) + 1,
        lastMessageAt: new Date(),
        lastMessage: body.substring(0, 100),
      }
    )
    console.log("✅ Conversation updated with new message")

    // -------------------------------
    // 7. Send notifications to recipients
    // -------------------------------
    if (Array.isArray(messageData.recipientEmails) && messageData.recipientEmails.length > 0) {
      for (const email of messageData.recipientEmails) {
        try {
          await sendEmail({
            to: email,
            subject: `New message from ${senderName} - ${conversation.title || ""}`,
            html: `<p>${senderName} sent you a new message:</p><p>${body}</p>`,
          })
          console.log("✉️ Email sent to:", email)
        } catch (err) {
          console.error(`❌ Failed to send email to ${email}`, err)
        }
      }
    }

    console.log("🟢 Admin POST message completed successfully")
    return NextResponse.json({ message: "Admin message sent successfully", data: message }, { status: 201 })
  } catch (error: any) {
    console.error("❌ POST admin message error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
