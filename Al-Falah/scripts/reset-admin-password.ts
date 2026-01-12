/**
 * Script to reset an admin user's password
 *
 * Run with: npx tsx scripts/reset-admin-password.ts <email> <new-password>
 * Example: npx tsx scripts/reset-admin-password.ts admin@masjid.com MyNewPassword123
 */

// Load environment variables FIRST
import dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not defined")
  process.exit(1)
}

import mongoose from "mongoose"
import User from "../lib/models/User"
import bcrypt from "bcryptjs"

async function resetPassword() {
  try {
    const email = process.argv[2]
    const newPassword = process.argv[3]

    if (!email || !newPassword) {
      console.error("❌ Usage: npx tsx scripts/reset-admin-password.ts <email> <new-password>")
      console.error("   Example: npx tsx scripts/reset-admin-password.ts admin@masjid.com MyPassword123")
      process.exit(1)
    }

    if (newPassword.length < 6) {
      console.error("❌ Password must be at least 6 characters")
      process.exit(1)
    }

    console.log("🔌 Connecting to database...")
    await mongoose.connect(MONGODB_URI as string)
    console.log("✅ Connected to MongoDB\n")

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   Current role: ${user.role || "not set"}`)

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    user.password = hashedPassword
    await user.save()

    console.log("\n✅ Password reset successfully!")
    console.log(`   Email: ${user.email}`)
    console.log(`   You can now login with:`)
    console.log(`   - Email: ${user.email}`)
    console.log(`   - Password: ${newPassword}`)

    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

resetPassword()
