import mongoose from "mongoose"

const paymentRecordSchema = new mongoose.Schema(
  {
    grantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grant",
      required: true,
      // Index defined below
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["check", "transfer", "cash", "other"],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    checkNumber: String,
    paymentDate: {
      type: Date,
      required: true,
    },
    proofOfPayment: {
      filename: String,
      originalname: String,
      url: String,
      uploadedAt: Date,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: String,
  },
  { timestamps: true }
)

// Indexes
paymentRecordSchema.index({ applicantId: 1, status: 1 })
paymentRecordSchema.index({ grantId: 1 })

export default mongoose.models.PaymentRecord || mongoose.model("PaymentRecord", paymentRecordSchema)
