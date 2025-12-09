import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema(
  {
    // Case reference (optional for staff conversations)
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: false, // Made optional for staff conversations
      index: true,
      sparse: true, // Allows multiple null values
    },
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Format: "case_[caseObjectId]" or "staff_[objectId]" for staff conversations
    },

    // Participants
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        email: String,
        internalEmail: String,
        name: String,
        role: {
          type: String,
          enum: ["applicant", "caseworker", "approver", "treasurer", "admin"],
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastReadAt: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Conversation metadata
    title: String, // e.g., "Zakat Application - John Smith (CASE-20250114-ABC)"
    description: String,
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: Date,
    lastMessage: String,

    // Settings
    isArchived: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// Index for fast queries
conversationSchema.index({ caseId: 1, createdAt: -1 })
conversationSchema.index({ "participants.userId": 1 })
conversationSchema.index({ isArchived: 1 })

// Delete cached model to force recompilation with updated schema
if (mongoose.models.Conversation) {
  delete mongoose.models.Conversation
}

export default mongoose.model("Conversation", conversationSchema)
