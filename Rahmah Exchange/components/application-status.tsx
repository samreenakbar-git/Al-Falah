"use client"
import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"

interface ApplicationData {
  caseId: string
  status: string
  createdAt: string
  firstName: string
  lastName: string
  email: string
  requestType: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function ApplicationStatus({ email }: { email: string }) {
  const [data, setData] = useState<ApplicationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApplicant = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE_URL}/api/zakat-applicants?q=${encodeURIComponent(email)}`)

        const result = await res.json()

        let applicantData = null

        if (Array.isArray(result) && result.length > 0) {
          // If API returns array directly
          applicantData = result[0]
        } else if (result?.data && Array.isArray(result.data)) {
          // If API returns { data: [...] }
          applicantData = result.data[0]
        } else if (result?.items && Array.isArray(result.items)) {
          // If API returns { items: [...] }
          applicantData = result.items[0]
        } else if (result?.data && typeof result.data === "object") {
          // If API returns { data: {...} } (single object)
          applicantData = result.data
        } else if (typeof result === "object" && !Array.isArray(result)) {
          // If API returns object directly
          applicantData = result
        }

        if (applicantData) {
          setData(applicantData)
        } else {
          setError("Application data not found. Please check if you've submitted an application or try again later.")
        }
      } catch (err) {
        console.error("Error fetching applicant:", err)
        setError("Failed to fetch application status. Please check your connection and try again.")
      } finally {
        setLoading(false)
      }
    }

    if (email && email.trim()) {
      fetchApplicant()
    } else {
      setError("No email provided")
      setLoading(false)
    }
  }, [email])

  if (loading) {
    return <p className="text-gray-600">Loading application details... ⏳</p>
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <p className="text-red-800 font-semibold">Unable to load application</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
        <p className="text-yellow-800">No application data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Application Status</h1>

      <div className="mb-8 pb-8 border-b border-gray-200">
        <p className="text-gray-600 text-sm font-medium mb-2">Current Status</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <span className="text-blue-700 font-semibold text-sm">{data.status || "Submitted"}</span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Application Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Case ID</p>
            <p className="text-gray-900 font-semibold">{data.caseId || "N/A"}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm mb-1">Submitted Date</p>
            <p className="text-gray-900 font-semibold">
              {data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-GB") : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-gray-600 text-sm mb-1">Applicant Name</p>
            <p className="text-gray-900 font-semibold">
              {data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-gray-600 text-sm mb-1">Email</p>
            <p className="text-gray-900 font-semibold">{data.email || "N/A"}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm mb-1">Request Type</p>
            <p className="text-gray-900 font-semibold">{data.requestType || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-900 text-sm">Your application has been received and is pending review.</p>
      </div>
    </div>
  )
}
