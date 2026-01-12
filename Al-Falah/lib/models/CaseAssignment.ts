import mongoose from "mongoose"

const caseAssignmentSchema = new mongoose.Schema(
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
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Must be a caseworker
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "active", "completed", "reassigned"],
      default: "pending",
    },
    // Notification tracking
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: Date,
    acceptedAt: Date,
    completedAt: Date,
    // Notes on assignment
    assignmentNotes: String,
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
  },
  { timestamps: true }
)

// Indexes
caseAssignmentSchema.index({ applicantId: 1, status: 1 })
caseAssignmentSchema.index({ assignedTo: 1, status: 1 })
caseAssignmentSchema.index({ caseId: 1 })

export default mongoose.models.CaseAssignment || mongoose.model("CaseAssignment", caseAssignmentSchema)
