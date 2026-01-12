/**
 * Migration script to add tenant_id to existing data
 *
 * This script:
 * 1. Creates a default tenant if none exists
 * 2. Assigns all existing users/applicants/data to the default tenant
 * 3. Updates all records with tenant_id
 *
 * Run with: npx tsx scripts/migrate-to-multi-tenant.ts
 *
 * Make sure you have MONGODB_URI in your .env.local file
 */

// Load environment variables FIRST before any other imports
import dotenv from "dotenv"
import { resolve } from "path"

// Load .env.local first (takes precedence), then .env as fallback
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

// Verify MONGODB_URI is loaded
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not defined")
  console.error("   Please add MONGODB_URI to your .env or .env.local file")
  process.exit(1)
}

// Now import other modules that may need environment variables
import mongoose from "mongoose"

// Direct connection function to avoid db.ts module load issues
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  try {
    await mongoose.connect(MONGODB_URI as string)
    console.log("✅ Connected to MongoDB")
    return mongoose.connection
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error)
    throw error
  }
}
import Tenant from "../lib/models/Tenant"
import User from "../lib/models/User"
import ZakatApplicant from "../lib/models/ZakatApplicant"
import Grant from "../lib/models/Grant"
import PaymentRecord from "../lib/models/PaymentRecord"
import CaseAssignment from "../lib/models/CaseAssignment"
import CaseNote from "../lib/models/CaseNote"
import Conversation from "../lib/models/Conversation"
import Message from "../lib/models/Message"
import Notification from "../lib/models/Notification"
import DocumentAudit from "../lib/models/DocumentAudit"

