import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { requireRole } from "@/lib/role-middleware"
import { ensureInternalEmail } from "@/lib/internal-email"

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    const users = await User.find({}, "-password").lean()
    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/users - Create new user (admin only)
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const validRoles = ["admin", "caseworker", "approver", "treasurer"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role. Must be admin, caseworker, approver, or treasurer" }, { status: 400 })
    }

    await dbConnect()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    const user = await User.create({ name, email, password, role })

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
