"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

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
    if (emailFromQuery) handleCheckStatus()
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
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    const s = status?.toLowerCase() || ""
    if (s === "approved")
      return {
        icon: CheckCircle,
        badge: "bg-green-50 text-green-700 ring-green-600/20",
        title: "Approved",
        message: "Your application has been approved. You will receive an email shortly.",
      }
    if (s === "rejected")
      return {
        icon: XCircle,
        badge: "bg-red-50 text-red-700 ring-red-600/20",
        title: "Rejected",
        message: "Unfortunately, your application was declined. Contact support for assistance.",
      }
    return {
      icon: Clock,
      badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
      title: "Under Review",
      message: "Your application is currently under review. We will notify you via email.",
    }
  }

  const statusInfo = applicationData ? getStatusDisplay(applicationData.status) : null
  const StatusIcon = statusInfo ? statusInfo.icon : Clock

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo1.svg" alt="Rahmah Exchange" width={150} height={150} priority />
          </Link>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Secure & Confidential
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-16">
        <div className="max-w-xl mx-auto">
          {/* Card */}
          <div className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 p-6 md:p-8">
            {!applicationData && !loading && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center">
                  Application Status
                </h1>
                <p className="mt-2 text-gray-600 text-center">
                  Enter your email to track the progress of your application.
                </p>

                <form onSubmit={handleCheckStatus} className="mt-8 space-y-4">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-teal-600 text-white py-3 font-medium flex items-center justify-center gap-2 hover:bg-teal-700 disabled:opacity-50"
                  >
                    Check Status <ArrowRight size={16} />
                  </button>
                </form>

                {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
              </>
            )}

            {loading && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700">Checking your application…</p>
              </div>
            )}

            {applicationData && statusInfo && (
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ring-1 ${statusInfo.badge}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{statusInfo.title}</span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-gray-900">{statusInfo.title}</h2>
                <p className="mt-2 text-gray-600">{statusInfo.message}</p>

                <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Case ID:</span> {applicationData.caseId}</p>
                  {applicationData.applicationDate && (
                    <p><span className="font-medium">Date:</span> {applicationData.applicationDate}</p>
                  )}
                  <p><span className="font-medium">Email:</span> {applicationData.email}</p>
                </div>

                <button
                  onClick={() => {
                    setApplicationData(null)
                    setEmail("")
                  }}
                  className="mt-6 w-full rounded-xl border border-teal-600 text-teal-700 py-3 hover:bg-teal-50"
                >
                  Check Another Application
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-900 text-gray-300 text-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          © 2025 Rahmah Exchange. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
