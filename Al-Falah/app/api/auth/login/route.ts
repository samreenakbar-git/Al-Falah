import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import User from "@/lib/models/User"
import Tenant from "@/lib/models/Tenant"
import { generateToken } from "@/lib/jwt-utils"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password, masjidSlug } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 })
    }

    await dbConnect()

    // Normalize email to match how we store it (lowercased)
    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 400 })
    }

    // Check if user account is active
    if (user.isActive === false) {
      return NextResponse.json(
        { message: "Your profile is currently inactive. Please contact an administrator." },
        { status: 403 },
      )
    }

    if (masjidSlug) {
      const tenant = await Tenant.findOne({ slug: masjidSlug })
      if (!tenant) {
        return NextResponse.json({ message: "Masjid not found" }, { status: 404 })
      }

      // Check if user's tenant matches the provided masjid slug
      if (!user.tenantId || user.tenantId.toString() !== tenant._id.toString()) {
        return NextResponse.json({ message: "You don't have access to this masjid" }, { status: 403 })
      }
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
      tenantId: user.tenantId?.toString(),
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
          tenantId: user.tenantId,
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
      { status: 500 },
    )
  }
}
