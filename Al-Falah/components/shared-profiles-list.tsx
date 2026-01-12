"use client"

import { useEffect, useState } from "react"
import { Share2, User, Calendar, ExternalLink, Trash2 } from "lucide-react"
import Link from "next/link"
import { getAuthToken } from "@/lib/auth-utils"

interface SharedProfile {
  _id: string
  profileId: {
    firstName: string
    lastName: string
    email: string
    caseId: string
    status: string
  }
  fromTenant: {
    name: string
    slug: string
  }
  sharedBy: {
    name: string
    email: string
  }
  note?: string
  createdAt: string
  isActive: boolean
}

export default function SharedProfilesList() {
  const [sharedProfiles, setSharedProfiles] = useState<SharedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedProfiles()
  }, [])

  const fetchSharedProfiles = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch("/api/shared-profiles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to fetch shared profiles")
      const data = await response.json()
      setSharedProfiles(data.sharedProfiles || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (sharedProfileId: string) => {
    if (!confirm("Are you sure you want to revoke access to this profile?")) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/shared-profiles/${sharedProfileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to revoke access")
      fetchSharedProfiles()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading shared profiles...</p>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
  }

  if (sharedProfiles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No profiles shared with you yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sharedProfiles.map((profile) => (
        <div key={profile._id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {profile.profileId.firstName} {profile.profileId.lastName}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Shared by <span className="font-medium text-gray-900">{profile.fromTenant.name}</span>
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                profile.profileId.status === "Approved"
                  ? "bg-green-100 text-green-800"
                  : profile.profileId.status === "Rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {profile.profileId.status}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600">Case ID</p>
              <p className="font-mono text-gray-900 mt-1">{profile.profileId.caseId.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="text-gray-900 mt-1 truncate">{profile.profileId.email}</p>
            </div>
            <div>
              <p className="text-gray-600">Shared</p>
              <div className="flex items-center gap-1 text-gray-900 mt-1">
                <Calendar className="w-4 h-4" />
                {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right space-y-2">
              <Link href={`/shared-profile/${profile._id}`}>
                <button className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium text-xs flex items-center justify-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                  View
                </button>
              </Link>
              <button
                onClick={() => handleRevoke(profile._id)}
                className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium text-xs flex items-center justify-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Revoke
              </button>
            </div>
          </div>

          {profile.note && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
              <p className="text-gray-600 font-medium">Note:</p>
              <p className="text-gray-900 mt-1">{profile.note}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
