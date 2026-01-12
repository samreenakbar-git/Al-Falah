"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, CheckCircle, AlertCircle, FileText, Clock, MessageSquare, Upload, Trash2, User, Info, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ApplicantMessages from "@/components/applicant-messages"

interface Document {
  _id: string
  filename: string
  originalname: string
  mimeType: string
  size: number
  url: string
  uploadedAt: string
}

interface Applicant {
  _id: string
  firstName: string
  lastName: string
  email: string
  mobilePhone: string
  caseId: string
  status: string
  requestType: string
  amountRequested: number
  documents: Document[]
  createdAt: string
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string
  dateOfBirth?: string
  gender?: string
  employmentStatus?: string
  dependentsInfo?: string
  totalMonthlyIncome?: number
  whyApplying?: string
  circumstances?: string
}

function Toast({ message, type, isVisible }: { message: string; type: "success" | "error"; isVisible: boolean }) {
  if (!isVisible) return null
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg flex items-center gap-2 text-white font-semibold z-50 animate-in fade-in slide-in-from-top-5 ${
        type === "success" ? "bg-green-500" : "bg-red-500"
      }`}
    >
      {type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
    </div>
  )
}

type TabType = "information" | "about" | "messages"

export default function ApplicantPortalPage() {
  const params = useParams()
  const router = useRouter()
  const applicantId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>("information")
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  useEffect(() => {
    const token = sessionStorage.getItem("applicantToken")
    const storedId = sessionStorage.getItem("applicantId")

    if (!token || storedId !== applicantId) {
      router.push("/applicant-portal/login")
      return
    }

    fetchApplicant()
  }, [applicantId, router])

  useEffect(() => {
    if (applicant && !conversationId && !creatingConversation) {
      createOrGetConversation()
    }
  }, [applicant, conversationId, creatingConversation])

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 4000)
  }

  const fetchApplicant = async () => {
    try {
      const token = sessionStorage.getItem("applicantToken")
      const response = await fetch(`/api/zakat-applicants/${applicantId}?token=${token}`)

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/applicant-portal/login")
        }
        throw new Error("Failed to fetch application")
      }

      const data = await response.json()
      setApplicant(data.applicant)
    } catch (error: any) {
      console.error("Fetch error:", error)
      showToast("Failed to load application", "error")
    } finally {
      setLoading(false)
    }
  }

  const createOrGetConversation = async () => {
    try {
      setCreatingConversation(true)
      setConversationError(null)
      const token = sessionStorage.getItem("applicantToken")
      
      if (!token) {
        setConversationError("Authentication token not found. Please log in again.")
        return
      }
      
      const response = await fetch("/api/applicant/messages/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: `applicant-${applicantId}`,
          title: `Application Communication - Case ${applicantId}`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const convId = data.conversationId || data.conversation?.conversationId
        if (convId) {
          setConversationId(convId)
          setConversationError(null)
        } else {
          setConversationError("Conversation created but ID not returned. Please try again.")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || errorData.message || `Failed to create conversation (${response.status})`
        setConversationError(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = error.message || "Network error. Please check your connection and try again."
      setConversationError(errorMsg)
    } finally {
      setCreatingConversation(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const token = sessionStorage.getItem("applicantToken")
      const formData = new FormData()

      Array.from(files).forEach((file) => {
        formData.append("documents", file)
      })

      const response = await fetch(`/api/zakat-applicants/${applicantId}/documents?token=${token}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to upload documents")
      }

      showToast("Documents uploaded successfully", "success")
      fetchApplicant()
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      showToast(error.message || "Failed to upload documents", "error")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }

    setDeletingDocId(documentId)
    try {
      const token = sessionStorage.getItem("applicantToken")
      const response = await fetch(`/api/zakat-applicants/${applicantId}/documents/${documentId}?token=${token}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete document")
      }

      showToast("Document deleted successfully", "success")
      fetchApplicant()
    } catch (error: any) {
      showToast(error.message || "Failed to delete document", "error")
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("applicantToken")
    sessionStorage.removeItem("applicantId")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your application...</p>
        </div>
      </div>
    )
  }

  if (!applicant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find your application. Please check your link.</p>
          <Link href="/" className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    Pending: "bg-yellow-50 border-yellow-200 text-yellow-800",
    Approved: "bg-green-50 border-green-200 text-green-800",
    Rejected: "bg-red-50 border-red-200 text-red-800",
    "Ready for Approval": "bg-blue-50 border-blue-200 text-blue-800",
    "Need Info": "bg-orange-50 border-orange-200 text-orange-800",
    "In Review": "bg-purple-50 border-purple-200 text-purple-800",
  }

  const statusIcon: Record<string, React.ReactNode> = {
    Pending: <Clock className="w-5 h-5" />,
    Approved: <CheckCircle className="w-5 h-5" />,
    Rejected: <AlertCircle className="w-5 h-5" />,
    "Ready for Approval": <CheckCircle className="w-5 h-5" />,
    "Need Info": <AlertCircle className="w-5 h-5" />,
    "In Review": <Clock className="w-5 h-5" />,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={150} height={150} priority className="h-12 w-auto" />
            </Link>
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">Application Portal</h1>
              <p className="text-sm text-gray-500">Case ID: {applicant.caseId}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Banner */}
        <div className="mb-6">
          <div className={`p-4 border rounded-xl flex items-center gap-3 ${statusColors[applicant.status] || statusColors.Pending}`}>
            {statusIcon[applicant.status] || statusIcon.Pending}
            <div>
              <p className="font-semibold">Status: {applicant.status}</p>
              <p className="text-sm">Submitted on {new Date(applicant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("information")}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "information"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Info className="w-5 h-5" />
                Information
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "about"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <User className="w-5 h-5" />
                About Me
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "messages"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Messages
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "information" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Case ID</label>
                        <p className="text-gray-900 font-semibold mt-1">{applicant.caseId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-gray-900 font-semibold mt-1">{applicant.firstName} {applicant.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900 font-semibold mt-1">{applicant.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900 font-semibold mt-1">{applicant.mobilePhone}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Request Type</label>
                        <p className="text-gray-900 font-semibold mt-1">{applicant.requestType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Amount Requested</label>
                        <p className="text-gray-900 font-semibold mt-1">${applicant.amountRequested?.toLocaleString() || "0"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application Date</label>
                        <p className="text-gray-900 font-semibold mt-1">{new Date(applicant.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Documents</h3>
                      <p className="text-sm text-gray-600 mt-1">Manage your application documents</p>
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="document-upload"
                      />
                      <label
                        htmlFor="document-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition cursor-pointer font-medium"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Upload Documents
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {applicant.documents.length > 0 ? (
                    <div className="space-y-3">
                      {applicant.documents.map((doc) => (
                        <div
                          key={doc._id}
                          className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-6 h-6 text-teal-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 font-medium text-sm truncate">{doc.originalname}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                {(doc.size / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition text-sm font-medium"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(doc._id)}
                              disabled={deletingDocId === doc._id}
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                            >
                              {deletingDocId === doc._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">No documents uploaded yet</p>
                      <p className="text-sm text-gray-500 mt-2">Click "Upload Documents" to add files</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About Your Application</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                        <p className="text-gray-900 mt-1">
                          {applicant.dateOfBirth ? new Date(applicant.dateOfBirth).toLocaleDateString() : "Not provided"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-900 mt-1 capitalize">{applicant.gender || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-gray-900 mt-1">
                          {applicant.streetAddress ? (
                            <>
                              {applicant.streetAddress}
                              {applicant.city && <>, {applicant.city}</>}
                              {applicant.state && <> {applicant.state}</>}
                              {applicant.zipCode && <> {applicant.zipCode}</>}
                            </>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment & Family</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Employment Status</label>
                        <p className="text-gray-900 mt-1 capitalize">{applicant.employmentStatus || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Monthly Income</label>
                        <p className="text-gray-900 mt-1">
                          {applicant.totalMonthlyIncome ? `$${applicant.totalMonthlyIncome.toLocaleString()}` : "Not provided"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Dependents</label>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{applicant.dependentsInfo || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Why are you applying?</label>
                      <p className="text-gray-900 mt-2 whitespace-pre-wrap">{applicant.whyApplying || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Your circumstances</label>
                      <p className="text-gray-900 mt-2 whitespace-pre-wrap">{applicant.circumstances || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "messages" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Messages</h2>
                <p className="text-gray-600 mb-6">Communicate with the Rahmah team about your application. You can send messages and images here.</p>
                {conversationId && !creatingConversation ? (
                  <ApplicantMessages caseId={applicant.caseId || applicant._id} conversationId={conversationId} maxHeight="h-[600px]" />
                ) : creatingConversation ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <p className="ml-3 text-gray-600">Setting up messaging...</p>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-700 font-medium mb-2">Unable to load messaging</p>
                    {conversationError && <p className="text-sm text-gray-600 mb-4">{conversationError}</p>}
                    <button
                      onClick={createOrGetConversation}
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
