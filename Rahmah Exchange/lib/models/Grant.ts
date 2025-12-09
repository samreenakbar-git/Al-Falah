import mongoose from "mongoose"

const grantSchema = new mongoose.Schema(
  {
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: true,
    },
    // Primary field - conditionally required
    // Required only if numberOfMonths is not provided (for approvers setting amount)
    // Caseworkers can create grants with only numberOfMonths
    grantedAmount: {
      type: Number,
      required: false, // Made optional - will be validated in pre-save middleware
      min: [0, "grantedAmount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    remarks: {
      type: String,
      required: false,
    },
    numberOfMonths: {
      type: Number,
      required: false,
      min: [1, "Number of months must be at least 1"],
    },
    // Payment documents (checks, digital payment receipts, etc.)
    paymentDocuments: [{
      filename: String,
      originalname: String,
      url: String,
      mimeType: String,
      size: Number,
      uploadedAt: Date,
      uploadedBy: String, // User ID who uploaded
    }],
    // Legacy fields - explicitly optional, never required
    // These are for backward compatibility with existing data only
    amountGranted: {
      type: Number,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
  },
  { 
    timestamps: true,
    // Allow fields not in schema for maximum flexibility
    strict: false,
  },
)

// Virtual to get the amount (prefer grantedAmount, fallback to amountGranted)
grantSchema.virtual("amount").get(function () {
  return this.grantedAmount ?? this.amountGranted
})

// Pre-save middleware to migrate old field names to new ones
grantSchema.pre("save", function (next) {
  // For new documents, ensure amountGranted is NOT set (we only use grantedAmount)
  if (this.isNew) {
    // Explicitly unset amountGranted for new documents to avoid validation errors
    if (this.amountGranted !== undefined) {
      delete this.amountGranted
    }
    // For new grants: either grantedAmount OR numberOfMonths must be provided
    // This allows caseworkers to create grants with only numberOfMonths
    const hasGrantedAmount = this.grantedAmount !== undefined && this.grantedAmount !== null
    const hasNumberOfMonths = this.numberOfMonths !== undefined && this.numberOfMonths !== null
    
    if (!hasGrantedAmount && !hasNumberOfMonths) {
      return next(new Error("Either grantedAmount or numberOfMonths is required for new grants"))
    }
    
    // If grantedAmount is not provided, set it to 0 to satisfy any other validation
    // (but this should not be required if numberOfMonths is provided)
    if (!hasGrantedAmount && hasNumberOfMonths) {
      // Allow grants with only numberOfMonths (for caseworkers)
      // Don't set grantedAmount to 0, let it be undefined
    }
  } else {
    // For existing documents being updated, migrate amountGranted to grantedAmount if needed
    if (this.amountGranted !== undefined && this.amountGranted !== null) {
      if (this.grantedAmount === undefined || this.grantedAmount === null) {
        this.grantedAmount = this.amountGranted
      }
    }
  }
  // Migrate notes to remarks if needed
  if (this.notes && !this.remarks) {
    this.remarks = this.notes
  }
  next()
})

// Ensure virtuals are included in JSON output
grantSchema.set("toJSON", { virtuals: true })
grantSchema.set("toObject", { virtuals: true })

// Force model recreation to avoid schema cache issues
// Delete the existing model if it exists to ensure fresh schema
if (mongoose.models.Grant) {
  delete mongoose.models.Grant
  if ((mongoose as any).modelSchemas?.Grant) {
    delete (mongoose as any).modelSchemas.Grant
  }
}

// Use the standard Next.js pattern for Mongoose models
export default mongoose.model("Grant", grantSchema)
