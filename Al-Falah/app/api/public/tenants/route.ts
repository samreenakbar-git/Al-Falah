import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Tenant from "@/lib/models/Tenant"

/**
 * GET /api/public/tenants - List active masjids for public forms
 */
export async function GET() {
  try {
    await dbConnect()
    const tenants = await Tenant.find({ isActive: true }).select("_id name slug").lean()
    return NextResponse.json({ tenants }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

