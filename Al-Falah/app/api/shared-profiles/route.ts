import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import SharedProfile from "@/lib/models/SharedProfile"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import Tenant from "@/lib/models/Tenant"
import { requireRole } from "@/lib/role-middleware"
import { getTenantFilter } from "@/lib/tenant-middleware"

/**
 * GET /api/shared-profiles - Get shared profiles for current tenant
 * Returns profiles shared TO this tenant (incoming shares)
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "caseworker", "approver", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()
    const tenantFilter = await getTenantFilter(request)
    
    // Get profiles shared TO this tenant
    const sharedProfiles = await SharedProfile.find({
      toTenant: tenantFilter.tenantId,
      isActive: true,
    })
      .populate("profileId", "firstName lastName email mobilePhone caseId status")
      .populate("fromTenant", "name slug")
      .populate("sharedBy", "name email")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ sharedProfiles }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/shared-profiles - Share a profile with another tenant
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { profileId, toTenantId, note } = await request.json()

    if (!profileId || !toTenantId) {
      return NextResponse.json({ message: "profileId and toTenantId are required" }, { status: 400 })
    }

    await dbConnect()
    const tenantFilter = await getTenantFilter(request)
    const fromTenantId = tenantFilter.tenantId

    if (!fromTenantId) {
      return NextResponse.json({ message: "User must belong to a tenant" }, { status: 403 })
    }

    // Verify profile belongs to current tenant
    const profile = await ZakatApplicant.findOne({
      _id: profileId,
      tenantId: fromTenantId,
    })

    if (!profile) {
      return NextResponse.json({ message: "Profile not found or access denied" }, { status: 404 })
    }

    // Verify target tenant exists
    const toTenant = await Tenant.findById(toTenantId)
    if (!toTenant) {
      return NextResponse.json({ message: "Target tenant not found" }, { status: 404 })
    }

    // Check if already shared
    const existingShare = await SharedProfile.findOne({
      profileId,
      fromTenant: fromTenantId,
      toTenant: toTenantId,
      isActive: true,
    })

    if (existingShare) {
      return NextResponse.json({ message: "Profile already shared with this tenant" }, { status: 409 })
    }

    // Create share
    const sharedProfile = await SharedProfile.create({
      profileId,
      fromTenant: fromTenantId,
      toTenant: toTenantId,
      sharedBy: roleCheck.user._id,
      note,
      permissions: "read_only",
    })

    const populated = await SharedProfile.findById(sharedProfile._id)
      .populate("profileId")
      .populate("fromTenant", "name slug")
      .populate("toTenant", "name slug")
      .populate("sharedBy", "name email")
      .lean()

    return NextResponse.json({ message: "Profile shared successfully", sharedProfile: populated }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

