"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getAuthToken } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

export default function TenantsPage() {
  const router = useRouter()
  const params = useParams()
  const masjidSlug = params.masjidSlug as string
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("")

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push(`/${masjidSlug}/staff/login`)
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setUserRole(decoded.role || "")

      if (decoded.role !== "super_admin") {
        router.push(`/${masjidSlug}/staff/dashboard`)
        return
      }
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push(`/${masjidSlug}/staff/login`)
    }

    setLoading(false)
  }, [router, masjidSlug])

  // ... rest of existing code ...
}
