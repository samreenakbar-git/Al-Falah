"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, UserCheck, UserX, Users, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { getAuthToken, authenticatedFetch } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

type User = {
  _id: string
  name: string
  email: string
  role: string
  isActive: boolean
  internalEmail?: string
  createdAt?: string
  updatedAt?: string
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userRole, setUserRole] = useState<string>("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "caseworker",
    isActive: true,
  })

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push("/staff/login")
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setUserRole(decoded.role || "")
      if (decoded.role !== "admin" && decoded.role !== "super_admin") {
        router.push("/staff/dashboard")
        return
      }
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push("/staff/login")
      return
    }

    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await authenticatedFetch("/api/users")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch users")
      }

      setUsers(data.users || [])
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load users"
      setError(errorMessage)
      console.error("Error fetching users:", err)

      if (errorMessage.includes("Admin access restricted")) {
        setError(`${errorMessage}. Please ensure your email is authorized for admin access.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await authenticatedFetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.message || "Failed to create user"
        setError(errorMsg)
        if (errorMsg.includes("Admin access restricted")) {
          setError(`${errorMsg}. Please ensure your email is authorized for admin access.`)
        }
        return
      }

      setShowCreateModal(false)
      setFormData({ name: "", email: "", password: "", role: "caseworker", isActive: true })
      setShowCreatePassword(false)
      setError("")
      fetchUsers()
    } catch (err: any) {
      const errorMsg = err.message || "Failed to create user"
      setError(errorMsg)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError("")
    try {
      const updateData: any = {}

      if (userRole === "super_admin") {
        if (!formData.password || formData.password.trim() === "") {
          setError("Password is required for super admin")
          return
        }
        updateData.password = formData.password
      } else {
        updateData.name = formData.name
        updateData.email = formData.email
        updateData.role = formData.role
        updateData.isActive = formData.isActive

        if (formData.password && formData.password.trim() !== "") {
          updateData.password = formData.password
        }
      }

      const res = await authenticatedFetch(`/api/users/${selectedUser._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.message || "Failed to update user"
        setError(errorMsg)
        if (errorMsg.includes("Admin access restricted")) {
          setError(`${errorMsg}. Please ensure your email is authorized for admin access.`)
        }
        return
      }

      setShowEditModal(false)
      setSelectedUser(null)
      setFormData({ name: "", email: "", password: "", role: "caseworker", isActive: true })
      setError("")
      fetchUsers()
    } catch (err: any) {
      const errorMsg = err.message || "Failed to update user"
      setError(errorMsg)
    }
  }

  const openEditModal = (user: User) => {
    setError("")
    setSelectedUser(user)
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "caseworker",
      isActive: user.isActive !== undefined ? user.isActive : true,
    })
    setShowEditModal(true)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "caseworker":
        return "bg-blue-100 text-blue-800"
      case "approver":
        return "bg-green-100 text-green-800"
      case "treasurer":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (userRole !== "admin" && userRole !== "super_admin") {
    return null
  }

  return (
    <div className="space-y-6">
      {/* <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage all system users</p>
      </div> */}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-600 hover:text-red-800">
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#97AE2C]/600" />
            <h2 className="text-xl font-bold text-gray-900">
              {userRole === "super_admin" ? `All Admins (${users.length})` : `All Users (${users.length})`}
            </h2>
          </div>
          {userRole === "admin" && (
            <button
              onClick={() => {
                setError("")
                setShowEditModal(false)
                setSelectedUser(null)
                setFormData({ name: "", email: "", password: "", role: "caseworker", isActive: true })
                setShowCreatePassword(false)
                setShowEditPassword(false)
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#97AE2C]/600 mb-4" />
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#97AE2C]/100 rounded-full flex items-center justify-center">
                            <span className="text-[#97AE2C]/600 font-semibold">
                              {(user.name || user.email || "U").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || user.email || "Unknown"}
                            </div>
                            {user.internalEmail && <div className="text-xs text-gray-500">{user.internalEmail}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role || "")}`}
                        >
                          {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="flex items-center gap-2 text-sm text-green-600">
                            <UserCheck className="w-4 h-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-sm text-red-600">
                            <UserX className="w-4 h-4" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(user)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#97AE2C]/600 hover:bg-[#97AE2C]/50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New User</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setError("")
                  setFormData({ name: "", email: "", password: "", role: "caseworker", isActive: true })
                  setShowCreatePassword(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCreatePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                >
                  <option value="caseworker">Caseworker</option>
                  <option value="approver">Approver</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#97AE2C]/600 border-gray-300 rounded focus:ring-[#97AE2C]/500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError("")
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 transition"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  setError("")
                  setFormData({ name: "", email: "", password: "", role: "caseworker", isActive: true })
                  setShowEditPassword(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              {userRole === "super_admin" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedUser.name}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedUser.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-xs text-gray-500 font-normal">(required to change password)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter new password"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={selectedUser.role}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editIsActive"
                      checked={selectedUser.isActive}
                      disabled
                      className="w-4 h-4 text-[#97AE2C]/600 border-gray-300 rounded focus:ring-[#97AE2C]/500 cursor-not-allowed"
                    />
                    <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                      Active
                    </label>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      As Super Admin, you can only change passwords for admins. Other fields are read-only.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password{" "}
                      <span className="text-xs text-gray-500 font-normal">(leave blank to keep current password)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter new password (optional)"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#97AE2C]/500 focus:border-transparent"
                    >
                      <option value="caseworker">Caseworker</option>
                      <option value="approver">Approver</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editIsActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#97AE2C]/600 border-gray-300 rounded focus:ring-[#97AE2C]/500"
                    />
                    <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                      Active
                    </label>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setError("")
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#97AE2C]/600 text-white rounded-lg hover:bg-[#97AE2C]/700 transition"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
