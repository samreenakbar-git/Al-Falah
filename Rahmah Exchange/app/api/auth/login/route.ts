import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/jwt-utils"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 })
    }

    await dbConnect()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 400 })
    }

    // Check if user account is active
    if (user.isActive === false) {
      return NextResponse.json(
        { message: "Your profile is currently inactive. Please contact an administrator." },
        { status: 403 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 400 })
    }

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    })

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Login error:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
      cause: error?.cause,
    })
    return NextResponse.json(
      {
        message: "Server error. Please try again.",
        error: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}
