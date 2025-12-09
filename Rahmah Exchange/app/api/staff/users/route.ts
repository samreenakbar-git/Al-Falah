import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"

/**
 * GET /api/staff/users - List all staff users (for messaging - accessible by all staff roles)
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    // Return only staff users (exclude applicants) and only active users
    const users = await User.find(
      { 
        role: { $in: ["admin", "caseworker", "approver", "treasurer"] },
        isActive: { $ne: false } // Include active users and users where isActive is not set (defaults to true)
      },
      "-password"
    ).lean()
    
    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

