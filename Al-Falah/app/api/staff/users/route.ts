import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"

/**
 * GET /api/staff/users - List all staff users (for messaging)
 * - Super admin: sees only admins from all masjids
 * - Regular staff: sees all staff from their masjid
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer", "super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    
    // Build filter based on user role
    let filter: any = { isActive: { $ne: false } }
    let users: any[] = []
    
    if (roleCheck.user.role === "super_admin") {
      // Super admin sees only admins from all masjids
      filter.role = "admin"
      users = await User.find(filter, "-password").lean()
    } else if (roleCheck.user.role === "admin") {
      // Admin sees all staff from their masjid + super admin
      filter.role = { $in: ["admin", "caseworker", "approver", "treasurer"] }
      
      // Filter by tenant if user has tenantId
      if (roleCheck.user.tenantId) {
        filter.tenantId = roleCheck.user.tenantId
      }
      
      // Get staff from their masjid
      const masjidStaff = await User.find(filter, "-password").lean()
      
      // Get super admin users
      const superAdmins = await User.find({ role: "super_admin", isActive: { $ne: false } }, "-password").lean()
      
      // Combine both lists
      users = [...masjidStaff, ...superAdmins]
    } else {
      // Regular staff (caseworker, approver, treasurer) sees all staff from their masjid
      filter.role = { $in: ["admin", "caseworker", "approver", "treasurer"] }
      
      // Filter by tenant if user has tenantId
      if (roleCheck.user.tenantId) {
        filter.tenantId = roleCheck.user.tenantId
      }
      
      users = await User.find(filter, "-password").lean()
    }
    
    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

