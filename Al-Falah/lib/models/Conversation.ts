import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: false, // Made optional for staff conversations (super_admin doesn't have tenantId)
      index: true,
    },
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
      index: true,
      // Format: "case_[caseObjectId]" or "staff_[objectId]" for staff conversations
      // Removed unique - will be unique per tenant
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
          enum: ["applicant", "caseworker", "approver", "treasurer", "admin", "super_admin"],
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
conversationSchema.index({ tenantId: 1, caseId: 1, createdAt: -1 })
conversationSchema.index({ tenantId: 1, "participants.userId": 1 })
conversationSchema.index({ tenantId: 1, isArchived: 1 })
// Compound unique index for conversationId per tenant (sparse to allow null tenantId)
conversationSchema.index({ tenantId: 1, conversationId: 1 }, { unique: true, sparse: true })

// Delete cached model to force recompilation with updated schema
if (mongoose.models.Conversation) {
  delete mongoose.models.Conversation
}

export default mongoose.model("Conversation", conversationSchema)
