import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"
import { ensureInternalEmail } from "@/lib/internal-email"
import { getTenantFilter, requireTenant } from "@/lib/tenant-middleware"

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    
    // Super admin sees only admins from all masjids, regular admin sees all users from their tenant
    let filter: any = {}
    if (roleCheck.user.role === "super_admin") {
      // Super admin sees only admins from all masjids
      filter.role = "admin"
    } else {
      // Regular admin sees all users from their tenant
      const tenantCheck = await requireTenant(request)
      if (tenantCheck.tenantId) {
        filter.tenantId = tenantCheck.tenantId
      }
    }
    
    const users = await User.find(filter, "-password").lean()
    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/users - Create new user (admin or super_admin only)
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const body = await request.json()
    const { name, email, password, role, tenantId } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      const missingFields = []
      if (!name) missingFields.push("name")
      if (!email) missingFields.push("email")
      if (!password) missingFields.push("password")
      if (!role) missingFields.push("role")
      return NextResponse.json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      }, { status: 400 })
    }

    const validRoles = ["admin", "caseworker", "approver", "treasurer", "super_admin"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        message: `Invalid role "${role}". Must be one of: ${validRoles.join(", ")}` 
      }, { status: 400 })
    }

    await dbConnect()

    // Determine tenantId for the new user (handle empty strings as null)
    let userTenantId: string | null = (tenantId && tenantId.trim()) ? tenantId.trim() : null
    
    // Debug logging
    console.log("Creating user:", {
      creatorRole: roleCheck.user.role,
      creatorTenantId: roleCheck.user.tenantId,
      newUserRole: role,
      providedTenantId: tenantId,
      resolvedTenantId: userTenantId,
    })
    
    // If tenantId not provided in body, try to get from authenticated user's tenant
    if (!userTenantId) {
      if (roleCheck.user.role === "super_admin") {
        // Super admin can create users without tenantId
        // If creating super_admin, no tenantId needed
        // If creating other roles, tenantId is optional (can be assigned later)
        userTenantId = null
        console.log("Super admin creating user - tenantId optional")
      } else {
        // Regular admin: get tenantId from their user record
        const adminTenantId = roleCheck.user.tenantId
        if (adminTenantId) {
          userTenantId = adminTenantId.toString()
          console.log("Using admin's tenantId from user record:", userTenantId)
        } else {
          // Admin user doesn't have tenantId in their record
          // Check if they're trying to create a super_admin (allowed)
          if (role === "super_admin") {
            userTenantId = null // Super admin users don't need tenantId
            console.log("Admin creating super_admin user without tenantId")
          } else {
            // Regular admin without tenantId trying to create non-super_admin user
            console.error("Admin without tenantId trying to create non-super_admin user:", {
              adminId: roleCheck.user._id,
              adminEmail: roleCheck.user.email,
              adminRole: roleCheck.user.role,
              targetRole: role,
            })
            return NextResponse.json({ 
              message: "tenantId is required. Your admin account is not associated with a masjid. Please provide tenantId in the request body, or contact a super admin to associate your account with a masjid." 
            }, { status: 400 })
          }
        }
      }
    }

    // Final validation: non-super_admin users must have tenantId
    if (!userTenantId && role !== "super_admin") {
      console.error("Validation failed: non-super_admin user without tenantId", {
        role,
        userTenantId,
        creatorRole: roleCheck.user.role,
        creatorTenantId: roleCheck.user.tenantId,
      })
      return NextResponse.json({ 
        message: `tenantId is required for role "${role}". Please provide tenantId in the request body.` 
      }, { status: 400 })
    }
    
    console.log("Final tenantId for new user:", userTenantId)

    // Check for duplicate email within tenant (or globally for super_admin)
    const emailFilter: any = { email }
    if (userTenantId) {
      emailFilter.tenantId = userTenantId
    }
    const existingUser = await User.findOne(emailFilter)
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    const userData: any = { name, email, password, role }
    if (userTenantId) {
      userData.tenantId = userTenantId
    }

    const user = await User.create(userData)

    // Ensure internal email is generated
    await ensureInternalEmail(user._id.toString())
    const updatedUser = await User.findById(user._id, "-password").lean()

    return NextResponse.json(
      {
        message: "User created successfully",
        user: updatedUser,
      },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
