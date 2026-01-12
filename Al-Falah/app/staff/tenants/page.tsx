"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import {
  FileText,
  LogOut,
  Users,
  MessageSquare,
  Search,
  Plus,
  Shield,
  Building2,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"
import { removeAuthToken, getAuthToken, authenticatedFetch } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

interface Tenant {
  _id: string
  name: string
  slug: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
  isActive: boolean
  subscriptionStatus: string
  createdAt: string
  updatedAt: string
}

export default function TenantsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    adminEmail: "",
    adminName: "",
    isActive: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null)

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

      // Only super_admin can access this page
      if (decoded.role !== "super_admin") {
        router.push("/staff/dashboard")
        return
      }
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push("/staff/login")
    }
  }, [router])

  useEffect(() => {
    if (userRole === "super_admin") {
      fetchTenants()
    }
  }, [userRole])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      const res = await authenticatedFetch("/api/tenants", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch tenants")
      }

      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error("Error fetching tenants:", err)
      setError("Failed to load tenants")
    } finally {
      setLoading(false)
    }
  }

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
      router.push("/staff/login")
    } catch {
      removeAuthToken()
      router.push("/staff/login")
    }
  }

  const handleAdd = () => {
    setFormData({
      name: "",
      slug: "",
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      adminEmail: "",
      adminName: "",
      isActive: true,
    })
    setError(null)
    setSuccess(null)
    setShowAddModal(true)
  }

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      street: tenant.address?.street || "",
      city: tenant.address?.city || "",
      state: tenant.address?.state || "",
      zipCode: tenant.address?.zipCode || "",
      adminEmail: "", // Admin email not shown in edit (can be added later if needed)
      adminName: "",
      isActive: tenant.isActive !== undefined ? tenant.isActive : true,
    })
    setError(null)
    setSuccess(null)
    setShowEditModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const token = getAuthToken()
      const url = showEditModal && selectedTenant ? `/api/tenants/${selectedTenant._id}` : "/api/tenants"

      const method = showEditModal ? "PATCH" : "POST"

      const payload = {
        name: formData.name,
        slug: formData.slug || undefined, // Optional - will be auto-generated from name
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        ...(showEditModal ? { isActive: formData.isActive } : {}),
        ...(showAddModal
          ? {
              adminEmail: formData.adminEmail,
              adminName: formData.adminName,
            }
          : {}),
      }

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      // Try to parse response as JSON
      let data: any = {}
      try {
        const text = await res.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (parseError) {
        console.error("Failed to parse response:", parseError)
      }

      if (!res.ok) {
        const errorMessage = data?.message || data?.error || `Failed to save masjid (${res.status})`
        throw new Error(errorMessage)
      }

      // Clear any previous errors
      setError(null)

      // Show success message
      const successMessage = showEditModal
        ? "Masjid updated successfully"
        : "Masjid created successfully. Admin invitation email has been sent."
      setSuccess(successMessage)

      // Close modals and reset form immediately
      setShowAddModal(false)
      setShowEditModal(false)
      setSelectedTenant(null)

      // Reset form data
      setFormData({
        name: "",
        slug: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        adminEmail: "",
        adminName: "",
        isActive: true,
      })

      // Refresh the tenants list
      await fetchTenants()

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 5000)
    } catch (err: any) {
      console.error("Error saving tenant:", err)
      // Extract error message properly
      let errorMessage = "Failed to save masjid. Please try again."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === "string") {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error) {
        errorMessage = err.error
      }

      setError(errorMessage)
      // Clear success message if there's an error
      setSuccess(null)
    }
  }

  const handleDelete = (tenantId: string) => {
    setTenantToDelete(tenantId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!tenantToDelete) return

    try {
      const token = getAuthToken()
      const res = await authenticatedFetch(`/api/tenants/${tenantToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete masjid")
      }

      setSuccess("Masjid deleted successfully")
      setShowDeleteConfirm(false)
      setTenantToDelete(null)
      fetchTenants()
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message || "Failed to delete masjid")
      setShowDeleteConfirm(false)
      setTenantToDelete(null)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Slug will be auto-generated from name on backend
    }))
  }

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

  //   ...(userRole === "admin" || userRole === "super_admin"
  //     ? [{ name: "Manage Users", icon: Users, href: "/staff/users", active: pathname === "/staff/users" }]
  //     : []),
  //   ...(userRole === "super_admin"
  //     ? [{ name: "Manage Masjids", icon: Shield, href: "/staff/tenants", active: pathname === "/staff/tenants" }]
  //     : []),
  // ]

  const TenantsContent = (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
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
        </nav>

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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Masjids</h1>
              <p className="text-gray-600">View and manage all mosques in the system</p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-3 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 transition"
            >
              <Plus className="w-5 h-5" />
              Add New Masjid
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">{success}</div>
          )}
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search masjids by name, slug, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
              />
            </div>
          </div>

          {/* Tenants List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#97AE2C]/600"></div>
              <p className="mt-4 text-gray-600">Loading masjids...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No masjids found</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant._id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Building2 className="w-6 h-6 text-[#97AE2C]/600" />
                        <h3 className="text-xl font-bold text-gray-900">{tenant.name}</h3>
                        {tenant.isActive ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-sm font-medium">Slug:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">{tenant.slug}</code>
                        </div>
                        {tenant.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">{tenant.email}</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{tenant.phone}</span>
                          </div>
                        )}
                        {tenant.address && (tenant.address.city || tenant.address.state) && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">
                              {[tenant.address.city, tenant.address.state].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-sm text-gray-500">
                        Created: {new Date(tenant.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="p-2 text-[#97AE2C]/600 hover:bg-[#97AE2C]/50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tenant._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Masjid"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Masjid</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this masjid? This action cannot be undone. All data associated with
                  this masjid (applicants, grants, payments, messages, etc.) will be permanently deleted.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setTenantToDelete(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-3xl font-bold text-gray-900">{tenants.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Masjids</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-3xl font-bold text-green-600">{tenants.filter((t) => t.isActive).length}</div>
              <div className="text-sm text-gray-600 mt-1">Active Masjids</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-3xl font-bold text-red-600">{tenants.filter((t) => !t.isActive).length}</div>
              <div className="text-sm text-gray-600 mt-1">Inactive Masjids</div>
            </div>
          </div>
        </div>
  

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {showEditModal ? "Edit Masjid" : "Add New Masjid"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Masjid Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                  placeholder="e.g., Masjid Al-Noor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email {showEditModal && "*"}</label>
                  <input
                    type="email"
                    required={showEditModal}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                    placeholder="admin@masjid.com"
                  />
                  {showEditModal && <p className="mt-1 text-sm text-gray-500">Admin email for this masjid</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {showEditModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive === true}
                        onChange={() => setFormData({ ...formData, isActive: true })}
                        className="w-4 h-4 text-[#97AE2C]/600 focus:ring-[#97AE2C]/500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={formData.isActive === false}
                        onChange={() => setFormData({ ...formData, isActive: false })}
                        className="w-4 h-4 text-[#97AE2C]/600 focus:ring-[#97AE2C]/500"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                    placeholder="Street Address *"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                      placeholder="City *"
                    />
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                      placeholder="State *"
                    />
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                      placeholder="ZIP Code *"
                    />
                  </div>
                </div>
              </div>

              {showAddModal && (
                <>
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Access</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The admin email will be used as the masjid contact email and will receive all notifications for
                      this masjid.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                          placeholder="admin@masjid.com"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Admin will receive an invitation email to set their password. This email will also be used for
                          masjid notifications.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-[#97AE2C]/500"
                          placeholder="Admin Full Name"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                    setSelectedTenant(null)
                    setError(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700">
                  {showEditModal ? "Update" : "Create"} Masjid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  if (userRole !== "super_admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need super admin privileges to access this page.</p>
          <Link href="/staff/dashboard" className="text-[#97AE2C]/600 hover:text-[#97AE2C]/700 mt-4 inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return TenantsContent
}
