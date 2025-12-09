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

const bcrypt = require("bcryptjs")

async function seedUsers() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB")

    // Clear existing test users
    await User.deleteMany({
      email: {
        $in: [
          "admin@rahmah.internal",
          "caseworker@rahmah.internal",
          "approver@rahmah.internal",
          "treasurer@rahmah.internal",
        ],
      },
    })

    const users = [
      {
        name: "Admin User",
        email: "admin@rahmah.internal",
        password: "admin@12345",
        role: "admin",
      },
      {
        name: "Case Worker",
        email: "caseworker@rahmah.internal",
        password: "caseworker@12345",
        role: "caseworker",
      },
      {
        name: "Approver User",
        email: "approver@rahmah.internal",
        password: "approver@12345",
        role: "approver",
      },
      {
        name: "Treasurer User",
        email: "treasurer@rahmah.internal",
        password: "treasurer@12345",
        role: "treasurer",
      },
    ]

    // Hash passwords
    for (let user of users) {
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(user.password, salt)
    }

    const createdUsers = await User.insertMany(users)

    console.log("✅ Seed users created successfully!\n")
    console.log("📧 LOGIN CREDENTIALS:\n")
    console.log("┌─────────────────────────────────────────────────────┐")
    
    const credentials = [
      {
        role: "ADMIN",
        email: "admin@rahmah.internal",
        password: "admin@12345",
      },
      {
        role: "CASEWORKER",
        email: "caseworker@rahmah.internal",
        password: "caseworker@12345",
      },
      {
        role: "APPROVER",
        email: "approver@rahmah.internal",
        password: "approver@12345",
      },
      {
        role: "TREASURER",
        email: "treasurer@rahmah.internal",
        password: "treasurer@12345",
      },
    ]

    credentials.forEach((cred) => {
      console.log(`│ ${cred.role.padEnd(40)} │`)
      console.log(`│ Email:    ${cred.email.padEnd(35)} │`)
      console.log(`│ Password: ${cred.password.padEnd(35)} │`)
      console.log("├─────────────────────────────────────────────────────┤")
    })
    console.log("└─────────────────────────────────────────────────────┘\n")

    await mongoose.connection.close()
  } catch (error) {
    console.error("❌ Error seeding users:", error)
    process.exit(1)
  }
}

seedUsers()
