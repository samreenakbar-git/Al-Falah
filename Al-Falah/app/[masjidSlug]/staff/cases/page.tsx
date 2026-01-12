"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { getAuthToken, removeAuthToken, authenticatedFetch } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

interface Case {
  _id: string
  caseId: string
  firstName: string
  lastName: string
  requestType: string
  amountRequested: number | null
  status: string
  createdAt: string
  isOldCase?: boolean
  tenantId?: string
  documents: Array<{
    filename: string
    originalname: string
    mimeType: string
    size: number
    url?: string
  }>
}

interface ApiResponse {
  items: Case[]
  total: number
  page: number
  limit: number
}

interface Tenant {
  _id: string
  name: string
  slug: string
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [selectedTenantId, setSelectedTenantId] = useState<string>("")
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const router = useRouter()
  const params = useParams()
  const masjidSlug = params?.masjidSlug as string

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push(`/${masjidSlug}/staff/login`)
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setUserRole(decoded.role || "")

      if (decoded.role !== "super_admin" && decoded.role !== "admin") {
        router.push(`/${masjidSlug}/staff/dashboard`)
        return
      }
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push(`/${masjidSlug}/staff/login`)
    }
  }, [router, masjidSlug])

  useEffect(() => {
    if (userRole === "super_admin") {
      const fetchTenants = async () => {
        try {
          setLoadingTenants(true)
          const res = await authenticatedFetch("/api/tenants", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })

          if (res.ok) {
            const data = await res.json()
            setTenants(data.tenants || [])
          }
        } catch (err) {
          console.error("Error fetching tenants:", err)
        } finally {
          setLoadingTenants(false)
        }
      }
      fetchTenants()
    }
  }, [userRole])

  useEffect(() => {
    if (userRole !== "super_admin" && userRole !== "admin") return

    const fetchCases = async () => {
      try {
        setLoading(true)
        let url = `/api/zakat-applicants`

        if (userRole === "super_admin" && selectedTenantId) {
          url += `?tenantId=${selectedTenantId}`
        }

        const res = await authenticatedFetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const result: ApiResponse = await res.json()
        let filteredCases = Array.isArray(result.items) ? result.items : []

        if (userRole === "super_admin") {
          filteredCases = filteredCases.filter((caseItem) => !caseItem.isOldCase)
        }

        setCases(filteredCases)
        setError(null)
      } catch (err) {
        console.error("Error fetching cases:", err)
        setError("Failed to load cases")
        setCases([])
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [userRole, selectedTenantId])

  const handleLogout = () => {
    removeAuthToken()
    router.push(`/${masjidSlug}/staff/login`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">All Cases</h2>
            <p className="text-gray-600">
              {userRole === "super_admin" ? "View all cases by masjid" : "Manage and review all applicants"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userRole === "super_admin" && (
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                disabled={loadingTenants}
              >
                <option value="">All Masjids</option>
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
            {userRole === "admin" && (
              <>
                <Link href={`/${masjidSlug}/staff/cases/add`}>
                  <button className="px-6 py-3 bg-[#97AE2C]/600 text-white rounded-lg font-medium hover:bg-[#97AE2C]/700 transition flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Case
                  </button>
                </Link>
                <Link href={`/${masjidSlug}/staff/cases/add-old`}>
                  <button className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Old Case
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {loading && <div className="bg-white rounded-lg p-12 text-center text-gray-600">Loading cases...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
        {!loading && !error && cases.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center text-gray-600">No cases found</div>
        )}

        <div className="space-y-4">
          {cases.map((caseItem) => (
            <div
              key={caseItem.caseId}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md border border-gray-200 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {caseItem.firstName} {caseItem.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {caseItem.requestType} · ${caseItem.amountRequested || "N/A"}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4 ${
                    caseItem.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : caseItem.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {caseItem.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-6 text-sm pt-4 border-t border-gray-100">
                <div>
                  <p className="text-gray-600">Case ID</p>
                  <p className="font-mono text-xs text-gray-900 mt-1">{caseItem.caseId.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-gray-600">Submitted</p>
                  <p className="text-gray-900 font-medium mt-1">{new Date(caseItem.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Requested Amount</p>
                  <p className="text-gray-900 font-medium mt-1">${caseItem.amountRequested || "—"}</p>
                </div>
                <div className="text-right">
                  <Link href={`/${masjidSlug}/staff/cases/${caseItem._id}`}>
                    <button className="px-4 py-2 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 transition font-medium">
                      Review
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
