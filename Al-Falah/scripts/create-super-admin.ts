/**
 * Script to create or update a user to super_admin role
 *
 * Run with: npx tsx scripts/create-super-admin.ts
 *
 * This will prompt you for email and optionally create a new user or update existing
 */

// Load environment variables FIRST
import dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const MONGODB_URI = process.env.MONGODB_URI as string
if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not defined")
  process.exit(1)
}

import mongoose from "mongoose"
import User from "../lib/models/User"
import * as readline from "readline"

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createSuperAdmin() {
  try {
    console.log("🔌 Connecting to database...")
    await mongoose.connect(MONGODB_URI)
    console.log("✅ Connected to MongoDB\n")

    // Get email from user
    const email = await question("Enter email address for super admin: ")
    if (!email) {
      console.error("❌ Email is required")
      process.exit(1)
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      console.log(`\n✅ Found existing user: ${existingUser.name} (${existingUser.email})`)
      console.log(`   Current role: ${existingUser.role || "not set"}`)

      const confirm = await question("\nDo you want to update this user to super_admin? (yes/no): ")
      if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
        console.log("❌ Cancelled")
        process.exit(0)
      }

      // Update existing user
      existingUser.role = "super_admin"
      // Super admin doesn't need tenantId (can access all tenants)
      existingUser.tenantId = undefined

      // Optionally reset password to avoid any old/double-hashed values
      const resetPassword = await question("Do you want to set a NEW password for this super admin? (yes/no): ")
      if (resetPassword.toLowerCase() === "yes" || resetPassword.toLowerCase() === "y") {
        const newPassword = await question("Enter new password (min 6 characters): ")
        if (!newPassword || newPassword.length < 6) {
          console.error("❌ Password is required and must be at least 6 characters")
          process.exit(1)
        }
        // Assign plain password; User model pre-save hook will hash it once
        ;(existingUser as any).password = newPassword
      }

      await existingUser.save()

      console.log("\n✅ Successfully updated user to super_admin!")
      console.log(`   Name: ${existingUser.name}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: ${existingUser.role}`)
    } else {
      // Create new user
      console.log("\n📝 Creating new super admin user...")

      const name = await question("Enter full name: ")
      if (!name) {
        console.error("❌ Name is required")
        process.exit(1)
      }

      const password = await question("Enter password: ")
      if (!password || password.length < 6) {
        console.error("❌ Password is required and must be at least 6 characters")
        process.exit(1)
      }

      // Create user
      // NOTE: We pass the plain-text password here.
      // The User model's pre-save hook will hash it once before storing.
      const newUser = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: "super_admin",
        // Super admin doesn't need tenantId
        tenantId: undefined,
        isActive: true,
      })

      console.log("\n✅ Successfully created super admin user!")
      console.log(`   Name: ${newUser.name}`)
      console.log(`   Email: ${newUser.email}`)
      console.log(`   Role: ${newUser.role}`)
      console.log(`   ID: ${newUser._id}`)
    }

    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    if (error.code === 11000) {
      console.error("   Email already exists. Please use the update option.")
    }
    process.exit(1)
  } finally {
    rl.close()
  }
}

createSuperAdmin()
