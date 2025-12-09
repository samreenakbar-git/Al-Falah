import mongoose from "mongoose"

const blacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
)

// Auto-delete expired tokens
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.BlacklistedToken || mongoose.model("BlacklistedToken", blacklistedTokenSchema)