async function migrate() {
  try {
    console.log("🔌 Connecting to database...")
    await connectDB()

    // Step 1: Create default tenant if it doesn't exist
    console.log("\n📋 Step 1: Creating default tenant...")
    let defaultTenant = await Tenant.findOne({ slug: "default" })

    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: "Default Mosque",
        slug: "default",
        email: "admin@rahmah.internal",
        isActive: true,
      })
      console.log(`✅ Created default tenant: ${defaultTenant._id}`)
    } else {
      console.log(`✅ Default tenant already exists: ${defaultTenant._id}`)
    }

    const tenantId = defaultTenant._id

    // Step 2: Update Users
    console.log("\n👥 Step 2: Updating users...")
    const usersWithoutTenant = await User.countDocuments({ tenantId: { $exists: false } })
    if (usersWithoutTenant > 0) {
      const result = await User.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId } })
      console.log(`✅ Updated ${result.modifiedCount} users`)
    } else {
      console.log("✅ All users already have tenant_id")
    }

    // Step 3: Update ZakatApplicants
    console.log("\n📝 Step 3: Updating applicants...")
    const applicantsWithoutTenant = await ZakatApplicant.countDocuments({ tenantId: { $exists: false } })
    if (applicantsWithoutTenant > 0) {
      const result = await ZakatApplicant.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId } })
      console.log(`✅ Updated ${result.modifiedCount} applicants`)
    } else {
      console.log("✅ All applicants already have tenant_id")
    }

    // Step 4: Update Grants (get tenantId from applicant)
    console.log("\n💰 Step 4: Updating grants...")
    const grantsWithoutTenant = await Grant.countDocuments({ tenantId: { $exists: false } })
    if (grantsWithoutTenant > 0) {
      // Get all grants without tenantId and populate applicant
      const grants = await Grant.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const grant of grants) {
        const applicant = grant.applicantId as any
        if (applicant && applicant.tenantId) {
          await Grant.findByIdAndUpdate(grant._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await Grant.findByIdAndUpdate(grant._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} grants`)
    } else {
      console.log("✅ All grants already have tenant_id")
    }

    // Step 5: Update PaymentRecords
    console.log("\n💳 Step 5: Updating payment records...")
    const paymentsWithoutTenant = await PaymentRecord.countDocuments({ tenantId: { $exists: false } })
    if (paymentsWithoutTenant > 0) {
      const payments = await PaymentRecord.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const payment of payments) {
        const applicant = payment.applicantId as any
        if (applicant && applicant.tenantId) {
          await PaymentRecord.findByIdAndUpdate(payment._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await PaymentRecord.findByIdAndUpdate(payment._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} payment records`)
    } else {
      console.log("✅ All payment records already have tenant_id")
    }

    // Step 6: Update CaseAssignments
    console.log("\n📋 Step 6: Updating case assignments...")
    const assignmentsWithoutTenant = await CaseAssignment.countDocuments({ tenantId: { $exists: false } })
    if (assignmentsWithoutTenant > 0) {
      const assignments = await CaseAssignment.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const assignment of assignments) {
        const applicant = assignment.applicantId as any
        if (applicant && applicant.tenantId) {
          await CaseAssignment.findByIdAndUpdate(assignment._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await CaseAssignment.findByIdAndUpdate(assignment._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} case assignments`)
    } else {
      console.log("✅ All case assignments already have tenant_id")
    }

    // Step 7: Update CaseNotes
    console.log("\n📝 Step 7: Updating case notes...")
    const notesWithoutTenant = await CaseNote.countDocuments({ tenantId: { $exists: false } })
    if (notesWithoutTenant > 0) {
      const notes = await CaseNote.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const note of notes) {
        const applicant = note.applicantId as any
        if (applicant && applicant.tenantId) {
          await CaseNote.findByIdAndUpdate(note._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await CaseNote.findByIdAndUpdate(note._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} case notes`)
    } else {
      console.log("✅ All case notes already have tenant_id")
    }

    // Step 8: Update Conversations
    console.log("\n💬 Step 8: Updating conversations...")
    const conversationsWithoutTenant = await Conversation.countDocuments({ tenantId: { $exists: false } })
    if (conversationsWithoutTenant > 0) {
      const conversations = await Conversation.find({ tenantId: { $exists: false } }).populate("caseId")

      let updated = 0
      for (const conv of conversations) {
        const caseRef = conv.caseId as any
        if (caseRef && caseRef.tenantId) {
          await Conversation.findByIdAndUpdate(conv._id, { $set: { tenantId: caseRef.tenantId } })
          updated++
        } else {
          await Conversation.findByIdAndUpdate(conv._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} conversations`)
    } else {
      console.log("✅ All conversations already have tenant_id")
    }

    // Step 9: Update Messages
    console.log("\n📨 Step 9: Updating messages...")
    const messagesWithoutTenant = await Message.countDocuments({ tenantId: { $exists: false } })
    if (messagesWithoutTenant > 0) {
      const messages = await Message.find({ tenantId: { $exists: false } }).populate("caseId")

      let updated = 0
      for (const msg of messages) {
        const caseRef = msg.caseId as any
        if (caseRef && caseRef.tenantId) {
          await Message.findByIdAndUpdate(msg._id, { $set: { tenantId: caseRef.tenantId } })
          updated++
        } else {
          await Message.findByIdAndUpdate(msg._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} messages`)
    } else {
      console.log("✅ All messages already have tenant_id")
    }

    // Step 10: Update Notifications
    console.log("\n🔔 Step 10: Updating notifications...")
    const notificationsWithoutTenant = await Notification.countDocuments({ tenantId: { $exists: false } })
    if (notificationsWithoutTenant > 0) {
      const notifications = await Notification.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const notif of notifications) {
        const applicant = notif.applicantId as any
        if (applicant && applicant.tenantId) {
          await Notification.findByIdAndUpdate(notif._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await Notification.findByIdAndUpdate(notif._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} notifications`)
    } else {
      console.log("✅ All notifications already have tenant_id")
    }

    // Step 11: Update DocumentAudit
    console.log("\n📄 Step 11: Updating document audits...")
    const auditsWithoutTenant = await DocumentAudit.countDocuments({ tenantId: { $exists: false } })
    if (auditsWithoutTenant > 0) {
      const audits = await DocumentAudit.find({ tenantId: { $exists: false } }).populate("applicantId")

      let updated = 0
      for (const audit of audits) {
        const applicant = audit.applicantId as any
        if (applicant && applicant.tenantId) {
          await DocumentAudit.findByIdAndUpdate(audit._id, { $set: { tenantId: applicant.tenantId } })
          updated++
        } else {
          await DocumentAudit.findByIdAndUpdate(audit._id, { $set: { tenantId } })
          updated++
        }
      }
      console.log(`✅ Updated ${updated} document audits`)
    } else {
      console.log("✅ All document audits already have tenant_id")
    }

    console.log("\n✅ Migration completed successfully!")
    console.log("\n📊 Summary:")
    console.log(`   - Default tenant: ${defaultTenant.name} (${defaultTenant.slug})`)
    console.log(`   - All existing data has been assigned to the default tenant`)
    console.log("\n⚠️  Next steps:")
    console.log("   1. Create additional tenants via the admin panel")
    console.log("   2. Assign users to their respective tenants")
    console.log("   3. Re-assign data to correct tenants if needed")

    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

migrate()
