"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, TrendingUp, FileText, ChevronRight, Shield } from "lucide-react"
import { getAuthToken, authenticatedFetch } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

type ZakatApplicant = {
  id?: string | number
  status?: string
  createdAt?: string
  normalizedStatus?: string
  firstName?: string
  lastName?: string
  email?: string
  [key: string]: any
}

type StatCardProps = {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [applicants, setApplicants] = useState<ZakatApplicant[]>([])
  const [totalFromAPI, setTotalFromAPI] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantsLoading, setTenantsLoading] = useState<boolean>(false)
  const [userRole, setUserRole] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [roleCheckPassed, setRoleCheckPassed] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push("/staff/login")
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setUserRole(decoded.role || "")
      setUserName(decoded.name || "User")
      setUserEmail(decoded.email || "")

      if (decoded.role !== "super_admin") {
        router.push("/")
        return
      }
      setRoleCheckPassed(true)
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push("/staff/login")
    }
  }, [router])

  const normalizeStatus = (status?: string) => (status || "").trim().toLowerCase().replace(/\s+/g, " ")

  useEffect(() => {
    // Wait until we know the user's role before loading dashboard data
    if (!userRole) return

    const fetchData = async () => {
      try {
        // Always load applicants for counts (for tenants or super admin)
        const res = await authenticatedFetch(`/api/zakat-applicants`)
        const json = await res.json()

        const dataArray: any[] = Array.isArray(json) ? json : json.items || json.data || []

        const normalizedArray = dataArray.map((a) => ({
          ...a,
          normalizedStatus: normalizeStatus(a.status),
        }))

        setApplicants(normalizedArray)
        setTotalFromAPI(json.total ?? json.totalCount ?? normalizedArray.length)

        // For super_admin, also load tenants to show masjid-level stats
        if (userRole === "super_admin") {
          setTenantsLoading(true)
          try {
            const tenantsRes = await authenticatedFetch(`/api/tenants`)
            const tenantsJson = await tenantsRes.json()
            const tenantArray: any[] = Array.isArray(tenantsJson) ? tenantsJson : tenantsJson.tenants || []
            setTenants(tenantArray)
          } catch (tenErr) {
            console.error("Error fetching tenants for super admin dashboard:", tenErr)
            setTenants([])
          } finally {
            setTenantsLoading(false)
          }
        }
      } catch (error) {
        console.error("Error fetching applicants:", error)
        setApplicants([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userRole])

  const approvedCount = applicants.filter((a) => a.normalizedStatus === "approved").length
  const pendingCount = applicants.filter((a) => a.normalizedStatus === "pending").length
  const rejectedCount = applicants.filter((a) => a.normalizedStatus === "rejected").length
  const inReviewCount = applicants.filter((a) => a.normalizedStatus === "in review").length
  const needInfoCount = applicants.filter((a) => a.normalizedStatus === "need info").length
  const readyForApprovalCount = applicants.filter((a) => a.normalizedStatus === "ready for approval").length

  const todayISO = new Date().toISOString().split("T")[0]

  const todaysApplicants = applicants.filter((app) => {
    if (!app.createdAt) return false
    try {
      return new Date(app.createdAt).toISOString().startsWith(todayISO)
    } catch {
      return app.createdAt.toString().startsWith(todayISO)
    }
  })

  const todaysSubmissions = todaysApplicants.length

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  // const navItems = [
  //   { name: "Dashboard", icon: FileText, href: "/staff/dashboard", active: pathname === "/staff/dashboard" },
  //   ...(userRole === "super_admin" || userRole === "admin"
  //     ? [{ name: "All Cases", icon: FileText, href: "/staff/cases", active: pathname === "/staff/cases" }]
  //     : []),
  //   // Messages should be visible ONLY for masjid staff (admin, caseworker, approver, treasurer)
  //   ...(userRole && ["admin", "caseworker", "approver", "treasurer"].includes(userRole)
  //     ? [{ name: "Messages", icon: MessageSquare, href: "/messages", active: pathname === "/messages" }]
  //     : []),
  //   ...(userRole === "admin" || userRole === "super_admin"
  //     ? [{ name: "Staff Messages", icon: Users, href: "/staff/messages", active: pathname === "/staff/messages" }]
  //     : []),
  //   // Shared Profiles also only for masjid staff, not super_admin
  //   ...(userRole && ["admin", "caseworker", "approver", "treasurer"].includes(userRole)
  //     ? [
  //         {
  //           name: "Shared Profiles",
  //           icon: Share2,
  //           href: "/staff/shared-profiles",
  //           active: pathname === "/staff/shared-profiles",
  //         },
  //       ]
  //     : []),
  //   ...(userRole === "admin" || userRole === "super_admin"
  //     ? [{ name: "Manage Users", icon: Users, href: "/staff/users", active: pathname === "/staff/users" }]
  //     : []),
  //   ...(userRole === "super_admin"
  //     ? [{ name: "Manage Masjids", icon: Shield, href: "/staff/tenants", active: pathname === "/staff/tenants" }]
  //     : []),
  // ]

  // Masjid-level stats for super admin
  const totalMasjids = tenants.length
  const activeMasjids = tenants.filter((t: any) => t.isActive !== false).length
  const inactiveMasjids = tenants.filter((t: any) => t.isActive === false).length

  const DashboardContent = (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {/* <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
        <div className="p-6 border-b border-gray-200">
          <Link href="/staff/dashboard" className="flex items-center gap-3">
            <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={80} height={80} />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  item.active ? "bg-[#97AE2C]/50 text-[#97AE2C]/700 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav> */}
      {/* 
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 w-full"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside> */}

      {/* Main Content */}

      {/* Header */}
      {/* <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search cases, applicants..." className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
        </header> */}

      {/* Greeting Banner */}

      <div className=" flex-1 bg-gradient-to-r from-[#97AE2C]/600 to-cyan-600 rounded-xl p-8 text-white mt-6">
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {userName.split(" ")[0]}
        </h1>
        <p className="text-[#97AE2C]/100 mt-2">
          You have <span className="font-semibold text-white">{pendingCount}</span> pending applications.
        </p>
      </div>

      {/* Stats */}
      {userRole === "super_admin" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <StatCard
            title="Total Masjids"
            value={tenantsLoading ? "..." : totalMasjids}
            icon={<FileText className="w-5 h-5" />}
            color="from-blue-600 to-cyan-600"
          />
          <StatCard
            title="Active Masjids"
            value={tenantsLoading ? "..." : activeMasjids}
            icon={<TrendingUp className="w-5 h-5" />}
            color="from-green-600 to-emerald-600"
          />
          <StatCard
            title="Inactive Masjids"
            value={tenantsLoading ? "..." : inactiveMasjids}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="from-red-600 to-rose-600"
          />
          <StatCard
            title="Total Applications (All Masjids)"
            value={loading ? "..." : (totalFromAPI ?? applicants.length)}
            icon={<Shield className="w-5 h-5" />}
            color="from-purple-600 to-pink-600"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <StatCard
            title="Total Applications"
            value={totalFromAPI ?? applicants.length}
            icon={<FileText className="w-5 h-5" />}
            color="from-blue-600 to-cyan-600"
          />
          <StatCard
            title="Pending Review"
            value={pendingCount}
            icon={<TrendingUp className="w-5 h-5" />}
            color="from-yellow-600 to-orange-600"
          />
          <StatCard
            title="Approved"
            value={approvedCount}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="from-green-600 to-emerald-600"
          />
          <StatCard
            title="New Today"
            value={todaysSubmissions}
            icon={<Shield className="w-5 h-5" />}
            color="from-purple-600 to-pink-600"
          />
        </div>
      )}

      {/* Today's Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-10">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Today's Applications</h2>
          <Link href="/staff/cases" className="text-[#97AE2C]/600 font-medium flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Time</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : todaysApplicants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No applications today
                  </td>
                </tr>
              ) : (
                todaysApplicants.map((app, index) => (
                  <tr
                    key={app._id || app.id || `app-${index}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/staff/cases/${app._id || app.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#97AE2C]/100 rounded-full flex items-center justify-center">
                          <span className="text-[#97AE2C]/600 font-semibold">
                            {((app.firstName || "") + " " + (app.lastName || "")).charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.firstName} {app.lastName}
                          </div>
                          {app.caseId && <div className="text-xs text-gray-500">{app.caseId}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">{app.email || "N/A"}</td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          app.normalizedStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : app.normalizedStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : app.normalizedStatus === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {app.status || "Pending"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {app.createdAt
                        ? new Date(app.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Overview moved under table */}
      <div className="p-6 mt-8 bg-white border rounded-lg shadow-sm">
        <h3 className="text-lg font-bold mb-4">Status Overview</h3>
        <div className="space-y-3">
          <StatusRow label="Pending" count={pendingCount} color="yellow" />
          <StatusRow label="In Review" count={inReviewCount} color="blue" />
          <StatusRow label="Need Info" count={needInfoCount} color="orange" />
          <StatusRow label="Ready for Approval" count={readyForApprovalCount} color="purple" />
          <StatusRow label="Approved" count={approvedCount} color="green" />
          <StatusRow label="Rejected" count={rejectedCount} color="red" />
        </div>
      </div>
    </div>
  )

  return roleCheckPassed ? DashboardContent : null
}

function StatusRow({ label, count, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-lg font-bold text-gray-900">{count}</span>
    </div>
  )
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 text-sm">{title}</h3>
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
