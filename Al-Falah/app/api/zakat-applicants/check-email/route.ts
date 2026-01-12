import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { getTenantFilter } from "@/lib/tenant-middleware"
import { authenticateRequest } from "@/lib/auth-middleware"

// GET check if email exists - requires auth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    // Authenticate request
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Get tenant filter for authenticated user
    let tenantFilter: { tenantId?: string } = {}
    try {
      tenantFilter = await getTenantFilter(request)
    } catch (tenantError) {
      // If user is super_admin without tenant filter, allow checking across all tenants
      if (user.role !== "super_admin") {
        return NextResponse.json({ 
          error: "Access denied - User is not associated with a masjid" 
        }, { status: 403 })
      }
    }

    // Check if email exists within the tenant (or all tenants for super_admin)
    const existingApplicant = await ZakatApplicant.findOne({
      email: email.toLowerCase().trim(),
      ...tenantFilter
    })

    return NextResponse.json({ 
      exists: !!existingApplicant,
      email: email
    }, { status: 200 })
  } catch (error: any) {
    console.error("Check email error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
