require("dotenv").config()
const mongoose = require("mongoose")

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error("Please define the MONGODB_URI environment variable")
  process.exit(1)
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    internalEmail: { type: String, unique: true, sparse: true },
    internalEmailGenerated: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "caseworker", "approver", "treasurer", "applicant"], default: "applicant" },
    isActive: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    emailOnNewMessage: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const User = mongoose.models.User || mongoose.model("User", userSchema)

async function fixAdminRole() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB")

    // Find user with staff@gmail.com
    const user = await User.findOne({ email: "staff@gmail.com" })
    
    if (!user) {
      console.log("❌ User with email 'staff@gmail.com' not found")
      await mongoose.connection.close()
      process.exit(1)
    }

    console.log("Found user:", {
      _id: user._id,
      name: user.name,
      email: user.email,
      currentRole: user.role || "undefined",
    })

    // Update role to admin
    user.role = "admin"
    await user.save()

    console.log("✅ Successfully updated user role to 'admin'")
    console.log("Updated user:", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    })

    await mongoose.connection.close()
    console.log("✅ Database connection closed")
  } catch (error) {
    console.error("❌ Error fixing admin role:", error)
    process.exit(1)
  }
}

fixAdminRole()

