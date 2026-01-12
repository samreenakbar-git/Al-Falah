import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { sendEmail } from "@/lib/email"
import { getTenantEmail } from "@/lib/tenant-email"
import { generateMagicLink } from "@/lib/applicant-token-utils"
import { uploadBuffer } from "@/lib/storage"
import { escapeHtml } from "@/lib/utils/html-sanitize"
import { getTenantFilter } from "@/lib/tenant-middleware"
import { authenticateRequest } from "@/lib/auth-middleware"
import User from "@/lib/models/User"

// Generate unique case ID per tenant
async function generateUniqueCaseId(tenantId: string): Promise<string> {
  let caseId = ""
  let exists = true

  while (exists) {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "")
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    caseId = `CASE-${date}-${random}`
    exists = !!(await ZakatApplicant.exists({ tenantId, caseId }))
  }

  return caseId
}

// GET all applicants - filtered by tenant for authenticated users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const status = searchParams.get("status")
    const email = searchParams.get("email")
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 25

    await dbConnect()

    // Authenticate request - required for all GET requests
    let tenantFilter: { tenantId?: string } = {}
    let userRole: string | null = null
    
    try {
      // Authenticate to get user info
      const { user, error } = await authenticateRequest(request)
      
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
      }
      
      userRole = user.role
      
      // Check if tenantId is provided in query params (for super admin filtering)
      const tenantIdParam = searchParams.get("tenantId")
      
      // Handle tenant filtering based on user role
      if (userRole === "super_admin") {
        // Super admin can see all applicants, or filter by tenantId if provided
        if (tenantIdParam) {
          tenantFilter = { tenantId: tenantIdParam }
        } else {
          // No tenantId param = show all applicants (empty filter)
          tenantFilter = {}
        }
      } else {
        // Regular users (admin, caseworker, etc.) must have tenantId
        try {
          tenantFilter = await getTenantFilter(request)
        } catch (tenantError: any) {
          console.error("Error getting tenant filter:", tenantError)
          return NextResponse.json({ 
            error: "Access denied - User is not associated with a masjid" 
          }, { status: 403 })
        }
        
        // For non-super_admin users, tenantFilter MUST have tenantId
        if (!tenantFilter.tenantId) {
          console.error("User is not super_admin but has no tenantId filter:", { 
            userId: user._id, 
            role: userRole, 
            tenantId: user.tenantId 
          })
          return NextResponse.json({ 
            error: "Access denied - User is not associated with a masjid" 
          }, { status: 403 })
        }
      }
      
    } catch (authError: any) {
      // If authentication fails, require authentication
      console.error("Authentication error in GET applicants:", authError)
      return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
    }
    
    // Log the filter being applied (for debugging)
    console.log("Tenant filter applied:", tenantFilter, "User role:", userRole)

    const filter: any = { ...tenantFilter }
    if (status) filter.status = status
    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { mobilePhone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { caseId: { $regex: q, $options: "i" } },
      ]
    }

    const skip = (page - 1) * limit
    const applicants = await ZakatApplicant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    const total = await ZakatApplicant.countDocuments(filter)

    return NextResponse.json({ items: applicants, total, page, limit })
  } catch (error: any) {
    console.error("GET all error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST – Create new applicant (public)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const uploadedFiles = formData.getAll("documents") as any[]
    console.log(" POST received", uploadedFiles.length, "files")

    const documentMetadata: any[] = []

    for (const f of uploadedFiles) {
      if (f && typeof f === "object" && typeof f.arrayBuffer === "function") {
        const originalName = (f as any).name || `upload-${Date.now()}`
        const buffer = Buffer.from(await (f as any).arrayBuffer())

        try {
          const blob = await uploadBuffer(buffer, originalName, new URL(request.url).origin)

          console.log(" File uploaded:", blob.pathname, blob.url)

          // Store metadata in database
          documentMetadata.push({
            filename: blob.pathname,
            originalname: originalName,
            mimeType: f.type || "application/octet-stream",
            size: buffer.length,
            url: blob.url,
            uploadedAt: new Date(),
          })
        } catch (err) {
          console.error(" File upload error:", err)
        }
      } else {
        console.warn(" Received non-File object:", f)
      }
    }

    console.log(" Documents to save:", documentMetadata.length)

    await dbConnect()

    // Parse references if sent as JSON strings
    let reference1, reference2
    try {
      reference1 = formData.get("reference1") ? JSON.parse(formData.get("reference1")!.toString()) : undefined
    } catch {}
    try {
      reference2 = formData.get("reference2") ? JSON.parse(formData.get("reference2")!.toString()) : undefined
    } catch {}

    // Get tenantId - from form data, query param, or authenticated user
    let tenantId: string | null = null
    
    // Try to get from authenticated user first
    try {
      const { user } = await authenticateRequest(request)
      if (user?.tenantId) {
        tenantId = user.tenantId.toString()
      }
    } catch {}

    // If not from user, try form data or query param (for public submissions)
    if (!tenantId) {
      tenantId = formData.get("tenantId")?.toString() || new URL(request.url).searchParams.get("tenantId") || null
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 })
    }

    // Verify tenant exists
    const Tenant = (await import("@/lib/models/Tenant")).default
    const tenant = await Tenant.findById(tenantId)
    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: "Invalid or inactive tenant" }, { status: 400 })
    }

    // Check for duplicate email within tenant
    const email = formData.get("email")?.toString()
    if (email && (await ZakatApplicant.findOne({ email, tenantId }))) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    // Normalize zakatResourceSource to a string if provided (avoid saving File/null)
    const zakatResourceSourceValue = formData.get("zakatResourceSource")
      ? formData.get("zakatResourceSource")!.toString()
      : undefined

    // Check if this is an old case (skipEmail flag)
    const skipEmail = formData.get("skipEmail")?.toString() === "true"

    const applicantData: any = {
      tenantId,
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      streetAddress: formData.get("streetAddress"),
      city: formData.get("city"),
      state: formData.get("state"),
      zipCode: formData.get("zipCode"),
      gender: formData.get("gender"),
      dateOfBirth: formData.get("dateOfBirth"),
      mobilePhone: formData.get("mobilePhone"),
      homePhone: formData.get("homePhone"),
      email,
      legalStatus: formData.get("legalStatus"),
      referredBy: formData.get("referredBy"),
      referrerPhone: formData.get("referrerPhone"),
      employmentStatus: formData.get("employmentStatus"),
      dependentsInfo: formData.get("dependentsInfo"),
      totalMonthlyIncome: formData.get("totalMonthlyIncome") ? Number(formData.get("totalMonthlyIncome")) : undefined,
      incomeSources: formData.get("incomeSources"),
      rentMortgage: formData.get("rentMortgage") ? Number(formData.get("rentMortgage")) : undefined,
      utilities: formData.get("utilities") ? Number(formData.get("utilities")) : undefined,
      food: formData.get("food") ? Number(formData.get("food")) : undefined,
      otherExpenses: formData.get("otherExpenses"),
      totalDebts: formData.get("totalDebts") ? Number(formData.get("totalDebts")) : undefined,
      requestType: formData.get("requestType") || "Zakat",
      amountRequested: formData.get("amountRequested") ? Number(formData.get("amountRequested")) : undefined,
      whyApplying: formData.get("whyApplying"),
      circumstances: formData.get("circumstances"),
      previousZakat: formData.get("previousZakat"),
      zakatResourceSource: zakatResourceSourceValue,
      reference1,
      reference2,
      documents: documentMetadata,
      caseId: await generateUniqueCaseId(tenantId),
      isOldCase: skipEmail, // Store flag to indicate this is an old case
    }

    const applicant = new ZakatApplicant(applicantData)
    await applicant.save()

    console.log(" Applicant saved with", applicant.documents.length, "documents")
    console.log("Saved zakatResourceSource:", applicant.zakatResourceSource)

    // Fire-and-forget emails (do not block success) - skip if skipEmail is true
    if (!skipEmail) {
      ;(async () => {
        try {
          const baseUrl = new URL(request.url).origin
          // Get admin email from tenant (not from env)
          const adminEmail = await getTenantEmail(tenantId)

          // Also get all active staff for this masjid (tenant)
          const staffUsers = await User.find({
            tenantId,
            role: { $in: ["admin", "caseworker", "approver", "treasurer"] },
            isActive: true,
          }).lean()

          const staffEmails = staffUsers
            .map((u: any) => u.email)
            .filter(Boolean) as string[]

          // Unique list of admin + staff emails for masjid notifications
          const masjidNotificationEmails = Array.from(
            new Set([adminEmail, ...staffEmails].filter(Boolean)),
          ) as string[]
          const magicLink = generateMagicLink(applicant._id.toString(), baseUrl)
          
          console.log(`Generated magic link for applicant ${applicant._id.toString()}: ${magicLink}`)

          // Email to applicant (if email provided)
          if (applicant.email) {
          await sendEmail({
            to: applicant.email,
            subject: `We received your application (Case ID: ${applicant.caseId})`,
            html: `
              <p>Assalamu Alaikum ${escapeHtml(applicant.firstName || "")},</p>
              <p>We have received your Zakat assistance application.</p>
              <p><strong>Case ID:</strong> ${applicant.caseId}</p>
              <p>You can access your application portal and upload additional documents using the link below:</p>
              <p><a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Access Your Portal</a></p>
              <p>This link will allow you to:</p>
              <ul>
                <li>View your application status</li>
                <li>Upload missing or additional documents</li>
              </ul>
              <p>We will review your application and get back to you. JazakAllahu Khairan.</p>
              <p>— Rahmah Exchange Team</p>
            `,
            text: `Assalamu Alaikum ${applicant.firstName || ""},

We have received your Zakat assistance application.
Case ID: ${applicant.caseId}

You can access your application portal and upload additional documents using this link:
${magicLink}

This link will allow you to:
- View your application status
- Upload missing or additional documents

We will review your application and get back to you. JazakAllahu Khairan.
— Rahmah Exchange Team`,
          })
        }

        // Email to admin + their masjid staff (if configured)
        if (masjidNotificationEmails.length > 0) {
          await sendEmail({
            to: masjidNotificationEmails,
            subject: `New Zakat application received: ${applicant.caseId}`,
            html: `
              <p>A new Zakat application has been submitted.</p>
              <ul>
                <li><strong>Case ID:</strong> ${applicant.caseId}</li>
                <li><strong>Name:</strong> ${[applicant.firstName, applicant.lastName].filter(Boolean).join(" ")}</li>
                <li><strong>Email:</strong> ${applicant.email || "-"}</li>
                <li><strong>Phone:</strong> ${applicant.mobilePhone || "-"}</li>
                <li><strong>Request Type:</strong> ${applicant.requestType || "-"}</li>
                <li><strong>Submitted At:</strong> ${new Date(applicant.createdAt).toLocaleString()}</li>
              </ul>
            `,
            text: `New Zakat application received:
- Case ID: ${applicant.caseId}
- Name: ${[applicant.firstName, applicant.lastName].filter(Boolean).join(" ")}
- Email: ${applicant.email || "-"}
- Phone: ${applicant.mobilePhone || "-"}
- Request Type: ${applicant.requestType || "-"}
- Submitted At: ${new Date(applicant.createdAt).toISOString()}
`,
          })
        }
      } catch (e) {
        console.error("Background email send failed:", e)
      }
      })().catch(() => {})
    } else {
      console.log("Skipping email notifications (old case)")
    }

    return NextResponse.json({ message: "Application saved successfully", applicant }, { status: 201 })
  } catch (error: any) {
    console.error("POST error:", error)
    if (error.code === 11000 && error.keyPattern?.email) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
