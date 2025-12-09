"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Clock, Mail, ArrowRight, Heart } from "lucide-react"

const API_URL = "/api/zakat-applicants"

interface ApplicationData {
  status: string
  email: string
  caseId: string
  requestedAmount?: number
  applicationDate?: string
}

export default function ApplicationStatusPage() {
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get("email") || ""

  const [email, setEmail] = useState(emailFromQuery)
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (emailFromQuery) {
      handleCheckStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery])

  async function handleCheckStatus(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    setApplicationData(null)

    try {
      const res = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`)
      const data = await res.json()

      if (!res.ok || !data.items || !Array.isArray(data.items)) {
        throw new Error(data.error || "Invalid data from server")
      }

      const applicant = data.items.find((item: any) => item.email === email)
      if (!applicant) throw new Error("Application not found")

      setApplicationData({
        status: applicant.status,
        email: applicant.email,
        caseId: applicant.caseId || applicant._id,
        requestedAmount: applicant.amountRequested,
        applicationDate: applicant.createdAt
          ? new Date(applicant.createdAt).toLocaleDateString()
          : "",
      })
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    const statusLower = status?.toLowerCase() || ""

    if (statusLower === "approved") {
      return {
        icon: CheckCircle,
        color: "text-green-600",
        title: "Approved",
        message: "Your application has been approved. You will receive an email shortly.",
      }
    } else if (statusLower === "rejected") {
      return {
        icon: XCircle,
        color: "text-red-600",
        title: "Rejected",
        message: "Unfortunately, your application was declined. Contact support for help.",
      }
    } else {
      return {
        icon: Clock,
        color: "text-amber-600",
        title: "Under Review",
        message: "Your application is being reviewed. You will be notified via email.",
      }
    }
  }

  const statusInfo = applicationData ? getStatusDisplay(applicationData.status) : null
  const StatusIcon = statusInfo ? statusInfo.icon : Clock

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
     <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
      <Image
                  src="/logo1.svg"
                  alt="Rahmah Exchange Logo"
                  width={170}
                  height={170}
                  priority
                  />
          </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {!applicationData && !loading && (
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">Check Your Application Status</h2>
            <form onSubmit={handleCheckStatus} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? "Checking..." : "Check Status"} <ArrowRight size={16} />
              </button>
            </form>
            {error && (
              <p className="mt-4 text-red-600 text-sm text-center">{error}</p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">Checking your application...</p>
          </div>
        )}

        {applicationData && statusInfo && (
          <div className="w-full max-w-md text-center space-y-4">
            <StatusIcon size={48} className={`mx-auto ${statusInfo.color}`} />
            <h2 className="text-2xl font-bold">{statusInfo.title}</h2>
            <p className="text-gray-700">{statusInfo.message}</p>
            <div className="text-gray-600 text-sm">
              <p>Case ID: {applicationData.caseId}</p>
              {/* {applicationData.requestedAmount && <p>Amount: PKR {applicationData.requestedAmount.toLocaleString()}</p>} */}
              {applicationData.applicationDate && <p>Date: {applicationData.applicationDate}</p>}
              <p>Email: {applicationData.email}</p>
            </div>
            <button
              onClick={() => {
                setApplicationData(null)
                setEmail("")
              }}
              className="mt-4 w-full py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50"
            >
              Check Another Application
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 bg-gray-900 text-white text-center text-sm">
        2025 Rahmah Exchange. All rights reserved.
      </footer>
    </div>
  )
}
