import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import BlacklistedToken from "@/lib/models/BlacklistedToken"
import { decodeToken } from "@/lib/jwt-utils"

export async function POST(request: NextRequest) {
  try {
    let token: string | null = null

    // Token from header or body
    if (request.headers.get("authorization")?.startsWith("Bearer ")) {
      token = request.headers.get("authorization")!.substring(7)
    } else {
      const body = await request.json().catch(() => ({}))
      token = body.token
    }

    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 400 })
    }

    await dbConnect()

    // Decode to get expiry
    const decoded = decodeToken(token)
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Save to blacklist
    await BlacklistedToken.create({ token, expiresAt })

    return NextResponse.json({ message: "Logout successful" })
  } catch (error: any) {
    return NextResponse.json({ message: "Server error during logout" }, { status: 500 })
  }
}
