import type { NextRequest } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "./db"
import BlacklistedToken from "./models/BlacklistedToken"
import User from "./models/User"
import { verifyToken } from "./jwt-utils"

// Local interface for authenticated user
interface AuthenticatedUser {
  _id: string
  name: string
  email: string
  internalEmail?: string
  role: string
  tenantId?: string | mongoose.Types.ObjectId
}

export async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "No token provided" }
    }

    const token = authHeader.substring(7)

    await dbConnect()

    const blacklistedToken = await BlacklistedToken.findOne({ token })
    if (blacklistedToken) {
      return { user: null, error: "Token is blacklisted" }
    }

    const decoded = verifyToken(token)
    if (!decoded || !decoded.id) {
      return { user: null, error: "Invalid or expired token" }
    }

    // Explicitly type the user
    const user = (await User.findById(decoded.id).lean()) as AuthenticatedUser | null
    if (!user) {
      return { user: null, error: "User not found" }
    }

    // Ensure role exists
    // Special case: if user is staff@gmail.com and has no role, set to admin
    // This handles legacy users that were created before role field was added
    if (!user.role) {
      if (user.email?.toLowerCase() === "staff@gmail.com") {
        // Update the user in database to have admin role
        try {
          await User.findByIdAndUpdate(decoded.id, { role: "admin" })
          user.role = "admin"
          console.log("✅ Auto-updated staff@gmail.com to admin role")
        } catch (err) {
          console.error("Failed to update user role:", err)
          user.role = "admin" // Set locally anyway
        }
      } else {
        user.role = "user"
      }
    }

    // Include tenantId in user object
    if (user.tenantId) {
      user.tenantId = user.tenantId.toString()
    }

    return { user, error: null }
  } catch (error) {
    console.error("Authentication error:", error)
    return { user: null, error: "Authentication failed" }
  }
}
