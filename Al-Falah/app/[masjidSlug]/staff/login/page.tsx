"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { setAuthToken } from "@/lib/auth-utils"

function StaffLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const masjidSlug = params.masjidSlug as string

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [masjidName, setMasjidName] = useState<string | null>(null)

  useEffect(() => {
    const fetchMasjidName = async () => {
      try {
        const res = await fetch(`/api/tenants/${masjidSlug}`)
        if (res.ok) {
          const data = await res.json()
          setMasjidName(data.name)
        }
      } catch (err) {
        console.error("Failed to fetch masjid name:", err)
      }
    }

    fetchMasjidName()
  }, [masjidSlug])

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setSuccess(message)
      router.replace(`/${masjidSlug}/staff/login`, { scroll: false })
    }
  }, [searchParams, router, masjidSlug])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, masjidSlug }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Invalid credentials")
        return
      }

      setAuthToken(data.token)
      router.push(`/${masjidSlug}/staff/dashboard`)
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full max-w-md">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Log in</h2>
        {masjidName && (
          <p className="text-sm text-gray-600 mt-1">
            Logging in to <span className="font-semibold text-[#97AE2C]/600">{masjidName}</span>
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-2 px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#97AE2C]/500"
          placeholder="staff@example.com"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Password</label>
        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-10 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#97AE2C]/500"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#97AE2C]/600 hover:bg-[#97AE2C]/700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? "Logging in..." : "Log in"}
      </button>
      <p className="text-center text-black/60 text-xs mt-6">
        Protected area.{" "}
        <Link href="/" className="text-black font-medium hover:text-[#97AE2C]/600">
          Back to home
        </Link>
      </p>
    </form>
  )
}

function LoginFormWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center px-6 bg-white">
          <div>Loading...</div>
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  )
}

export default function MasjidStaffLoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT SIDE – BACKGROUND ONLY */}
      <div className="relative bg-cover bg-center flex items-center" style={{ backgroundImage: "url('/mosque.png')" }}>
        {/* STRONG OVERLAY */}
        <div className="absolute inset-0 bg-[#97AE2C]/80"></div>

        <div className="relative z-10 text-white px-12 max-w-md">
          {/* LOGO */}
          <Image src="/logo2.svg" alt="Logo" width={90} height={90} className="mb-6" />

          {/* TEXT */}
          <h1 className="text-4xl font-bold">Hey! Welcome</h1>
          <p className="mt-4 text-white/90">Secure staff access to the administration system.</p>
        </div>
      </div>

      {/* RIGHT SIDE – LOGIN */}
      <div className="flex items-center justify-center px-6 bg-white">
        <LoginFormWrapper />
      </div>
    </div>
  )
}
