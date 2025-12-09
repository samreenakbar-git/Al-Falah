"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { getAuthToken, removeAuthToken, authenticatedFetch } from "@/lib/auth-utils"

// interface Document {
//   filename: string
//   originalname: string
//   mimeType: string
//   size: number
//   path: string
//   url: string
// }

interface Case {

  _id: string
  caseId: string
  firstName: string
  lastName: string
  requestType: string
  amountRequested: number | null
  status: string
  createdAt: string
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

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Redirect if no token
  useEffect(() => {
    const token = getAuthToken()
    if (!token) router.push("/staff/login")
  }, [router])

  // Fetch cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await authenticatedFetch(`/api/zakat-applicants`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const result: ApiResponse = await res.json()
        setCases(Array.isArray(result.items) ? result.items : [])
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
  }, [])

  const handleLogout = () => {
    removeAuthToken()
    router.push("/staff/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/staff/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo1.svg"
            alt="Rahmah Exchange Logo"
            width={140}
            height={140}
            priority
          />
        </Link>
          <div className="flex items-center gap-4">
            <Link href="/staff/dashboard" className="text-gray-600 hover:text-gray-900 font-medium transition">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition">
              Dashboard
              </button>
            </Link>
            {/* <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">All Cases</h2>
            <p className="text-gray-600">Manage and review all applicants</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/staff/cases/add">
              <button className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Case
              </button>
            </Link>
            <Link href="/staff/cases/add-old">
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Old Case
              </button>
            </Link>
          </div>
        </div>

        {loading && <div className="bg-white rounded-lg p-12 text-center text-gray-600">Loading cases...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
        {!loading && !error && cases.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center text-gray-600">No cases found</div>
        )}

        {/* Cases Grid */}
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
                  <Link href={`/staff/cases/${caseItem._id}`}>
                    <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">
                      Review
                    </button>
                  </Link>
                </div>
              </div>
    
              {/* {caseItem.documents && caseItem.documents.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Documents</h4>
                  <div className="space-y-2">
                    {caseItem.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-100 transition"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{doc.originalname}</p>
                          <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button
                          onClick={() => window.open(doc.url, "_blank")}
                          className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs font-medium"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
// "use client"
// import React from "react"
// import Link from "next/link"
// import { Heart, ChevronLeft, Download, X } from "lucide-react"
// import { useState, useEffect } from "react"

// interface CaseDetail {
//   _id: string
//   firstName: string
//   lastName: string
//   caseId: string
//   status: string
//   streetAddress: string
//   city: string
//   state: string
//   zipCode: string
//   gender: string
//   dateOfBirth: string
//   mobilePhone: string
//   homePhone: string
//   email: string
//   legalStatus: string
//   referredBy: string
//   employmentStatus: string
//   dependentsInfo: string
//   totalMonthlyIncome: number
//   incomeSources: string
//   rentMortgage: number
//   utilities: number
//   food: number
//   otherExpenses: string
//   totalDebts: number
//   requestType: string
//   amountRequested: number
//   whyApplying: string
//   circumstances: string
//   previousZakat: string
//   reference1: {
//     fullName: string
//     phoneNumber: string
//     email: string
//     relationship: string
//   }
//   reference2: {
//     fullName: string
//     phoneNumber: string
//     email: string
//     relationship: string
//   }
//   documents: Array<{
//     filename: string
//     originalname: string
//     mimeType: string
//     size: number
//     url?: string
//   }>
//   createdAt: string
//   updatedAt: string
// }

// interface GrantData {
//   _id: string
//   applicantId: string
//   grantedAmount: number
//   status: string
//   remarks: string
//   createdAt: string
//   updatedAt: string
// }

// function DocumentViewer({
//   doc,
//   isOpen,
//   onClose,
// }: {
//   doc: CaseDetail["documents"][0] | null
//   isOpen: boolean
//   onClose: () => void
// }) {
//   if (!isOpen || !doc) return null

//   const documentUrl = (doc as any).url || `/api/documents/${(doc as any).filename}`
//   const isPdf = doc.mimeType === "application/pdf"
//   const isImage = doc.mimeType.startsWith("image/")

//   const handleDownload = async () => {
//     try {
//       const response = await fetch(documentUrl)
//       const blob = await response.blob()
//       const url = window.URL.createObjectURL(blob)
//       const link = document.createElement("a")
//       link.href = url
//       link.download = doc.originalname
//       document.body.appendChild(link)
//       link.click()
//       window.URL.revokeObjectURL(url)
//       document.body.removeChild(link)
//     } catch (error) {
//       console.error("Error downloading document:", error)
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
//         <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
//           <h3 className="text-lg font-semibold text-gray-900">{doc.originalname}</h3>
//           <div className="flex gap-2">
//             <button
//               onClick={handleDownload}
//               className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
//             >
//               <Download className="w-4 h-4" />
//               Download
//             </button>
//             <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
//               <X className="w-5 h-5 text-gray-600" />
//             </button>
//           </div>
//         </div>

//         <div className="p-6">
//           {isPdf ? (
//             <iframe
//               src={documentUrl}
//               className="w-full h-[70vh] border border-gray-300 rounded-lg"
//               title={doc.originalname}
//             />
//           ) : isImage ? (
//             <img
//               src={documentUrl || "/placeholder.svg"}
//               alt={doc.originalname}
//               className="max-w-full h-auto mx-auto rounded-lg"
//             />
//           ) : (
//             <div className="text-center py-12">
//               <p className="text-gray-600">Preview not available for this file type</p>
//               <button
//                 onClick={handleDownload}
//                 className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
//               >
//                 Download File
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

// export default function Page({ params }: { params: Promise<{ id: string }> }) {
//   const { id } = React.use(params)
//   const [caseData, setCaseData] = useState<CaseDetail | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const [updateStatus, setUpdateStatus] = useState("")
//   const [isUpdating, setIsUpdating] = useState(false)
//   const [selectedDocument, setSelectedDocument] = useState<CaseDetail["documents"][0] | null>(null)
//   const [showDocumentViewer, setShowDocumentViewer] = useState(false)
//   const [updateError, setUpdateError] = useState<string | null>(null)

//   const [grantData, setGrantData] = useState<GrantData | null>(null)
//   const [grantedAmount, setGrantedAmount] = useState<number | "">("")
//   const [remarks, setRemarks] = useState("")
//   const [loadingGrant, setLoadingGrant] = useState(true)

//   // ✅ Fetch case detail
//   useEffect(() => {
//     const fetchCaseDetail = async () => {
//       try {
//         setLoading(true)
//         const url = `/api/zakat-applicants/${id}`
//         const res = await fetch(url, {
//           method: "GET",
//           headers: { "Content-Type": "application/json", Accept: "application/json" },
//           cache: "no-store",
//         })

//         if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
//         const caseItem = await res.json()
//         if (!caseItem || !caseItem._id) throw new Error("Invalid case data structure in response")

//         setCaseData(caseItem)
//         setUpdateStatus(caseItem.status || "Pending")
//         setError(null)
//       } catch (err) {
//         setError(err instanceof Error ? err.message : String(err))
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (id) fetchCaseDetail()
//   }, [id])

//   // ✅ Fetch grants with token
//   useEffect(() => {
//     const fetchGrantData = async () => {
//       try {
//         if (!id) return
//         setLoadingGrant(true)

//         const token = localStorage.getItem("rahmah_admin_token")
//         if (!token) return

//         const url = `/api/grants?applicantId=${id}`
//         const res = await fetch(url, {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//             Authorization: `Bearer ${token}`, // ✅ token attached
//           },
//           cache: "no-store",
//         })

//         if (!res.ok) throw new Error(`Grant API error: ${res.status} ${res.statusText}`)
//         const data = await res.json()
//         let grantInfo = null
//         if (data.items && Array.isArray(data.items) && data.items.length > 0) grantInfo = data.items[0]
//         else if (Array.isArray(data) && data.length > 0) grantInfo = data[0]
//         else if (data._id) grantInfo = data

//         if (grantInfo) {
//           setGrantData(grantInfo)
//           setGrantedAmount(grantInfo.grantedAmount || "")
//           setRemarks(grantInfo.remarks || "")
//           setUpdateStatus(grantInfo.status || updateStatus)
//         }
//       } catch (err) {
//         console.error("Error fetching grant data:", err instanceof Error ? err.message : String(err))
//       } finally {
//         setLoadingGrant(false)
//       }
//     }

//     fetchGrantData()
//   }, [id, updateStatus])

//   // ✅ Update applicant and grant
//   const handleStatusUpdate = async () => {
//     try {
//       setIsUpdating(true)
//       setUpdateError(null)

//       const token = localStorage.getItem("rahmah_admin_token")
//       if (!token) {
//         setUpdateError("Authentication token not found. Please log in again.")
//         return
//       }

//       const applicantResponse = await fetch(`/api/zakat-applicants/${id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ status: updateStatus }),
//       })

//       if (!applicantResponse.ok) {
//         const errorData = await applicantResponse.json().catch(() => ({}))
//         throw new Error(errorData.message || `Update failed: ${applicantResponse.status}`)
//       }

//       const updatedData = await applicantResponse.json()
//       setCaseData(updatedData?.applicant || updatedData)
//       if (updatedData?.applicant?.status) {
//         setUpdateStatus(updatedData.applicant.status)
//       }

//       if (grantedAmount !== "" && grantedAmount !== null) {
//         const grantPayload = {
//           applicantId: id,
//           grantedAmount: Number(grantedAmount),
//           status: updateStatus,
//           remarks: remarks || "",
//         }

//         const grantResponse = await fetch(`/api/grants`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(grantPayload),
//         })

//         if (grantResponse.ok) {
//           const grantResult = await grantResponse.json()
//           setGrantData(grantResult)
//           // Update form fields with the grant result
//           setGrantedAmount(grantResult.grantedAmount || "")
//           setRemarks(grantResult.remarks || "")
//           setUpdateStatus(grantResult.status || updateStatus)
//         } else {
//           const errorData = await grantResponse.json().catch(() => ({}))
//           throw new Error(errorData.message || `Grant creation failed: ${grantResponse.status}`)
//         }
//       }

//       // Refresh grant data to get the latest information
//       const grantRefreshResponse = await fetch(`/api/grants?applicantId=${id}`, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         cache: "no-store",
//       })

//       if (grantRefreshResponse.ok) {
//         const grantRefreshData = await grantRefreshResponse.json()
//         if (grantRefreshData.items && grantRefreshData.items.length > 0) {
//           const latestGrant = grantRefreshData.items[0]
//           setGrantData(latestGrant)
//           setGrantedAmount(latestGrant.grantedAmount || "")
//           setRemarks(latestGrant.remarks || "")
//         }
//       }

//       setUpdateError(null)
//     } catch (err) {
//       setUpdateError(err instanceof Error ? err.message : String(err))
//     } finally {
//       setIsUpdating(false)
//     }
//   }

//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p>Loading case details...</p>
//       </div>
//     )

//   if (error || !caseData)
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p className="text-red-600">{error || "Case not found"}</p>
//       </div>
//     )
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50">
//       <header className="bg-white border-b border-gray-200 px-8 py-6">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
//               <Heart className="w-5 h-5 text-white fill-white" />
//             </div>
//             <h1 className="text-2xl font-bold text-gray-900">Caseworker Dashboard</h1>
//           </div>
//           <Link href="/staff/cases" className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1">
//             <ChevronLeft className="w-4 h-4" />
//             Back to Cases
//           </Link>
//         </div>
//       </header>

//       <div className="max-w-7xl mx-auto px-8 py-12">
//         <div className="grid grid-cols-3 gap-8">
//           <div className="col-span-2">
//             {/* Header Section */}
//             <div className="mb-8">
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <h1 className="text-3xl font-bold text-gray-900">
//                     {caseData.firstName} {caseData.lastName}
//                   </h1>
//                 </div>
//                 <span
//                   className={`px-4 py-2 rounded-full text-sm font-medium ${
//                     caseData.status === "Pending"
//                       ? "bg-yellow-100 text-yellow-800"
//                       : caseData.status === "Approved"
//                         ? "bg-green-100 text-green-800"
//                         : "bg-red-100 text-red-800"
//                   }`}
//                 >
//                   {caseData.status}
//                 </span>
//               </div>

//               {/* Tabs */}
//               <div className="flex gap-6 border-b border-gray-200 mt-6">
//                 <button className="pb-4 px-2 border-b-2 border-teal-600 text-teal-600 font-medium">Application</button>
//               </div>
//             </div>

//             {/* Personal Information Section */}
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

//               <div className="grid grid-cols-2 gap-6">
//                 <div>
//                   <p className="text-sm text-gray-600">First Name</p>
//                   <p className="text-gray-900 font-medium">{caseData.firstName}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Last Name</p>
//                   <p className="text-gray-900 font-medium">{caseData.lastName}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Email</p>
//                   <p className="text-gray-900 font-medium">{caseData.email || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Mobile Phone</p>
//                   <p className="text-gray-900 font-medium">{caseData.mobilePhone || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Date of Birth</p>
//                   <p className="text-gray-900 font-medium">
//                     {caseData.dateOfBirth ? new Date(caseData.dateOfBirth).toLocaleDateString() : "N/A"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Gender</p>
//                   <p className="text-gray-900 font-medium">{caseData.gender || "N/A"}</p>
//                 </div>
//               </div>

//               <div className="mt-6">
//                 <p className="text-sm text-gray-600">Address</p>
//                 <p className="text-gray-900 font-medium">
//                   {caseData.streetAddress}, {caseData.city}, {caseData.state} {caseData.zipCode}
//                 </p>
//               </div>
//             </div>

//             {/* Household Information Section */}
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">Household & Employment Information</h2>

//               <div className="grid grid-cols-2 gap-6">
//                 <div>
//                   <p className="text-sm text-gray-600">Legal Status</p>
//                   <p className="text-gray-900 font-medium">{caseData.legalStatus || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Employment Status</p>
//                   <p className="text-gray-900 font-medium">{caseData.employmentStatus || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Dependents Info</p>
//                   <p className="text-gray-900 font-medium">{caseData.dependentsInfo || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Referred By</p>
//                   <p className="text-gray-900 font-medium">{caseData.referredBy || "N/A"}</p>
//                 </div>
//               </div>
//             </div>

//             {/* Financial Information Section */}
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Information</h2>

//               <div className="grid grid-cols-2 gap-6 mb-8">
//                 <div>
//                   <p className="text-sm text-gray-600">Total Monthly Income</p>
//                   <p className="text-gray-900 font-medium">${caseData.totalMonthlyIncome || 0}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Income Sources</p>
//                   <p className="text-gray-900 font-medium">{caseData.incomeSources || "N/A"}</p>
//                 </div>
//               </div>

//               <h3 className="font-semibold text-gray-900 mb-4">Monthly Expenses</h3>
//               <div className="grid grid-cols-2 gap-6 mb-6">
//                 <div>
//                   <p className="text-sm text-gray-600">Food</p>
//                   <p className="text-gray-900 font-medium">${caseData.food || 0}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Rent/Mortgage</p>
//                   <p className="text-gray-900 font-medium">${caseData.rentMortgage || 0}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Utilities</p>
//                   <p className="text-gray-900 font-medium">${caseData.utilities || 0}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Other Expenses</p>
//                   <p className="text-gray-900 font-medium">{caseData.otherExpenses || "N/A"}</p>
//                 </div>
//               </div>

//               <div>
//                 <p className="text-sm text-gray-600">Total Debts</p>
//                 <p className="text-gray-900 font-medium text-lg">${caseData.totalDebts || 0}</p>
//               </div>
//             </div>

//             {/* Request Details Section */}
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">Request Details</h2>

//               <div className="grid grid-cols-2 gap-6">
//                 <div>
//                   <p className="text-sm text-gray-600">Request Type</p>
//                   <p className="text-gray-900 font-medium">{caseData.requestType}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Amount Requested</p>
//                   <p className="text-gray-900 font-medium">${caseData.amountRequested}</p>
//                 </div>
//               </div>

//               <div className="mt-6">
//                 <p className="text-sm text-gray-600">Why Applying</p>
//                 <p className="text-gray-900 font-medium">{caseData.whyApplying}</p>
//               </div>

//               <div className="mt-6">
//                 <p className="text-sm text-gray-600">Circumstances</p>
//                 <p className="text-gray-900 font-medium">{caseData.circumstances}</p>
//               </div>

//               <div className="mt-6">
//                 <p className="text-sm text-gray-600">Previous Zakat</p>
//                 <p className="text-gray-900 font-medium">{caseData.previousZakat}</p>
//               </div>
//             </div>

//             {/* References Section */}
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">References</h2>

//               <h3 className="font-semibold text-gray-900 mb-4">Reference 1</h3>
//               <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
//                 <div>
//                   <p className="text-sm text-gray-600">Full Name</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference1?.fullName || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Relationship</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference1?.relationship || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Phone Number</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference1?.phoneNumber || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Email</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference1?.email || "N/A"}</p>
//                 </div>
//               </div>

//               <h3 className="font-semibold text-gray-900 mb-4">Reference 2</h3>
//               <div className="grid grid-cols-2 gap-6">
//                 <div>
//                   <p className="text-sm text-gray-600">Full Name</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference2?.fullName || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Relationship</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference2?.relationship || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Phone Number</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference2?.phoneNumber || "N/A"}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Email</p>
//                   <p className="text-gray-900 font-medium">{caseData.reference2?.email || "N/A"}</p>
//                 </div>
//               </div>
//             </div>
//             <div className="bg-white rounded-lg p-6 mb-8">
//               <h2 className="text-xl font-bold text-gray-900 mb-6">Documents</h2>
//               {caseData.documents && caseData.documents.length > 0 ? (
//                 <div className="space-y-3">
//                   {caseData.documents.map((doc, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
//                     >
//                       <div className="flex-1">
//                         <p className="text-sm font-medium text-gray-900">{doc.originalname}</p>
//                         <p className="text-xs text-gray-600 mt-1">{(doc.size / 1024).toFixed(2)} KB</p>
//                       </div>
//                       <button
//                         onClick={() => {
//                           setSelectedDocument(doc)
//                           setShowDocumentViewer(true)
//                         }}
//                         className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
//                       >
//                         View
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <p className="text-gray-600">No documents available</p>
//               )}
//             </div>
//           </div>

//           {/* Right Sidebar - Case Actions */}
//           <div className="col-span-1">
//             <div className="bg-white rounded-lg p-6 mb-6">
//               <h3 className="text-lg font-bold text-gray-900 mb-6">Case Actions</h3>

//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
//                 <select
//                   value={updateStatus}
//                   onChange={(e) => setUpdateStatus(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                 >
//                   <option value="Pending">Pending</option>
//                   <option value="Approved">Approved</option>
//                   <option value="Rejected">Rejected</option>
//                 </select>
//               </div>

//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-900 mb-2">Granted Amount</label>
//                 <input
//                   type="number"
//                   value={grantedAmount}
//                   onChange={(e) => setGrantedAmount(e.target.value === "" ? "" : Number(e.target.value))}
//                   placeholder="Enter granted amount"
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                 />
//               </div>

//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-900 mb-2">Remarks</label>
//                 <textarea
//                   value={remarks}
//                   onChange={(e) => setRemarks(e.target.value)}
//                   placeholder="Add any remarks about this grant"
//                   rows={3}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
//                 />
//               </div>

//               {updateError && (
//                 <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
//                   <p className="text-sm text-red-700">{updateError}</p>
//                 </div>
//               )}

//               <button
//                 onClick={handleStatusUpdate}
//                 disabled={isUpdating}
//                 className="w-full bg-teal-600 text-white font-medium py-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isUpdating ? "Updating..." : "Update Status & Grant"}
//               </button>
//             </div>

//             {/* Granted Amount Display - Prominently shown below Case Actions */}
//             {grantData && grantData.grantedAmount && (
//               <div className="bg-white rounded-lg p-6 mt-6 border-2 border-teal-200">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm text-gray-600 mb-1">Granted Amount</p>
//                     <p className="text-3xl font-bold text-teal-600">${grantData.grantedAmount.toLocaleString()}</p>
//                     <p className="text-xs text-gray-500 mt-2">
//                       Status: <span className="font-medium text-gray-900">{grantData.status}</span>
//                     </p>
//                     {grantData.remarks && <p className="text-sm text-gray-700 mt-2 italic">"{grantData.remarks}"</p>}
//                   </div>
//                   <div className="text-right">
//                     <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
//                       <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                         />
//                       </svg>
//                     </div>
//                   </div>
//                 </div>
//                 {grantData.createdAt && (
//                   <p className="text-xs text-gray-500 mt-4">
//                     Granted on:{" "}
//                     {new Date(grantData.createdAt).toLocaleDateString("en-US", {
//                       year: "numeric",
//                       month: "long",
//                       day: "numeric",
//                     })}
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* Quick Stats */}
//             <div className="bg-white rounded-lg p-6 mt-6">
//               <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>

//               <div className="space-y-4">
//                 <div>
//                   <p className="text-sm text-gray-600">Case ID</p>
//                   <p className="text-gray-900 font-medium">{caseData.caseId}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Submitted</p>
//                   <p className="text-gray-900 font-medium">{new Date(caseData.createdAt).toLocaleDateString()}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Documents</p>
//                   <p className="text-gray-900 font-medium">{caseData.documents?.length || 0}</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Document Viewer Modal */}
//       <DocumentViewer doc={selectedDocument} isOpen={showDocumentViewer} onClose={() => setShowDocumentViewer(false)} />
//     </div>
//   )
// }
