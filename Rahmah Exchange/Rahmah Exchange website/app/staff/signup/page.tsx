"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { setAuthToken, API_BASE_URL } from "@/lib/auth-utils"

export default function StaffSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Signup failed")
        setLoading(false)
        return
      }

      setAuthToken(data.token)

      router.push("/staff/dashboard")
    } catch (err) {
      setError("Server problem, Please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 flex flex-col">
      <header className="px-8 py-6">
        <Link href="/" className="text-gray-900 font-medium hover:text-gray-600 flex items-center gap-2">
          <span>←</span> Back to Home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Rahmah Exchange</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up</h2>
            <p className="text-gray-600 mb-8">Create your admin account</p>

            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition"
              >
                {loading ? "Wait... " : "Sign Up"}
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-8">
              Already have account?{" "}
              <Link href="/staff/login" className="text-teal-600 font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
