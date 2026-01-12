import mongoose from "mongoose"

const documentAuditSchema = new mongoose.Schema(
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
    documentId: {
      type: String, // filename or document URL
      required: true,
    },
    action: {
      type: String,
      enum: ["uploaded", "updated", "deleted"],
      required: true,
    },
    actionBy: {
      type: String,
      enum: ["applicant", "caseworker"],
      required: true,
    },
    uploadedBy: {
      // Email or ID of the person who performed the action
      type: String,
      required: true,
    },
    originalFilename: String,
    fileSize: Number,
    mimeType: String,
    notes: String, // Optional notes from caseworker
  },
  { timestamps: true }
)

export default mongoose.models.DocumentAudit || mongoose.model("DocumentAudit", documentAuditSchema)
