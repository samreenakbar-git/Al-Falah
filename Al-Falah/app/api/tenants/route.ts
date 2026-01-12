import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Tenant from "@/lib/models/Tenant"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"
import { sendEmail } from "@/lib/email"
import { generateAdminInviteLink } from "@/lib/admin-invite-utils"
import { escapeHtml } from "@/lib/utils/html-sanitize"

/**
 * GET /api/tenants - List all tenants (super_admin only)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const availableOnly = url.searchParams.get("available") === "true"

  // If requesting available tenants, allow authenticated staff
  if (availableOnly) {
    const roleCheck = await requireRole(request, ["super_admin", "admin", "caseworker", "donor"])
    if (!roleCheck.authorized) {
      return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
    }

    try {
      const user = roleCheck.user
      await dbConnect()
      // Get all active tenants except the current user's tenant
      const tenants = await Tenant.find({
        isActive: true,
        _id: { $ne: user.tenantId },
      })
        .select("_id name slug")
        .lean()
      return NextResponse.json({ tenants }, { status: 200 })
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
  }

  // Original behavior for admins listing all tenants
  const roleCheck = await requireRole(request, ["super_admin", "admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ tenants }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/tenants - Create new tenant (super_admin only)
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { name, slug, phone, address, adminEmail, adminName } = await request.json()

    // Validation
    if (!name) {
      return NextResponse.json({ message: "Masjid name is required" }, { status: 400 })
    }

    if (!adminEmail || !adminName) {
      return NextResponse.json({ message: "Admin email and name are required" }, { status: 400 })
    }

    if (!address || !address.street || !address.city || !address.state || !address.zipCode) {
      return NextResponse.json(
        { message: "Complete address (street, city, state, zipCode) is required" },
        { status: 400 },
      )
    }

    await dbConnect()

    // Auto-generate slug from name if not provided
    const generatedSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

    // Check if tenant with slug exists
    const existingTenant = await Tenant.findOne({ slug: generatedSlug })
    if (existingTenant) {
      return NextResponse.json({ message: "A masjid with this name already exists" }, { status: 409 })
    }

    // Create tenant - use adminEmail as the masjid email
    const tenant = await Tenant.create({
      name,
      slug: generatedSlug,
      email: adminEmail, // Use admin email as masjid email
      phone,
      address,
    })

    // Admin email is required - create admin user and send invitation
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: adminEmail.toLowerCase() })

      let adminUser
      if (existingUser) {
        // Update existing user to be admin for this tenant
        existingUser.role = "admin"
        existingUser.tenantId = tenant._id
        existingUser.isActive = true
        if (adminName && existingUser.name !== adminName) {
          existingUser.name = adminName
        }
        await existingUser.save()
        adminUser = existingUser
      } else {
        // Create new admin user (without password - they'll set it via invitation)
        adminUser = await User.create({
          name: adminName,
          email: adminEmail.toLowerCase(),
          password: "temp_password_will_be_set_via_invite", // Temporary, will be changed
          role: "admin",
          tenantId: tenant._id,
          isActive: true,
        })
      }

      // Send invitation email
      const baseUrl = new URL(request.url).origin
      const inviteLink = generateAdminInviteLink(adminUser._id.toString(), tenant._id.toString(), tenant.slug, baseUrl)

      await sendEmail({
        to: adminEmail,
        subject: `Welcome to ${name} on Al-Falah - Set Your Password`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Welcome to Al-Falah</h2>
            <p>Assalamu Alaikum ${escapeHtml(adminName)},</p>
            <p>You have been granted admin access to <strong>${escapeHtml(name)}</strong> on the Al-Falah platform.</p>
            <p>To get started, please set your password by clicking the link below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Set Your Password
              </a>
            </p>
           
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              <strong>Note:</strong> This link will expire in 7 days. If it expires, please contact the super administrator.
            </p>
            <p>After setting your password, you can log in at: <a href="${baseUrl}/${tenant.slug}/staff/login">${baseUrl}/${tenant.slug}/staff/login</a></p>
            <p>Best regards,<br>Al-Falah Team</p>
          </div>
        `,
        text: `Welcome to Al-Falah

Assalamu Alaikum ${adminName},

You have been granted admin access to ${name} on the Al-Falah platform.

To get started, please set your password by clicking this link:
${inviteLink}

Note: This link will expire in 7 days.

After setting your password, you can log in at: ${baseUrl}/${tenant.slug}/staff/login

Best regards,
Al-Falah Team`,
      })
    } catch (userError: any) {
      console.error("Error creating admin user or sending invitation:", userError)
      // Rollback tenant creation if admin setup fails
      await Tenant.findByIdAndDelete(tenant._id)
      return NextResponse.json(
        {
          message: "Failed to create admin user or send invitation",
          error: userError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: "Tenant created successfully", tenant }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
