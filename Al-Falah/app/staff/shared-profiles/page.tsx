"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuthToken } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"
import SharedProfilesList from "@/components/shared-profiles-list"

export default function SharedProfilesPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>("")

  useEffect(() => {
    const token = getAuthToken()
    if (!token) router.push("/staff/login")
    else {
      try {
        const decoded: any = jwtDecode(token)
        setUserRole(decoded.role || "")
      } catch (err) {
        console.error("Failed to decode token:", err)
        router.push("/staff/login")
        return
      }
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#97AE2C]/600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared Profiles</h1>
        <p className="text-gray-600">Profiles shared with your organization</p>
      </div> */}
      <SharedProfilesList />
    </div>
  )
}
