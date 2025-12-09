import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    // Conversation context
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: false, // Made optional for staff conversations
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
      // Format: "case_[caseObjectId]"
    },

    // Sender and recipients
   senderId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
    required: false, // <-- change this
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
    },
    senderEmail: {
      type: String,
      required: true,
      // Internal email like: john.doe@rahmah.internal
    },
    senderRole: {
      type: String,
      enum: ["applicant", "caseworker", "approver", "treasurer", "admin"],
      required: true,
    },
    senderName: String,

    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    recipientEmails: [String], // All recipients' internal emails

    // Message content
    subject: String,
    body: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "note", "status_update"],
      default: "text",
    },

    // Attachments
    attachments: [
      {
        filename: String,
        originalname: String,
        mimeType: String,
        size: Number,
        url: String, // Vercel Blob URL
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Message status
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        readAt: Date,
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,

    // Metadata
    threadId: mongoose.Schema.Types.ObjectId, // For message replies
    parentMessageId: mongoose.Schema.Types.ObjectId, // For replies
    replyCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// Indexes for quick queries
messageSchema.index({ caseId: 1, createdAt: -1 })
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1, createdAt: -1 })
messageSchema.index({ applicantId: 1, createdAt: -1 })
// Separate indexes for arrays - MongoDB doesn't support compound indexes on parallel arrays
messageSchema.index({ recipientIds: 1 })
messageSchema.index({ "readBy.userId": 1 })
messageSchema.index({ isDeleted: 1 })

// Force model recreation to clear any cached schema with old indexes
if (mongoose.models.Message) {
  delete mongoose.models.Message
}

// Create model
const MessageModel = mongoose.model("Message", messageSchema)

// Auto-fix indexes on model initialization (only in server environment)
if (typeof window === "undefined") {
  // This runs only on the server
  ;(async () => {
    try {
      const indexes = mongoose.connection.db?.collection("messages").listIndexes()
      if (indexes) {
        const indexArray = await indexes.toArray()
        const problematicIndexes = indexArray.filter(
          (idx: any) =>
            idx.name === "recipientIds_1_readBy_1" ||
            idx.name === "readBy_1_recipientIds_1" ||
            (idx.key && idx.key.recipientIds && idx.key.readBy)
        )

        for (const idx of problematicIndexes) {
          try {
            await mongoose.connection.db?.collection("messages").dropIndex(idx.name)
            console.log(`[Message Model] Dropped problematic index: ${idx.name}`)
          } catch (err: any) {
            if (err.code !== 27) {
              // 27 = index not found (already dropped)
              console.warn(`[Message Model] Could not drop index ${idx.name}:`, err.message)
            }
          }
        }
      }
    } catch (err) {
      // Ignore errors during auto-fix (might not be connected yet)
      console.warn("[Message Model] Could not auto-fix indexes:", err)
    }
  })()
}

export default MessageModel
