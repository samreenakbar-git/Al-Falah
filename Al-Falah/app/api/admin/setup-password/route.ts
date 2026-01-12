import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { verifyAdminInviteToken } from "@/lib/admin-invite-utils"

interface IUser {
  _id: string
  name: string
  email: string
  password?: string
  role: string
  tenantId?: string
  isActive: boolean
}

/**
 * GET /api/admin/setup-password - Verify invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 })
    }

    const decoded = verifyAdminInviteToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
    }

    await dbConnect()
    const user = (await User.findById(decoded.userId).lean()) as IUser | null

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: user.name,
        email: user.email,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/setup-password - Set password for invited admin
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ message: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 })
    }

    const decoded = verifyAdminInviteToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
    }

    await dbConnect()
    const user = await User.findById(decoded.userId)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Verify tenant matches
    if (user.tenantId?.toString() !== decoded.tenantId) {
      return NextResponse.json({ message: "Invalid token for this user" }, { status: 403 })
    }

    // Set password - the User model's pre-save hook will hash it automatically
    // We set it as plain text and let the model handle hashing
    user.password = password
    await user.save()

    return NextResponse.json({ message: "Password set successfully. You can now log in." }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
