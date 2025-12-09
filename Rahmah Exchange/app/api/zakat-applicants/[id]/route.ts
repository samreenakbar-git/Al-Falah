// import { NextRequest, NextResponse } from "next/server"
// import { dbConnect } from "@/lib/db"
// import ZakatApplicant from "@/lib/models/ZakatApplicant"
// import { authenticateRequest } from "@/lib/auth-middleware"

// // GET by ID – public
// export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     const { id } = await params
//     await dbConnect()
//     const applicant = await ZakatApplicant.findById(id)
//     if (!applicant) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })
//     return NextResponse.json(applicant)
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// // PUT – requires auth
// export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     const { id } = await params
//     const { error } = await authenticateRequest(request)
//     if (error) return NextResponse.json({ message: error }, { status: 401 })

//     const body = await request.json()
//     await dbConnect()

//     // Prevent duplicate email
//     if (body.email) {
//       const existing = await ZakatApplicant.findOne({ email: body.email, _id: { $ne: id } })
//       if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 })
//     }

//     const updated = await ZakatApplicant.findByIdAndUpdate(id, body, { new: true, runValidators: true })
//     if (!updated) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

//     return NextResponse.json({ message: "Applicant updated successfully", applicant: updated })
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// // DELETE – requires auth
// export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     const { id } = await params
//     const { error } = await authenticateRequest(request)
//     if (error) return NextResponse.json({ message: error }, { status: 401 })

//     await dbConnect()
//     const deleted = await ZakatApplicant.findByIdAndDelete(id)
//     if (!deleted) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

//     return NextResponse.json({ message: "Applicant deleted successfully" })
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }
import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import DocumentAudit from "@/lib/models/DocumentAudit"
import { authenticateRequest } from "@/lib/auth-middleware"
import { escapeHtml, nl2br } from "@/lib/utils/html-sanitize"
import { verifyApplicantToken } from "@/lib/applicant-token-utils"
import { sendEmail } from "@/lib/email"
import User from "@/lib/models/User"
import CaseAssignment from "@/lib/models/CaseAssignment"
import CaseNote from "@/lib/models/CaseNote"

