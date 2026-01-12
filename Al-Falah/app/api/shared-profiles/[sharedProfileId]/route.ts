import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import SharedProfile from "@/lib/models/SharedProfile"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { requireRole } from "@/lib/role-middleware"
import { getTenantFilter } from "@/lib/tenant-middleware"

interface PopulatedSharedProfile {
  _id: string
  profileId: string
  fromTenant: string
  toTenant: string
  sharedBy: string
  note?: string
  permissions: string
  isActive: boolean
  viewedAt?: Date
  viewedBy?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * GET /api/shared-profiles/[sharedProfileId] - Get shared profile details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sharedProfileId: string }> }) {
  const authHeader = request.headers.get("authorization")
  let roleCheck: any = null

  if (authHeader) {
    // If authenticated, require proper roles
    roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
    if (!roleCheck.authorized) {
      return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
    }
  }

  try {
    const { sharedProfileId } = await params
    await dbConnect()

    // If authenticated, use tenant filter. If public, allow viewing shared profile
    let sharedProfile: PopulatedSharedProfile | null

    if (roleCheck && roleCheck.authorized) {
      const tenantFilter = await getTenantFilter(request)
      sharedProfile = (await SharedProfile.findOne({
        _id: sharedProfileId,
        toTenant: tenantFilter.tenantId,
        isActive: true,
      })
        .populate("profileId")
        .populate("fromTenant", "name slug email phone address")
        .populate("toTenant", "name slug")
        .populate("sharedBy", "name email")
        .lean()) as PopulatedSharedProfile | null
    } else {
      // Public access - allow viewing but without tenant restriction
      sharedProfile = (await SharedProfile.findOne({
        _id: sharedProfileId,
        isActive: true,
      })
        .populate("profileId")
        .populate("fromTenant", "name slug email phone address")
        .populate("toTenant", "name slug")
        .populate("sharedBy", "name email")
        .lean()) as PopulatedSharedProfile | null
    }

    if (!sharedProfile) {
      return NextResponse.json({ message: "Shared profile not found" }, { status: 404 })
    }

    // Get full applicant data
    const applicant = await ZakatApplicant.findById(sharedProfile.profileId).lean()

    // Mark as viewed only if authenticated
    if (roleCheck && roleCheck.authorized) {
      await SharedProfile.findByIdAndUpdate(sharedProfileId, {
        viewedAt: new Date(),
        viewedBy: roleCheck.user._id,
      })
    }

    return NextResponse.json(
      {
        sharedProfile,
        applicant,
      },
      { status: 200 },
    )
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/shared-profiles/[sharedProfileId] - Revoke shared profile access
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sharedProfileId: string }> }) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { sharedProfileId } = await params
    await dbConnect()
    const tenantFilter = await getTenantFilter(request)

    // Only the sharing tenant (fromTenant) can revoke
    const sharedProfile = await SharedProfile.findOne({
      _id: sharedProfileId,
      fromTenant: tenantFilter.tenantId,
    })

    if (!sharedProfile) {
      return NextResponse.json({ message: "Shared profile not found or access denied" }, { status: 404 })
    }

    await SharedProfile.findByIdAndUpdate(sharedProfileId, { isActive: false })

    return NextResponse.json({ message: "Shared profile access revoked" }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
