import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"
import { ensureInternalEmail } from "@/lib/internal-email"
import bcrypt from "bcryptjs"

/**
 * GET /api/users/[userId] - Get user details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { userId } = await params
    await dbConnect()
    const user = await User.findById(userId, "-password").lean()
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ user }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[userId] - Update user (admin or super_admin)
 * - Super admin can edit any admin
 * - Regular admin can edit users in their tenant
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const roleCheck = await requireRole(request, ["admin", "super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { userId } = await params
    const { name, email, password, role, isActive } = await request.json()
    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Super admin can only edit admins
    if (roleCheck.user.role === "super_admin" && user.role !== "admin") {
      return NextResponse.json({ 
        message: "Super admin can only edit admin users" 
      }, { status: 403 })
    }

    // Regular admin can only edit users in their tenant
    if (roleCheck.user.role !== "super_admin") {
      const { requireTenant } = await import("@/lib/tenant-middleware")
      const tenantCheck = await requireTenant(request)
      if (tenantCheck.tenantId && user.tenantId?.toString() !== tenantCheck.tenantId) {
        return NextResponse.json({ 
          message: "You can only edit users from your masjid" 
        }, { status: 403 })
      }
    }

    // Check if email is being changed and if it's already taken by another user
    if (email && email !== user.email) {
      const emailFilter: any = { email: email.toLowerCase(), _id: { $ne: userId } }
      // For super_admin, check globally; for regular admin, check within tenant
      if (roleCheck.user.role !== "super_admin" && user.tenantId) {
        emailFilter.tenantId = user.tenantId
      }
      const existingUser = await User.findOne(emailFilter)
      if (existingUser) {
        return NextResponse.json({ message: "Email already in use by another user" }, { status: 400 })
      }
      user.email = email.toLowerCase()
    }

    if (name) {
      user.name = name
    }
    
    if (role) {
      const validRoles = ["admin", "caseworker", "approver", "treasurer", "applicant"]
      if (!validRoles.includes(role)) {
        return NextResponse.json({ message: "Invalid role" }, { status: 400 })
      }
      user.role = role
    }
    
    if (isActive !== undefined) {
      user.isActive = isActive
    }

    // Update password if provided
    // Let the User model's pre-save hook handle hashing automatically
    if (password && password.trim() !== "") {
      user.password = password
    }

    await user.save()

    // Ensure internal email is updated if role or name changed
    if (role || name) {
      await ensureInternalEmail(user._id.toString())
    }

    const updatedUser = await User.findById(user._id, "-password").lean()
    return NextResponse.json({ user: updatedUser, message: "User updated successfully" }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
