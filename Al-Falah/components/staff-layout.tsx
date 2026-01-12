"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname, useParams } from "next/navigation"
import { FileText, LogOut, Users, MessageSquare, Shield, Share2 } from "lucide-react"
import { removeAuthToken, getAuthToken, authenticatedFetch } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

interface StaffLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export default function StaffLayout({ children, title, description }: StaffLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const masjidSlug = (params.masjidSlug as string) || ""
  const [userRole, setUserRole] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const basePath = masjidSlug ? `/${masjidSlug}/staff` : `/staff`

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push(`${basePath}/login`)
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setUserRole(decoded.role || "")
      setUserName(decoded.name || "User")
      setLoading(false)
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push(`${basePath}/login`)
    }
  }, [router, basePath])

  const handleLogout = async () => {
    try {
      const token = getAuthToken()
      if (token) {
        await authenticatedFetch(`/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => {})
      }
      removeAuthToken()
      router.push(`${basePath}/login`)
    } catch {
      removeAuthToken()
      router.push(`${basePath}/login`)
    }
  }

  const navItems = [
    {
      name: "Dashboard",
      icon: FileText,
      href: `${basePath}/dashboard`,
      active: pathname === `${basePath}/dashboard`,
    },
    ...(userRole && ["admin", "caseworker", "approver", "treasurer", "super_admin"].includes(userRole)
      ? [
          {
            name: "All Cases",
            icon: FileText,
            href: `${basePath}/cases`,
            active: pathname === `${basePath}/cases` || pathname.startsWith(`${basePath}/cases/`),
          },
        ]
      : []),
    ...(userRole && ["admin", "caseworker", "approver", "treasurer"].includes(userRole)
      ? [
          {
            name: "Applicants Messages ",
            icon: MessageSquare,
            href: `${basePath}/messages-applicants`,
            active: pathname === `${basePath}/messages-applicants`,
          },
        ]
      : []),
    ...(userRole === "admin" || userRole === "super_admin" || userRole === "caseworker"
      ? [
          {
            name: "Staff Messages",
            icon: Users,
            href: `${basePath}/messages`,
            active: pathname === `${basePath}/messages`,
          },
        ]
      : []),
    ...(userRole && ["admin", "caseworker", "approver", "treasurer"].includes(userRole)
      ? [
          {
            name: "Shared Profiles",
            icon: Share2,
            href: `${basePath}/shared-profiles`,
            active: pathname === `${basePath}/shared-profiles`,
          },
        ]
      : []),
    ...(userRole === "admin" || userRole === "super_admin"
      ? [
          {
            name: "Manage Users",
            icon: Users,
            href: `${basePath}/users`,
            active: pathname === `${basePath}/users`,
          },
        ]
      : []),
    ...(userRole === "super_admin"
      ? [
          {
            name: "Manage Masjids",
            icon: Shield,
            href: `${basePath}/tenants`,
            active: pathname === `${basePath}/tenants`,
          },
        ]
      : []),
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <Image src="/logo1.svg" alt="Logo" width={100} height={100} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200
          ${
            isActive
              ? "bg-gradient-to-r from-teal-500/10 to-teal-500/0 text-teal-700 font-semibold shadow-sm"
              : "text-gray-700 hover:bg-gray-100"
          }
        `}
              >
                {/* Left Active Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-gradient-to-b from-teal-400 to-teal-600" />
                )}

                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-teal-600" : "text-gray-500"}`} />

                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* HEADER */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          {/* Page Name */}
          <h1 className="text-lg font-semibold text-gray-800 capitalize">
            {pathname.replace("/staff/", "").replace("-", " ") || "Dashboard"}
          </h1>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-2">{children}</main>
      </div>
    </div>
  )
}
