"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, FileText, User, Clock, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Document {
  _id: string
  filename: string
  originalname: string
  size: number
  url: string
  uploadedAt: string
}

interface SharedProfile {
  _id: string
  profileId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    mobilePhone: string
    caseId: string
    status: string
    amountRequested: number
    streetAddress: string
    city: string
    state: string
    zipCode: string
    documents: Document[]
    createdAt: string
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
  permissions: string
  lastViewedAt?: string
}

export default function SharedProfilePage() {
  const params = useParams()
  const sharedProfileId = params.sharedProfileId as string
  const [profile, setProfile] = useState<SharedProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [sharedProfileId])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/shared-profiles/${sharedProfileId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Shared profile not found")
        }
        throw new Error("Failed to fetch profile")
      }
      const data = await response.json()
      setProfile(data.sharedProfile)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#97AE2C]/600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading shared profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Profile not found"}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-[#97AE2C] text-white rounded-lg hover:bg-[#8a9d2a] transition font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const applicant = profile.profileId
  const statusColors: Record<string, string> = {
    Pending: "bg-yellow-50 border-yellow-200 text-yellow-800",
    Approved: "bg-green-50 border-green-200 text-green-800",
    Rejected: "bg-red-50 border-red-200 text-red-800",
    "Ready for Approval": "bg-blue-50 border-blue-200 text-blue-800",
    "Need Info": "bg-orange-50 border-orange-200 text-orange-800",
    "In Review": "bg-purple-50 border-purple-200 text-purple-800",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-900 transition" />
            <Image
              src="/logo1.svg"
              alt="Rahmah Exchange Logo"
              width={150}
              height={150}
              priority
              className="h-12 w-auto"
            />
          </Link>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Shared by: <span className="font-semibold text-gray-900">{profile.fromTenant.name}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Banner */}
        <div className="mb-8">
          <div
            className={`p-4 border rounded-xl flex items-center gap-3 ${statusColors[applicant.status] || statusColors.Pending}`}
          >
            {applicant.status === "Approved" ? (
              <CheckCircle className="w-5 h-5" />
            ) : applicant.status === "Rejected" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
            <div>
              <p className="font-semibold">Status: {applicant.status}</p>
              <p className="text-sm">Submitted on {new Date(applicant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Note from Sender */}
        {profile.note && (
          <Alert className="mb-8 bg-blue-50 border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-1">Note from {profile.sharedBy.name}:</p>
              <p>{profile.note}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-[#97AE2C]/600" />
            <h2 className="text-2xl font-bold text-gray-900">Application Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900 font-semibold mt-1">
                  {applicant.firstName} {applicant.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 font-semibold mt-1">{applicant.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 font-semibold mt-1">{applicant.mobilePhone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-gray-900 font-semibold mt-1">
                  {applicant.streetAddress}, {applicant.city}, {applicant.state} {applicant.zipCode}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Case ID</label>
                <p className="text-gray-900 font-semibold mt-1 font-mono">{applicant.caseId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount Requested</label>
                <p className="text-gray-900 font-semibold mt-1">
                  ${applicant.amountRequested?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Application Date</label>
                <p className="text-gray-900 font-semibold mt-1">{new Date(applicant.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        {applicant.documents && applicant.documents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-[#97AE2C]/600" />
              <h3 className="text-xl font-bold text-gray-900">Documents</h3>
            </div>

            <div className="space-y-3">
              {applicant.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-6 h-6 text-[#97AE2C]/600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{doc.originalname}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {(doc.size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#97AE2C] text-white rounded-lg hover:bg-[#8a9d2a] transition text-sm font-medium"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
