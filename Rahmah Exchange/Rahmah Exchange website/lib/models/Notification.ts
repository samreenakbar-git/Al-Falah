import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: true,
    },
    type: {
      type: String,
      enum: ["approved", "rejected", "pending"],
      required: true,
    },
    title: String,
    message: String,
    grantedAmount: Number,
    approvalDate: Date,
    read: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true },
)

if (process.env.NODE_ENV === "development" && mongoose.models.Notification) {
  delete mongoose.models.Notification
  delete (mongoose as any).modelSchemas.Notification
}

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema)
