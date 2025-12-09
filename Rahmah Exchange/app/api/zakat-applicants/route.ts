import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { getAdminEmail, sendEmail } from "@/lib/email"
import { generateMagicLink } from "@/lib/applicant-token-utils"
import { uploadBuffer } from "@/lib/storage"
import { escapeHtml } from "@/lib/utils/html-sanitize"

// Generate unique case ID
async function generateUniqueCaseId(): Promise<string> {
  let caseId = ""
  let exists = true

  while (exists) {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "")
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    caseId = `CASE-${date}-${random}`
    exists = !!(await ZakatApplicant.exists({ caseId }))
  }

  return caseId
}

// GET all applicants (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const status = searchParams.get("status")
    const email = searchParams.get("email")
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 25

    await dbConnect()

    const filter: any = {}
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

    // Check for duplicate email
    const email = formData.get("email")?.toString()
    if (email && (await ZakatApplicant.findOne({ email }))) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    // Normalize zakatResourceSource to a string if provided (avoid saving File/null)
    const zakatResourceSourceValue = formData.get("zakatResourceSource")
      ? formData.get("zakatResourceSource")!.toString()
      : undefined

    // Check if this is an old case (skipEmail flag)
    const skipEmail = formData.get("skipEmail")?.toString() === "true"

    const applicantData: any = {
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
      caseId: await generateUniqueCaseId(),
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
          const adminEmail = getAdminEmail()
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
              <p>— Rahmah Foundation Team</p>
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
— Rahmah Foundation Team`,
          })
        }

        // Email to admin (if configured)
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
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
