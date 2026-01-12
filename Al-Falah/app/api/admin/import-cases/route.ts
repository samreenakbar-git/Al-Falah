import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import ZakatApplicant from "@/lib/models/ZakatApplicant"
import { requireRole } from "@/lib/role-middleware"
import { v4 as uuidv4 } from "uuid"

/**
 * POST /api/admin/import-cases - Import old/existing cases
 * Admin only endpoint for bulk importing previous applicants
 */
export async function POST(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  try {
    const body = await request.json()
    const cases = Array.isArray(body) ? body : body.cases

    if (!Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json({ message: "Cases array is required and must not be empty" }, { status: 400 })
    }

    await dbConnect()

    const importResults = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    }

    for (const caseData of cases) {
      try {
        // Check for duplicates by email or caseId
        if (caseData.email) {
          const existing = await ZakatApplicant.findOne({ email: caseData.email.toLowerCase() })
          if (existing) {
            importResults.failed++
            importResults.errors.push({
              applicant: caseData.firstName || "Unknown",
              error: "Duplicate email",
            })
            continue
          }
        }

        // Generate caseId if not provided
        const caseId = caseData.caseId || `CASE-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`

        // Create applicant record
        const applicant = await ZakatApplicant.create({
          firstName: caseData.firstName || "Unknown",
          lastName: caseData.lastName || "",
          email: caseData.email?.toLowerCase(),
          mobilePhone: caseData.mobilePhone || "",
          homePhone: caseData.homePhone,
          streetAddress: caseData.streetAddress,
          city: caseData.city,
          state: caseData.state,
          zipCode: caseData.zipCode,
          gender: caseData.gender,
          dateOfBirth: caseData.dateOfBirth ? new Date(caseData.dateOfBirth) : null,
          legalStatus: caseData.legalStatus,
          referredBy: caseData.referredBy,
          referrerPhone: caseData.referrerPhone,
          employmentStatus: caseData.employmentStatus,
          dependentsInfo: caseData.dependentsInfo,
          totalMonthlyIncome: caseData.totalMonthlyIncome ? Number(caseData.totalMonthlyIncome) : 0,
          incomeSources: caseData.incomeSources,
          rentMortgage: caseData.rentMortgage ? Number(caseData.rentMortgage) : 0,
          utilities: caseData.utilities ? Number(caseData.utilities) : 0,
          food: caseData.food ? Number(caseData.food) : 0,
          otherExpenses: caseData.otherExpenses,
          totalDebts: caseData.totalDebts ? Number(caseData.totalDebts) : 0,
          requestType: caseData.requestType || "Zakat",
          amountRequested: caseData.amountRequested ? Number(caseData.amountRequested) : 0,
          whyApplying: caseData.whyApplying,
          circumstances: caseData.circumstances,
          previousZakat: caseData.previousZakat,
          zakatResourceSource: caseData.zakatResourceSource,
          status: caseData.status || "Pending",
          caseId,
          reference1: caseData.reference1 || {},
          reference2: caseData.reference2 || {},
        })

        importResults.successful++
      } catch (error: any) {
        importResults.failed++
        importResults.errors.push({
          applicant: caseData.firstName || "Unknown",
          error: error.message,
        })
      }
    }

    return NextResponse.json(
      {
        message: "Import completed",
        results: importResults,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

/**
 * GET /api/admin/import-cases/template - Get import template
 */
export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(request, ["admin"])
  if (!roleCheck.authorized) {
    return NextResponse.json({ message: roleCheck.error }, { status: roleCheck.statusCode })
  }

  // Return sample template
  const template = [
    {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      mobilePhone: "555-0123",
      homePhone: "555-0124",
      streetAddress: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      gender: "M",
      dateOfBirth: "1990-01-15",
      legalStatus: "Citizen",
      referredBy: "Community Center",
      referrerPhone: "555-0125",
      employmentStatus: "Unemployed",
      dependentsInfo: "2 children",
      totalMonthlyIncome: 1500,
      incomeSources: "Part-time work",
      rentMortgage: 1200,
      utilities: 150,
      food: 400,
      otherExpenses: "Medical expenses",
      totalDebts: 5000,
      requestType: "Zakat",
      amountRequested: 2000,
      whyApplying: "Financial hardship",
      circumstances: "Recently lost job",
      previousZakat: "no",
      caseId: "CASE-2025-001",
      status: "Pending",
      reference1: {
        fullName: "Jane Smith",
        relationship: "Friend",
        phoneNumber: "555-0126",
        email: "jane@example.com",
      },
      reference2: {
        fullName: "Ahmed Khan",
        relationship: "Neighbor",
        phoneNumber: "555-0127",
        email: "ahmed@example.com",
      },
    },
  ]

  return NextResponse.json({ template }, { status: 200 })
}
