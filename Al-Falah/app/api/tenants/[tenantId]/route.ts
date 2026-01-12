import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import Tenant from "@/lib/models/Tenant"
import { requireRole } from "@/lib/role-middleware"

/**
 * GET /api/tenants/[tenantId] - Get tenant details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const roleCheck = await requireRole(request, ["super_admin", "admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { tenantId } = await params
    await dbConnect()
    const tenant = await Tenant.findById(tenantId).lean()
    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 })
    }
    return NextResponse.json({ tenant }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/tenants/[tenantId] - Update tenant (super_admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const roleCheck = await requireRole(request, ["super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { tenantId } = await params
    const updates = await request.json()

    await dbConnect()

    // Don't allow updating slug if it would conflict
    if (updates.slug) {
      const existingTenant = await Tenant.findOne({ slug: updates.slug, _id: { $ne: tenantId } })
      if (existingTenant) {
        return NextResponse.json({ message: "Tenant with this slug already exists" }, { status: 409 })
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(tenantId, updates, { new: true }).lean()
    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Tenant updated successfully", tenant }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/tenants/[tenantId] - Delete tenant completely (super_admin only)
 * This will delete the tenant and ALL associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const roleCheck = await requireRole(request, ["super_admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const { tenantId } = await params
    await dbConnect()

    // Verify tenant exists
    const tenant = await Tenant.findById(tenantId)
    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 })
    }

    // Import all models that reference tenantId
    const User = (await import("@/lib/models/User")).default
    const ZakatApplicant = (await import("@/lib/models/ZakatApplicant")).default
    const Grant = (await import("@/lib/models/Grant")).default
    const PaymentRecord = (await import("@/lib/models/PaymentRecord")).default
    const CaseAssignment = (await import("@/lib/models/CaseAssignment")).default
    const CaseNote = (await import("@/lib/models/CaseNote")).default
    const Conversation = (await import("@/lib/models/Conversation")).default
    const Message = (await import("@/lib/models/Message")).default
    const Notification = (await import("@/lib/models/Notification")).default
    const DocumentAudit = (await import("@/lib/models/DocumentAudit")).default
    const SharedProfile = (await import("@/lib/models/SharedProfile")).default

    // Delete all data associated with this tenant
    await Promise.all([
      // Delete users (except super_admin)
      User.deleteMany({ tenantId, role: { $ne: "super_admin" } }),
      // Delete applicants
      ZakatApplicant.deleteMany({ tenantId }),
      // Delete grants
      Grant.deleteMany({ tenantId }),
      // Delete payment records
      PaymentRecord.deleteMany({ tenantId }),
      // Delete case assignments
      CaseAssignment.deleteMany({ tenantId }),
      // Delete case notes
      CaseNote.deleteMany({ tenantId }),
      // Delete conversations
      Conversation.deleteMany({ tenantId }),
      // Delete messages
      Message.deleteMany({ tenantId }),
      // Delete notifications
      Notification.deleteMany({ tenantId }),
      // Delete document audits
      DocumentAudit.deleteMany({ tenantId }),
      // Delete shared profiles (both from and to this tenant)
      SharedProfile.deleteMany({
        $or: [{ fromTenant: tenantId }, { toTenant: tenantId }],
      }),
    ])

    // Finally, delete the tenant itself
    await Tenant.findByIdAndDelete(tenantId)

    return NextResponse.json(
      { message: "Masjid and all associated data deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting tenant:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

