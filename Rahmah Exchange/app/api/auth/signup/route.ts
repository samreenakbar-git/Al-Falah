import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/jwt-utils"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = "applicant" } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: "All fields required" }, { status: 400 })
    }

    // Validate role
    const validRoles = ["admin", "caseworker", "approver", "applicant"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    await dbConnect()

    // Check if user exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    const user = await User.create({ name, email, password, role })

    return NextResponse.json(
      {
        message: "Signup successful",
        token: generateToken({
          id: user._id.toString(),
          role: user.role,
          name: user.name,
          email: user.email,
        }),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
