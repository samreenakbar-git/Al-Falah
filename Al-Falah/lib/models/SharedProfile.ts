import mongoose from "mongoose"

const sharedProfileSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZakatApplicant",
      required: true,
      index: true,
    },
    fromTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      // The mosque that is sharing the profile
    },
    toTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      // The mosque receiving the shared profile
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Admin who shared the profile
    },
    note: {
      type: String,
      required: false,
      // Optional note from the sharing mosque
    },
    permissions: {
      type: String,
      enum: ["read_only", "read_write"], // Currently only read_only supported
      default: "read_only",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Track when profile was viewed by receiving tenant
    viewedAt: Date,
    viewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

// Indexes
sharedProfileSchema.index({ profileId: 1, toTenant: 1 })
sharedProfileSchema.index({ fromTenant: 1, toTenant: 1 })
sharedProfileSchema.index({ toTenant: 1, isActive: 1 })

export default mongoose.models.SharedProfile || mongoose.model("SharedProfile", sharedProfileSchema)

