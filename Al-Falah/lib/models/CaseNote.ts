import mongoose from "mongoose"

const caseNoteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: true,
      index: true,
    },
    caseId: {
      type: String,
      required: true,
      // Index defined below as compound index with createdAt
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["caseworker", "approver", "admin", "treasurer"],
      required: true,
    },
    authorEmail: {
      type: String,
      required: true,
    },
    authorName: String,
    // Note content
    title: String,
    content: {
      type: String,
      required: true,
    },
    noteType: {
      type: String,
      enum: ["internal_note", "status_update", "requirement", "decision", "approval_note"],
      default: "internal_note",
    },
    // Approval-specific fields
    approvalAmount: {
      type: Number,
      required: false,
    },
    // Visibility
    isInternal: {
      type: Boolean,
      default: true,
      // false means visible to applicant
    },
    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // Resolution
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
)

// Indexes for efficient queries
caseNoteSchema.index({ applicantId: 1, createdAt: -1 })
caseNoteSchema.index({ caseId: 1, createdAt: -1 })
caseNoteSchema.index({ authorId: 1, createdAt: -1 })
caseNoteSchema.index({ noteType: 1, isInternal: 1 })

export default mongoose.models.CaseNote || mongoose.model("CaseNote", caseNoteSchema)
