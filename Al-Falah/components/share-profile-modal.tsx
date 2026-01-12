"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check } from "lucide-react"
import { getAuthToken } from "@/lib/auth-utils"

interface ShareProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  profileName: string
}

interface Tenant {
  _id: string
  name: string
  slug: string
}

export default function ShareProfileModal({ isOpen, onClose, profileId, profileName }: ShareProfileModalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && tenants.length === 0) {
      handleOpenModal()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOpenModal = async () => {
    setLoadingTenants(true)
    setError(null)
    try {
      const token = getAuthToken()
      const response = await fetch("/api/tenants?available=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to load tenants")
      }
      const data = await response.json()
      setTenants(data.tenants || [])
    } catch (err: any) {
      console.error("[v0] Failed to load tenants:", err)
      setError(err.message || "Failed to load tenants")
    } finally {
      setLoadingTenants(false)
    }
  }

  const handleShare = async () => {
    if (!selectedTenantId) {
      setError("Please select a tenant")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const response = await fetch("/api/shared-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profileId,
          toTenantId: selectedTenantId,
          note,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to share profile")
      }

      const data = await response.json()
      setSuccess(true)
      setShareLink(`${window.location.origin}/shared-profile/${data.sharedProfile._id}`)

      // Reset form
      setSelectedTenantId("")
      setNote("")

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setShareLink(null)
    setSelectedTenantId("")
    setNote("")
    setError(null)
    setCopied(false)
    onClose()
  }

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Share Profile</h2>
          <button onClick={handleClose} className="text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="space-y-4">
              <div className="text-center">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-semibold text-gray-900">Profile Shared!</p>
                <p className="text-sm text-gray-600 mt-1">
                  Profile has been successfully shared with the selected tenant.
                </p>
              </div>

              {shareLink && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-2">Share Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-xs text-gray-900 font-mono"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Profile</p>
                <p className="text-sm text-gray-900 font-semibold">{profileName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Select Tenant</label>
                {loadingTenants && <div className="px-3 py-2 text-sm text-gray-600 text-center">Loading...</div>}
                {tenants.length > 0 && (
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Choose a tenant...</option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a message for the receiving tenant..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={loading || !selectedTenantId || loadingTenants}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition font-medium text-sm"
                >
                  {loading ? "Sharing..." : "Share Profile"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
