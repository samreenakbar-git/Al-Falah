import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Tenant from "@/lib/models/Tenant"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params

    await dbConnect()

    const tenant = await Tenant.findOne({ slug: slug.toLowerCase(), isActive: true })
    if (!tenant) {
      return NextResponse.json({ message: "Masjid not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Tenant fetch error:", error)
    return NextResponse.json(
      {
        message: "Server error. Please try again.",
        error: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 },
    )
  }
}
