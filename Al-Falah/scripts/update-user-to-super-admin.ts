/**
 * Quick script to update an existing user to super_admin by email
 *
 * Usage: npx tsx scripts/update-user-to-super-admin.ts <email>
 * Example: npx tsx scripts/update-user-to-super-admin.ts admin@example.com
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

async function updateToSuperAdmin() {
  try {
    const email = process.argv[2]

    if (!email) {
      console.error("❌ Usage: npx tsx scripts/update-user-to-super-admin.ts <email>")
      console.error("   Example: npx tsx scripts/update-user-to-super-admin.ts staff@gmail.com")
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

    // Update to super_admin
    user.role = "super_admin"
    // Super admin doesn't need tenantId (can access all tenants)
    user.tenantId = undefined
    await user.save()

    console.log("\n✅ Successfully updated user to super_admin!")
    console.log(`   Name: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Tenant ID: ${user.tenantId || "none (super admin)"}`)

    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

updateToSuperAdmin()
