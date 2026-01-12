"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Image from "next/image"
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"

function SetupPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()

  // ✅ MUST match folder name: [masjidSlug]
  const tenantSlug = params.masjidSlug as string

  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setError("No invitation token provided")
      setLoading(false)
      return
    }

    setToken(tokenParam)
    verifyToken(tokenParam)
  }, [searchParams])

  const verifyToken = async (tokenValue: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/setup-password?token=${encodeURIComponent(tokenValue)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Invalid or expired invitation link")
        setTokenValid(false)
        return
      }

      setUserInfo(data.user)
      setTokenValid(true)
    } catch {
      setError("Failed to verify invitation link")
      setTokenValid(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/admin/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Failed to set password")
        return
      }

      setSuccess(true)

      // ✅ SLUG-BASED REDIRECT
      setTimeout(() => {
        router.push(`/${tenantSlug}/staff/login?message=Password set successfully. Please log in.`)
      }, 2000)
    } catch {
      setError("Failed to set password. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-[#97AE2C]/600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation link...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Invitation Link</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact your super administrator.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Password Set Successfully</h1>
          <p className="text-gray-600">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <Image src="/logo1.svg" alt="Rahmah Exchange" width={120} height={120} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Set Your Password</h1>
          {userInfo && (
            <p className="text-gray-600 mt-2">
              Welcome <strong>{userInfo.name}</strong> ({userInfo.email})
            </p>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <button
            disabled={submitting}
            className="w-full py-3 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 disabled:opacity-50"
          >
            {submitting ? "Setting Password..." : "Set Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Login after setup:{" "}
          <a href={`/${tenantSlug}/staff/login`} className="text-[#97AE2C]/600 hover:underline">
            /{tenantSlug}/staff/login
          </a>
        </p>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SetupPasswordContent />
    </Suspense>
  )
}
