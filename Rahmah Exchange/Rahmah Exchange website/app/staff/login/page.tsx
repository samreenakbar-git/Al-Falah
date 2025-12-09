"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { setAuthToken} from "@/lib/auth-utils"

export default function StaffLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const apiUrl = `/api/auth/login`
      console.log("Login API URL:", apiUrl)

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      

      console.log("Login response status:", res.status)

      const data = await res.json()
      console.log("Login response data:", data)

      if (!res.ok) {
        // Show specific error message for inactive accounts
        if (res.status === 403) {
          setError(data.message || "Your profile is currently inactive. Please contact an administrator.")
        } else {
          setError(data.message || "Invalid credentials")
        }
        setLoading(false)
        return
      }

      setAuthToken(data.token)
      router.push("/staff/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-600 flex flex-col">
      <header className="px-8 py-6 bg-white/5 backdrop-blur-sm">
        <Link href="/" className="text-white font-medium hover:text-teal-100 flex items-center gap-2 transition">
          <span>←</span> Back to Home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-6 bg-white rounded-full px-6 py-3 shadow-lg">
              <Image
                           src="/logo1.svg"
                           alt="Rahmah Exchange Logo"
                           width={170}
                           height={170}
                           priority
                         />
            </div>
            <p className="text-white/80 text-sm">Staff Administration Portal</p>
          </div> */}

          <div className="bg-white rounded-2xl p-8 shadow-2xl justify-center items-center">
              <div className="flex items-center justify-center py-4">
             <Image
                  src="/logo1.svg"
                  alt="Rahmah Exchange Logo"
                  width={170}
                  height={170}
                  priority
                  />
                  </div>
            {/* <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Login</h2> */}
             {/*<p className="text-gray-600 mb-8">Access the admin dashboard</p> */}
           
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            {/* <p className="text-center text-gray-600 text-sm mt-8">
              Don't have an account?{" "}
              <Link href="/staff/signup" className="text-teal-600 font-semibold hover:text-teal-700 transition">
                Contact administrator
              </Link>
            </p> */}
          </div>

          <p className="text-center text-white/60 text-xs mt-6">Protected area. Unauthorized access is prohibited.</p>
        </div>
      </div>
    </div>
  )
}
