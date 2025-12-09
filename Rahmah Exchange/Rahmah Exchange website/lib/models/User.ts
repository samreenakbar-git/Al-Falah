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
      unique: true,
      sparse: true,
      // Format: firstname.lastname@rahmah.internal
    },
    internalEmailGenerated: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["admin", "caseworker", "approver", "treasurer", "applicant"],
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    if (this.role !== "applicant" && !this.internalEmailGenerated) {
      const firstName = this.name.split(" ")[0].toLowerCase()
      const lastName = this.name.split(" ").slice(1).join("").toLowerCase() || "staff"
      this.internalEmail = `${firstName}.${lastName}@rahmah.internal`
      this.internalEmailGenerated = true
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
