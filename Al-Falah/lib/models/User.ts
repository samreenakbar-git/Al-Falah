import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    internalEmail: {
      type: String,
      sparse: true,
      // Format: firstname.lastname@[tenant-slug].internal or firstname.lastname@rahmah.internal
      // Note: unique constraint removed - will be unique per tenant
    },
    internalEmailGenerated: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: false, // Optional for super admin or migration period
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "caseworker", "approver", "treasurer", "applicant", "super_admin"],
      default: "applicant",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Messaging preferences
    messageNotifications: {
      type: Boolean,
      default: true,
    },
    emailOnNewMessage: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

// Hash password before saving and manage internal email
userSchema.pre("save", async function (next) {
  // Generate internalEmail only for staff linked to a tenant (not for applicants or super admins)
  if (this.isNew || this.isModified("name") || this.isModified("tenantId") || this.isModified("role")) {
    if (
      this.tenantId && // must belong to a tenant
      this.role !== "applicant" &&
      this.role !== "super_admin" &&
      !this.internalEmailGenerated
    ) {
      const firstName = this.name.split(" ")[0].toLowerCase()
      const lastName = this.name.split(" ").slice(1).join("").toLowerCase() || "staff"

      const Tenant = mongoose.model("Tenant")
      const tenant = (await Tenant.findById(this.tenantId).lean()) as { slug?: string } | null

      if (tenant && tenant.slug) {
        this.internalEmail = `${firstName}.${lastName}@${tenant.slug}.internal`
        this.internalEmailGenerated = true
      }
    }

    // For users without a tenant (e.g. super admins), ensure no internalEmail is set
    if (!this.tenantId || this.role === "super_admin") {
      this.internalEmail = undefined
      this.internalEmailGenerated = false
    }
  }

  if (!this.isModified("password")) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as any)
  }
})

export default mongoose.models.User || mongoose.model("User", userSchema)