// GET by ID – supports both public access and applicant portal access with token
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = new URL(request.url).searchParams.get("token")

    // If token is provided, verify applicant access
    if (token) {
      const decoded = verifyApplicantToken(token)
      if (!decoded || decoded.applicantId !== id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    await dbConnect()
    const applicant = await ZakatApplicant.findById(id)
    if (!applicant) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

    // If token was used, also return document logs
    if (token) {
      const documentLogs = await DocumentAudit.find({ applicantId: id }).sort({ createdAt: -1 })
      return NextResponse.json({ applicant, documentLogs }, { status: 200 })
    }

    return NextResponse.json(applicant)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT – requires auth (only caseworker and admin can edit applicant data)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error } = await authenticateRequest(request)
    if (error || !user) return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 })

    // Parse body first to check what fields are being updated
    const body = await request.json()
    await dbConnect()

    // Restrict editing to only caseworker and admin
    // BUT allow approvers to update ONLY the status field (needed for grant approvals)
    const bodyKeys = Object.keys(body)
    const isOnlyStatusUpdate = bodyKeys.length === 1 && bodyKeys[0] === "status"
    
    if (user.role !== "caseworker" && user.role !== "admin") {
      // Approvers can only update status, not other applicant data
      if (user.role === "approver" && isOnlyStatusUpdate) {
        // Allow approver to update status only
      } else {
        return NextResponse.json({ 
          message: "Only caseworkers and admins can edit applicant data" 
        }, { status: 403 })
      }
    }

    // Prevent duplicate email
    if (body.email) {
      const existing = await ZakatApplicant.findOne({ email: body.email, _id: { $ne: id } })
      if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    const currentApplicant = await ZakatApplicant.findById(id)
    if (!currentApplicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 })
    }
    
    const statusChanged = currentApplicant && body.status && currentApplicant.status !== body.status
    const previousStatus = currentApplicant.status
    const newStatus = body.status

    // Don't overwrite documents if they're not provided in the body
    // Documents should be managed separately via the documents API
    const updateBody = { ...body }
    // Only preserve documents if they're explicitly provided and not empty
    // If documents field is missing or is an empty array, don't include it in the update
    if (!updateBody.hasOwnProperty('documents') || (Array.isArray(updateBody.documents) && updateBody.documents.length === 0)) {
      // Preserve existing documents by not including documents in the update
      delete updateBody.documents
    }

    const updated = await ZakatApplicant.findByIdAndUpdate(id, updateBody, { new: true, runValidators: true })
    if (!updated) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

    // Send emails based on status changes
    if (statusChanged) {
      // Email to applicant if approved or rejected
      if (updated.email && (newStatus === "Approved" || newStatus === "Rejected")) {
        const isApproved = newStatus === "Approved"
        const subject = isApproved ? "Your Rahmah Application - Approved" : "Your Rahmah Application - Update"
        
        // Get approval amount from approval notes if approved
        let approvalAmount: number | null = null
        if (isApproved) {
          try {
            const latestApprovalNote = await CaseNote.findOne({
              caseId: updated.caseId || id,
              noteType: "approval_note",
              authorRole: "approver",
              approvalAmount: { $exists: true, $ne: null }
            }).sort({ createdAt: -1 }).lean()
            
            if (latestApprovalNote && (latestApprovalNote as any).approvalAmount) {
              approvalAmount = (latestApprovalNote as any).approvalAmount
            }
          } catch (err) {
            console.error("[email] Failed to fetch approval amount:", err)
          }
        }
        
        const htmlContent = generateStatusEmailTemplate(updated, isApproved, approvalAmount)

        await sendEmail({
          to: updated.email,
          subject,
          html: htmlContent,
        }).catch((err) => console.error("[email] Failed to send to applicant:", err))
      }

      // If approver approved → email treasurer
      if (user.role === "approver" && newStatus === "Approved") {
        try {
          const treasurers = await User.find({ role: "treasurer", isActive: true }).lean()
          
          if (treasurers.length > 0) {
            const baseUrl = new URL(request.url).origin
            const caseUrl = `${baseUrl}/staff/cases/${id}`
            
            // Get latest approval note with approval amount
            const latestApprovalNote = await CaseNote.findOne({
              caseId: updated.caseId || id,
              noteType: "approval_note",
              authorRole: "approver",
              approvalAmount: { $exists: true, $ne: null }
            }).sort({ createdAt: -1 }).lean()

            // Get all approval notes for display
            const approvalNotes = await CaseNote.find({
              caseId: updated.caseId || id,
              noteType: "approval_note",
              authorRole: "approver"
            }).sort({ createdAt: -1 }).limit(5).lean()

            // Get approval amount from latest note
            const approvalAmount = latestApprovalNote && (latestApprovalNote as any).approvalAmount 
              ? (latestApprovalNote as any).approvalAmount 
              : null

            // Approval amount display - prominently shown
            const approvalAmountHtml = approvalAmount
              ? `<div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: center;">
                  <p style="margin: 0; font-weight: bold; color: #065f46; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Approved Amount</p>
                  <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #10b981;">$${approvalAmount.toLocaleString()}</p>
                </div>`
              : ''

            const notesHtml = approvalNotes.length > 0
              ? `<div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin-top: 0; color: #0d9488;">Approval Notes:</h3>
                  ${approvalNotes.map((note: any) => {
                    const safeContent = nl2br(note.content || '')
                    const safeAuthorName = escapeHtml(note.authorName || 'Approver')
                    return `
                    <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e7ff;">
                      ${note.approvalAmount ? `<p style="margin: 0; font-weight: bold; color: #0d9488;">Approval Amount: $${note.approvalAmount.toLocaleString()}</p>` : ''}
                      <p style="margin: 5px 0 0 0;">${safeContent}</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">By ${safeAuthorName} on ${new Date(note.createdAt).toLocaleDateString()}</p>
                    </div>
                  `
                  }).join('')}
                </div>`
              : ''

            for (const treasurer of treasurers) {
              const treasurerEmail = (treasurer as any).internalEmail || (treasurer as any).email
              if (treasurerEmail) {
                await sendEmail({
                  to: treasurerEmail,
                  subject: `Case Approved - Payment Approval Required: ${updated.caseId || id}`,
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="UTF-8">
                        <style>
                          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                          .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
                          .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
                          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                          strong { color: #0d9488; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>Case Approved - Payment Approval Required</h1>
                          </div>
                          <div class="content">
                            <p>Dear ${(treasurer as any).name || 'Treasurer'},</p>
                            <p>A case has been <strong>approved</strong> by an approver and requires your review for payment approval.</p>
                            
                            <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0d9488;">
                              <p><strong>Case Details:</strong></p>
                              <ul style="margin: 10px 0; padding-left: 20px;">
                                <li><strong>Case ID:</strong> ${updated.caseId || id}</li>
                                <li><strong>Applicant:</strong> ${updated.firstName || ''} ${updated.lastName || ''}</li>
                                <li><strong>Email:</strong> ${updated.email || 'N/A'}</li>
                                <li><strong>Amount Requested:</strong> $${updated.amountRequested || 'N/A'}</li>
                              </ul>
                            </div>

                            ${approvalAmountHtml}

                            ${notesHtml}

                            <p>Please review the case and approve the payment when ready.</p>
                            <p><a href="${caseUrl}" class="button">Review Case</a></p>
                            
                            <p>Thank you for your attention.</p>
                            <p>Warm regards,<br><strong>Rahmah Exchange System</strong></p>
                            <div class="footer">
                              <p>© 2025 Rahmah Exchange. All rights reserved.</p>
                              <p>This is an automated message. Please do not reply to this email.</p>
                            </div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `,
                }).catch((err) => console.error(`[email] Failed to send to treasurer ${treasurerEmail}:`, err))
              }
            }
          }
        } catch (err) {
          console.error("[email] Failed to send treasurer notification:", err)
        }
      }

      // If case is rejected → email caseworker(s) with notes
      if (newStatus === "Rejected") {
        try {
          // Find caseworkers assigned to this case
          const assignments = await CaseAssignment.find({
            applicantId: id,
            status: { $in: ["pending", "accepted", "active"] }
          }).populate("assignedTo", "name email internalEmail").lean()

          // Get rejection notes
          const rejectionNotes = await CaseNote.find({
            caseId: updated.caseId || id,
            noteType: { $in: ["decision", "internal_note", "approval_note"] },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Notes from last 24 hours
          }).sort({ createdAt: -1 }).limit(10).lean()

          const notesHtml = rejectionNotes.length > 0
            ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin-top: 0; color: #dc2626;">Rejection Notes:</h3>
                ${rejectionNotes.map((note: any) => `
                  <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #fecaca;">
                    <p style="margin: 0; font-weight: bold;">${note.title || 'Note'}</p>
                    <p style="margin: 5px 0 0 0;">${note.content || ''}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">By ${note.authorName || note.authorRole || 'Staff'} on ${new Date(note.createdAt).toLocaleDateString()}</p>
                  </div>
                `).join('')}
              </div>`
            : '<p style="color: #6b7280; font-style: italic;">No notes available for this rejection.</p>'

          // Send to assigned caseworkers
          const caseworkerEmails = new Set<string>()
          for (const assignment of assignments) {
            const caseworker = (assignment as any).assignedTo
            if (caseworker) {
              const email = caseworker.internalEmail || caseworker.email
              if (email) caseworkerEmails.add(email)
            }
          }

          // If no assigned caseworkers, send to all active caseworkers
          if (caseworkerEmails.size === 0) {
            const allCaseworkers = await User.find({ role: "caseworker", isActive: true }).lean()
            for (const cw of allCaseworkers) {
              const email = (cw as any).internalEmail || (cw as any).email
              if (email) caseworkerEmails.add(email)
            }
          }

          const baseUrl = new URL(request.url).origin
          const caseUrl = `${baseUrl}/staff/cases/${id}`

          for (const email of caseworkerEmails) {
            await sendEmail({
              to: email,
              subject: `Case Rejected: ${updated.caseId || id} - ${updated.firstName || ''} ${updated.lastName || ''}`,
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                      .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
                      .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
                      .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                      strong { color: #dc2626; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Case Rejected</h1>
                      </div>
                      <div class="content">
                        <p>Dear Caseworker,</p>
                        <p>A case you are assigned to has been <strong>rejected</strong>.</p>
                        
                        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
                          <p><strong>Case Details:</strong></p>
                          <ul style="margin: 10px 0; padding-left: 20px;">
                            <li><strong>Case ID:</strong> ${updated.caseId || id}</li>
                            <li><strong>Applicant:</strong> ${updated.firstName || ''} ${updated.lastName || ''}</li>
                            <li><strong>Email:</strong> ${updated.email || 'N/A'}</li>
                            <li><strong>Amount Requested:</strong> $${updated.amountRequested || 'N/A'}</li>
                            <li><strong>Previous Status:</strong> ${previousStatus || 'N/A'}</li>
                            <li><strong>New Status:</strong> <strong style="color: #dc2626;">Rejected</strong></li>
                          </ul>
                        </div>

                        ${notesHtml}

                        <p>Please review the case and notes for more information.</p>
                        <p><a href="${caseUrl}" class="button">View Case</a></p>
                        
                        <p>Thank you for your attention.</p>
                        <p>Warm regards,<br><strong>Rahmah Exchange System</strong></p>
                        <div class="footer">
                          <p>© 2025 Rahmah Exchange. All rights reserved.</p>
                          <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            }).catch((err) => console.error(`[email] Failed to send to caseworker ${email}:`, err))
          }
        } catch (err) {
          console.error("[email] Failed to send caseworker notification:", err)
        }
      }
    }

    return NextResponse.json({ message: "Applicant updated successfully", applicant: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE – requires auth
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await authenticateRequest(request)
    if (error) return NextResponse.json({ message: error }, { status: 401 })

    await dbConnect()
    const deleted = await ZakatApplicant.findByIdAndDelete(id)
    if (!deleted) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

    return NextResponse.json({ message: "Applicant deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateStatusEmailTemplate(applicant: any, isApproved: boolean, approvalAmount: number | null = null): string {
  const firstName = applicant.firstName || "Applicant"
  const caseId = applicant.caseId || "N/A"
  const amountRequested = applicant.amountRequested || "N/A"

  if (isApproved) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .amount-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
            .amount-value { font-size: 24px; font-weight: bold; color: #10b981; margin: 10px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            strong { color: #0d9488; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Good News!</h1>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <p>We are pleased to inform you that your application for assistance has been <strong>approved</strong>.</p>
              <div class="success-badge">✓ APPROVED</div>
              <p><strong>Application Details:</strong></p>
              <ul>
                <li><strong>Case ID:</strong> ${caseId}</li>
                <li><strong>Amount Requested:</strong> $${amountRequested}</li>
              </ul>
              ${approvalAmount ? `
                <div class="amount-box">
                  <p style="margin: 0; font-weight: bold; color: #065f46;">Approved Amount:</p>
                  <div class="amount-value">$${approvalAmount.toLocaleString()}</div>
                </div>
              ` : ''}
              <p><strong>Great news!</strong> Your case has been approved and payment will be released to you soon. Our team will be in touch with you shortly with next steps regarding your grant.</p>
              <p>If you have any questions, please don't hesitate to reach out.</p>
              <p>Thank you for choosing Rahmah Exchange.</p>
              <p>Warm regards,<br><strong>Rahmah Support Team</strong></p>
              <div class="footer">
                <p>© 2025 Rahmah Exchange. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  } else {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            strong { color: #6366f1; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Status Update</h1>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <p>Thank you for submitting your application for assistance. After careful review, we regret to inform you that your application has been <strong>rejected</strong> at this time.</p>
              <p><strong>Application Details:</strong></p>
              <ul>
                <li><strong>Case ID:</strong> ${caseId}</li>
                <li><strong>Amount Requested:</strong> $${amountRequested}</li>
              </ul>
              <p>This decision was made based on our review criteria and available resources. We appreciate your understanding and encourage you to apply again in the future if your circumstances change.</p>
              <p>If you have any questions about this decision, our support team is here to help.</p>
              <p>Thank you for your patience.</p>
              <p>Warm regards,<br><strong>Rahmah Support Team</strong></p>
              <div class="footer">
                <p>© 2025 Rahmah Exchange. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }
}
