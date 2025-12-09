"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const run = async () => {
      const encodedToken = searchParams.get("token")

      if (!encodedToken) {
        setError("No access token provided. Please use the link from your email.")
        setLoading(false)
        return
      }

      // Decode the token from URL encoding
      let token: string
      try {
        token = decodeURIComponent(encodedToken)
      } catch {
        setError("Invalid token format. Please request a new link by submitting the form again.")
        setLoading(false)
        return
      }

      // Verify token server-side via API to avoid bundling server-only JWT library in the browser
      try {
        const res = await fetch(`/api/applicant-token/verify?token=${encodeURIComponent(token)}`)
        const json = await res.json()
        if (!res.ok || !json?.applicantId) {
          setError("Invalid or expired access token. Please request a new link by submitting the form again.")
          setLoading(false)
          return
        }

        const decoded = { applicantId: json.applicantId }

        // Store token in sessionStorage for portal access
        if (typeof window !== "undefined") {
          sessionStorage.setItem("applicantToken", token)
          sessionStorage.setItem("applicantId", decoded.applicantId)
        }

        setSuccess(true)
        setLoading(false)

        // Redirect to portal after 2 seconds
        setTimeout(() => {
          router.push(`/applicant-portal/${decoded.applicantId}`)
        }, 2000)
        return
      } catch (e) {
        setError("Token verification failed. Please try again later.")
        setLoading(false)
        return
      }
    }

    run()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your access...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Access Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Verified!</h2>
          <p className="text-gray-600 mb-4">Redirecting to your portal...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return null
}

export default function ApplicantPortalLogin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
