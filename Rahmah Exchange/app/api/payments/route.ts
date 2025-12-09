import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import PaymentRecord from "@/lib/models/PaymentRecord"
import Grant from "@/lib/models/Grant"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { requireRole } from "@/lib/role-middleware"
import { sendEmail } from "@/lib/email"
import { uploadBuffer } from "@/lib/storage"

/**
 * GET /api/payments - List all payments
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const filter: any = {}
    if (status) filter.status = status

    const payments = await PaymentRecord.find(filter)
      .populate("applicantId", "firstName lastName caseId email")
      .populate("grantId", "grantedAmount")
      .sort({ createdAt: -1 })

    const stats = {
      total: 0,
      completed: 0,
      pending: 0,
    }

    payments.forEach((p: any) => {
      stats.total += p.amount
      if (p.status === "completed") stats.completed += p.amount
      if (p.status === "pending") stats.pending += p.amount
    })

    return NextResponse.json({ payments, stats }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/payments - Record new payment
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin", "treasurer"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const formData = await request.formData()
    const grantId = formData.get("grantId") as string
    const amount = Number(formData.get("amount"))
    const paymentMethod = formData.get("paymentMethod") as string
    const transactionId = formData.get("transactionId") as string
    const checkNumber = formData.get("checkNumber") as string
    const paymentDate = formData.get("paymentDate") as string
    const remarks = formData.get("remarks") as string
    const proofFile = formData.get("proof") as File | null

    if (!grantId || !amount || !paymentMethod || !paymentDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    await dbConnect()

    const grant = await Grant.findById(grantId).populate("applicantId")
    if (!grant) {
      return NextResponse.json({ message: "Grant not found" }, { status: 404 })
    }

    let proofOfPayment = null
    if (proofFile && proofFile.size > 0) {
      const buffer = Buffer.from(await proofFile.arrayBuffer())
      const blob = await uploadBuffer(buffer, proofFile.name, new URL(request.url).origin)
      proofOfPayment = {
        filename: blob.pathname,
        originalname: proofFile.name,
        url: blob.url,
        uploadedAt: new Date(),
      }
    }

    const payment = await PaymentRecord.create({
      grantId,
      applicantId: grant.applicantId._id,
      amount,
      paymentMethod,
      transactionId,
      checkNumber,
      paymentDate: new Date(paymentDate),
      proofOfPayment,
      remarks,
      status: "completed",
      approvedBy: roleCheck.user?._id,
    })

    // Send confirmation email to applicant
    const applicant = grant.applicantId as any
    if (applicant.email) {
      await sendEmail({
        to: applicant.email,
        subject: "Your Zakat Grant Payment Confirmation",
        html: `
          <p>Dear ${applicant.firstName},</p>
          <p>Your approved Zakat grant of $${grant.grantedAmount} has been processed and sent.</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Amount: $${amount}</li>
            <li>Payment Method: ${paymentMethod}</li>
            <li>Date: ${new Date(paymentDate).toLocaleDateString()}</li>
            ${transactionId ? `<li>Transaction ID: ${transactionId}</li>` : ""}
          </ul>
          <p>Thank you for your patience.</p>
        `,
      })
    }

    await payment.populate("applicantId").populate("grantId")

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
