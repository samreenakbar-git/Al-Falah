"use client"
import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Download, X, Edit, Upload, Trash2, FileText, Mail } from 'lucide-react'
import { useState, useEffect } from "react"
import CaseEditModal from "@/components/case-edit-modal"
import { getAuthToken } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"

interface CaseDetail {
  _id: string
  firstName: string
  lastName: string
  caseId: string
  status: string
  streetAddress: string
  city: string
  state: string
  zipCode: string
  gender: string
  dateOfBirth: string
  mobilePhone: string
  homePhone: string
  email: string
  legalStatus: string
  referredBy: string
  employmentStatus: string
  dependentsInfo: string
  totalMonthlyIncome: number
  incomeSources: string
  rentMortgage: number
  utilities: number
  food: number
  otherExpenses: string
  totalDebts: number
  requestType: string
  amountRequested: number
  whyApplying: string
  circumstances: string
  previousZakat: string
  zakatResourceSource?: string
  reference1: {
    fullName: string
    phoneNumber: string
    email: string
    relationship: string
  }
  reference2: {
    fullName: string
    phoneNumber: string
    email: string
    relationship: string
  }
  documents: Array<{
    filename: string
    originalname: string
    mimeType: string
    size: number
    url?: string
  }>
  createdAt: string
  updatedAt: string
}

interface GrantData {
  _id: string
  applicantId: string
  grantedAmount?: number
  numberOfMonths?: number
  status: string
  remarks?: string
  paymentDocuments?: Array<{
    _id?: string
    filename: string
    originalname: string
    url: string
    mimeType?: string
    size?: number
    uploadedAt?: string
    uploadedBy?: string
  }>
  createdAt: string
  updatedAt: string
}

function DocumentViewer({
  doc,
  isOpen,
  onClose,
}: {
  doc: CaseDetail["documents"][0] | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !doc) return null

  const documentUrl = (doc as any).url || `/api/documents/${(doc as any).filename}`
  const isPdf = doc.mimeType === "application/pdf"
  const isImage = doc.mimeType.startsWith("image/")

  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = doc.originalname
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading document:", error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{doc.originalname}</h3>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-[70vh] border border-gray-300 rounded-lg"
              title={doc.originalname}
            />
          ) : isImage ? (
            <img
              src={documentUrl || "/placeholder.svg"}
              alt={doc.originalname}
              className="max-w-full h-auto mx-auto rounded-lg"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Preview not available for this file type</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApprovalNotesSection({
  caseId,
  applicantId,
  updateStatus,
  onStatusUpdate,
  userRole,
}: {
  caseId: string
  applicantId: string
  updateStatus: string
  onStatusUpdate: () => Promise<void>
  userRole: string
}) {
  const [approvalNote, setApprovalNote] = useState("")
  const [approvalAmount, setApprovalAmount] = useState<number | "">("")
  const [notesHistory, setNotesHistory] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState("")
  const [editNoteAmount, setEditNoteAmount] = useState<number | "">("")
  
  const canEditNotes = userRole === "approver" || userRole === "admin"

  // Fetch notes history
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoadingNotes(true)
        const token = getAuthToken()
        if (!token) return

        const res = await fetch(`/api/cases/${caseId}/notes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          // Filter for approval notes
          const approvalNotes = (data.notes || []).filter(
            (note: any) => note.noteType === "approval_note" || note.authorRole === "approver"
          )
          setNotesHistory(approvalNotes)
        }
      } catch (err) {
        console.error("Error fetching notes:", err)
      } finally {
        setLoadingNotes(false)
      }
    }

    if (caseId) fetchNotes()
  }, [caseId])

  const handleSaveNote = async () => {
    if (!approvalNote.trim()) {
      setNoteError("Note content is required")
      return
    }

    try {
      setSavingNote(true)
      setNoteError(null)
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      // Save note
      const noteRes = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: approvalNote,
          noteType: "approval_note",
          isInternal: true,
          approvalAmount: approvalAmount !== "" ? Number(approvalAmount) : undefined,
        }),
      })

      if (!noteRes.ok) {
        const errorData = await noteRes.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to save note")
      }

      // If status is being changed to Approved, update status and send email
      if (updateStatus === "Approved") {
        await onStatusUpdate()
      }

      // Refresh notes
      const notesRes = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (notesRes.ok) {
        const data = await notesRes.json()
        const approvalNotes = (data.notes || []).filter(
          (note: any) => note.noteType === "approval_note" || note.authorRole === "approver"
        )
        setNotesHistory(approvalNotes)
      }

      // Clear form
      setApprovalNote("")
      setApprovalAmount("")
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      const res = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete note")
      }

      // Refresh notes
      const notesRes = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (notesRes.ok) {
        const data = await notesRes.json()
        const approvalNotes = (data.notes || []).filter(
          (note: any) => note.noteType === "approval_note" || note.authorRole === "approver"
        )
        setNotesHistory(approvalNotes)
      }
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to delete note")
    }
  }

  const handleEditNote = (note: any) => {
    setEditingNoteId(note._id)
    setEditNoteContent(note.content)
    setEditNoteAmount(note.approvalAmount || "")
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditNoteContent("")
    setEditNoteAmount("")
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) {
      setNoteError("Note content is required")
      return
    }

    try {
      setSavingNote(true)
      setNoteError(null)
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      const res = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editNoteContent,
          approvalAmount: editNoteAmount !== "" ? Number(editNoteAmount) : undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update note")
      }

      // Refresh notes
      const notesRes = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (notesRes.ok) {
        const data = await notesRes.json()
        const approvalNotes = (data.notes || []).filter(
          (note: any) => note.noteType === "approval_note" || note.authorRole === "approver"
        )
        setNotesHistory(approvalNotes)
      }

      handleCancelEdit()
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to update note")
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="mb-6 mt-6 border-t pt-6">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Approval Notes</h4>

      {/* Add Note Form - Only for Approvers */}
      {canEditNotes && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Approval Amount (Optional)
            </label>
            <input
              type="number"
              value={approvalAmount}
              onChange={(e) => setApprovalAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Enter approval amount"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Amount you are approving for this case</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Add your approval notes..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {noteError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{noteError}</p>
            </div>
          )}

          <button
            onClick={handleSaveNote}
            disabled={savingNote || !approvalNote.trim()}
            className="w-full bg-teal-600 text-white font-medium py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNote ? "Saving..." : "Save Note"}
          </button>
        </>
      )}

      {/* Notes History - Visible to All Users */}
      {notesHistory.length > 0 && (
        <div className="mt-6">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Notes History</h5>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notesHistory.map((note: any) => (
              <div
                key={note._id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                {editingNoteId === note._id && canEditNotes ? (
                  // Edit Mode
                  <div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Approval Amount
                      </label>
                      <input
                        type="number"
                        value={editNoteAmount}
                        onChange={(e) => setEditNoteAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Enter approval amount"
                        min="0"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                      <textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateNote(note._id)}
                        disabled={savingNote || !editNoteContent.trim()}
                        className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 disabled:opacity-50"
                      >
                        {savingNote ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingNote}
                        className="px-3 py-1.5 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {note.authorName || note.authorEmail || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.approvalAmount && (
                          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded">
                            ${note.approvalAmount.toLocaleString()}
                          </span>
                        )}
                        {canEditNotes && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditNote(note)}
                              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note._id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingNotes && (
        <p className="text-sm text-gray-500 mt-4">Loading notes history...</p>
      )}
    </div>
  )
}

function RoleBasedStatusSection({
  caseData,
  updateStatus,
  setUpdateStatus,
  grantedAmount,
  setGrantedAmount,
  remarks,
  setRemarks,
  numberOfMonths,
  setNumberOfMonths,
  grantData,
  isUpdating,
  updateError,
  onStatusUpdate,
  userRole,
  applicantId,
  onNumberOfMonthsUpdate,
}: {
  caseData: CaseDetail
  updateStatus: string
  setUpdateStatus: (status: string) => void
  grantedAmount: number | ""
  setGrantedAmount: (amount: number | "") => void
  remarks: string
  setRemarks: (remarks: string) => void
  numberOfMonths: number | ""
  setNumberOfMonths: (months: number | "") => void
  grantData: GrantData | null
  isUpdating: boolean
  updateError: string | null
  onStatusUpdate: () => Promise<void>
  userRole: string
  applicantId: string
  onNumberOfMonthsUpdate: () => Promise<void>
}) {
  const getAvailableStatusOptions = () => {
    const baseStatuses = ["Pending", "In Review", "Need Info"]

    switch (userRole) {
      case "admin":
        return [...baseStatuses, "Ready for Approval", "Approved", "Rejected"]
      case "caseworker":
        return [...baseStatuses, "Ready for Approval"]
      case "approver":
        return ["Ready for Approval", "Approved", "Rejected", "Pending", "In Review"] // Approvers can set status when adding amount
      case "treasurer":
        return ["Approved"] // Treasurer can only confirm approved status
      default:
        return baseStatuses
    }
  }

  const availableStatuses = getAvailableStatusOptions()
  const canUpdateStatus = availableStatuses.length > 0
  // Everyone can see granted amount, but only approvers can edit it
  const canSeeGrant = userRole === "approver" || userRole === "treasurer" || userRole === "admin" || userRole === "caseworker"
  const canSetGrantAmount = userRole === "approver" // Only approvers can set grant amount
  // Everyone can see numberOfMonths, but only caseworkers can edit
  const canSeeNumberOfMonths = true // Visible to everyone
  const canSetNumberOfMonths = userRole === "caseworker" // Only caseworkers can edit
  // Approvers can add notes and approval amount
  const canAddApprovalNotes = userRole === "approver" || userRole === "admin"

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-6">Case Actions</h3>

      {!canUpdateStatus && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          You don't have permission to update the status for this case.
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
        <select
          value={updateStatus}
          onChange={(e) => setUpdateStatus(e.target.value)}
          disabled={!canUpdateStatus}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {canSeeGrant && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Granted Amount</label>
            {canSetGrantAmount ? (
              <input
                type="number"
                value={grantedAmount}
                onChange={(e) => setGrantedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter granted amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {grantData?.grantedAmount ? (
                  <p className="text-gray-900 font-medium">${grantData.grantedAmount.toLocaleString()}</p>
                ) : (
                  <p className="text-gray-400 italic">Not added yet</p>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Remarks</label>
            {/* Caseworkers and approvers can edit remarks */}
            {(canSetGrantAmount || userRole === "caseworker" || userRole === "admin") ? (
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks about this grant"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[80px]">
                {grantData?.remarks ? (
                  <p className="text-gray-900 whitespace-pre-wrap">{grantData.remarks}</p>
                ) : (
                  <p className="text-gray-400 italic">Not added yet</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {updateError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{updateError}</p>
        </div>
      )}

      <button
        onClick={onStatusUpdate}
        disabled={isUpdating || !canUpdateStatus}
        className="w-full bg-teal-600 text-white font-medium py-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? "Updating..." : canSeeGrant ? "Update Status & Grant" : "Update Status"}
      </button>

      {/* Number of Months - Visible to everyone, editable only by caseworkers */}
      {canSeeNumberOfMonths && (
        <div className="mb-6 mt-6 border-t pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Number of Months</label>
          {canSetNumberOfMonths ? (
            <>
              <input
                type="number"
                value={numberOfMonths}
                onChange={(e) => setNumberOfMonths(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter number of months"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">How many months will the grant be distributed over?</p>
              <button
                onClick={onNumberOfMonthsUpdate}
                disabled={isUpdating || numberOfMonths === "" || numberOfMonths === null}
                className="w-full mt-3 bg-teal-600 text-white font-medium py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Saving..." : (grantData?.numberOfMonths ? "Update Number of Months" : "Save Number of Months")}
              </button>
            </>
          ) : (
            <>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {grantData?.numberOfMonths ? (
                  <p className="text-gray-900 font-medium">{grantData.numberOfMonths} {grantData.numberOfMonths === 1 ? 'month' : 'months'}</p>
                ) : (
                  <p className="text-gray-400 italic">Not added yet</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">How many months will the grant be distributed over?</p>
            </>
          )}
        </div>
      )}

      {/* General Notes Section - All Staff Can Add Notes */}
      {caseData?.caseId && (
        <GeneralNotesSection
          caseId={caseData.caseId}
          applicantId={applicantId}
          userRole={userRole}
        />
      )}
    </div>
  )
}

function GeneralNotesSection({
  caseId,
  applicantId,
  userRole,
}: {
  caseId: string
  applicantId: string
  userRole: string
}) {
  const [notes, setNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState("")
  const [editNoteTitle, setEditNoteTitle] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // All staff can add notes
  const canAddNotes = true

  // Get current user ID
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setCurrentUserId(decoded.id || null)
      } catch (err) {
        console.error("Failed to decode token:", err)
      }
    }
  }, [])

  // Fetch notes history
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoadingNotes(true)
        const token = getAuthToken()
        if (!token) return

        const res = await fetch(`/api/cases/${caseId}/notes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          // Filter out approval notes (those are shown separately)
          const generalNotes = (data.notes || []).filter(
            (note: any) => note.noteType !== "approval_note"
          )
          setNotes(generalNotes)
        }
      } catch (err) {
        console.error("Error fetching notes:", err)
      } finally {
        setLoadingNotes(false)
      }
    }

    if (caseId) fetchNotes()
  }, [caseId])

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) {
      setNoteError("Note content is required")
      return
    }

    setSavingNote(true)
    setNoteError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      const response = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newNoteTitle.trim() || undefined,
          content: newNoteContent.trim(),
          noteType: "internal_note",
          isInternal: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to save note")
      }

      setNewNoteContent("")
      setNewNoteTitle("")
      
      // Refresh notes
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        const generalNotes = (data.notes || []).filter(
          (note: any) => note.noteType !== "approval_note"
        )
        setNotes(generalNotes)
      }
    } catch (err: any) {
      setNoteError(err.message || "Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) {
      setNoteError("Note content is required")
      return
    }

    setSavingNote(true)
    setNoteError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      const response = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editNoteTitle.trim() || undefined,
          content: editNoteContent.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update note")
      }

      setEditingNoteId(null)
      setEditNoteContent("")
      setEditNoteTitle("")
      
      // Refresh notes
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        const generalNotes = (data.notes || []).filter(
          (note: any) => note.noteType !== "approval_note"
        )
        setNotes(generalNotes)
      }
    } catch (err: any) {
      setNoteError(err.message || "Failed to update note")
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    setSavingNote(true)
    setNoteError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setNoteError("Authentication required")
        return
      }

      const response = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete note")
      }

      // Refresh notes
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        const generalNotes = (data.notes || []).filter(
          (note: any) => note.noteType !== "approval_note"
        )
        setNotes(generalNotes)
      }
    } catch (err: any) {
      setNoteError(err.message || "Failed to delete note")
    } finally {
      setSavingNote(false)
    }
  }

  const startEditing = (note: any) => {
    setEditingNoteId(note._id)
    setEditNoteContent(note.content || "")
    setEditNoteTitle(note.title || "")
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditNoteContent("")
    setEditNoteTitle("")
  }

  const canEditNote = (note: any) => {
    // Admin can edit all notes, others can only edit their own
    if (userRole === "admin") return true
    if (!currentUserId) return false
    const noteAuthorId = note.authorId?._id?.toString() || note.authorId?.toString() || note.authorId
    return noteAuthorId === currentUserId.toString()
  }

  const canDeleteNote = (note: any) => {
    // Admin can delete all notes, others can only delete their own
    if (userRole === "admin") return true
    if (!currentUserId) return false
    const noteAuthorId = note.authorId?._id?.toString() || note.authorId?.toString() || note.authorId
    return noteAuthorId === currentUserId.toString()
  }

  return (
    <div className="mb-6 mt-6 border-t pt-6">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Case Notes</h4>
      <p className="text-sm text-gray-600 mb-4">
        Add notes about this case. All staff members can view and add notes.
      </p>

      {/* Add Note Form - All Staff */}
      {canAddNotes && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Title (Optional)</label>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Enter note title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Note</label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add your note..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {noteError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{noteError}</p>
            </div>
          )}

          <button
            onClick={handleSaveNote}
            disabled={savingNote || !newNoteContent.trim()}
            className="w-full bg-teal-600 text-white font-medium py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNote ? "Saving..." : "Add Note"}
          </button>
        </>
      )}

      {/* Notes History - Visible to All Staff */}
      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">Notes History</h5>
        {loadingNotes ? (
          <div className="text-center py-4 text-gray-500">Loading notes...</div>
        ) : notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note: any) => (
              <div
                key={note._id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                {editingNoteId === note._id ? (
                  <div>
                    <input
                      type="text"
                      value={editNoteTitle}
                      onChange={(e) => setEditNoteTitle(e.target.value)}
                      placeholder="Note title (optional)"
                      className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <textarea
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      rows={3}
                      className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateNote(note._id)}
                        disabled={savingNote}
                        className="px-4 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingNote}
                        className="px-4 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note.title && (
                      <h6 className="font-semibold text-gray-900 mb-1">{note.title}</h6>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {note.authorName || note.authorId?.name || "Unknown Staff"}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{note.authorRole || "Staff"}</span>
                        <span>•</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        {canEditNote(note) && (
                          <button
                            onClick={() => startEditing(note)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteNote(note) && (
                          <button
                            onClick={() => handleDeleteNote(note._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No notes yet. Be the first to add a note!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentDocumentsSection({
  grantId,
  paymentDocuments,
  onDocumentsUpdate,
  userRole,
}: {
  grantId: string
  paymentDocuments: Array<{
    _id?: string
    filename: string
    originalname: string
    url: string
    mimeType?: string
    size?: number
    uploadedAt?: string
    uploadedBy?: string
  }>
  onDocumentsUpdate: () => void
  userRole: string
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const canEdit = userRole === "treasurer" || userRole === "admin"
  const canDelete = userRole === "treasurer" || userRole === "admin"

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
    setError(null)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setError("Authentication required")
        return
      }

      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch(`/api/grants/${grantId}/payment-documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to upload documents")
      }

      setSelectedFiles([])
      setShowUpload(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      onDocumentsUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to upload documents")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this payment document?")) return

    setDeleting(documentId)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setError("Authentication required")
        return
      }

      const encodedDocId = encodeURIComponent(documentId)
      const response = await fetch(`/api/grants/${grantId}/payment-documents/${encodedDocId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete document")
      }

      onDocumentsUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to delete document")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-gray-900">Payment Documents</h4>
        {canEdit && (
          <button
            onClick={() => {
              setShowUpload(!showUpload)
              if (!showUpload && paymentDocuments.length === 0) {
                setIsExpanded(true)
              }
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {paymentDocuments.length === 0 ? "Add Payment Proof" : "Add More"}
          </button>
        )}
      </div>

      {showUpload && canEdit && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,.pdf"
            className="hidden"
            id="payment-doc-upload"
          />
          <div className="flex gap-2">
            <label
              htmlFor="payment-doc-upload"
              className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 cursor-pointer transition flex items-center justify-center gap-2 text-gray-700"
            >
              <Upload className="w-5 h-5" />
              <span>Select Files</span>
            </label>
            {selectedFiles.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {paymentDocuments.length > 0 ? (
        <div className="space-y-2">
          {paymentDocuments.map((doc, index) => {
            const docId = doc._id?.toString() || doc.filename || index.toString()
            const isImage = doc.mimeType?.startsWith("image/") || doc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isImage ? (
                    <div className="w-10 h-10 bg-teal-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-teal-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.originalname}</p>
                    {doc.size && (
                      <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                    )}
                    {doc.uploadedAt && (
                      <p className="text-xs text-gray-400">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                    title="View document"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(docId)}
                      disabled={deleting === docId}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Delete document"
                    >
                      {deleting === docId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        !showUpload && (
          <div className="text-center py-6 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No payment documents uploaded yet</p>
            {canEdit && (
              <p className="text-xs text-gray-400 mt-1">Click "Add Payment Proof" to upload documents</p>
            )}
          </div>
        )
      )}
    </div>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<CaseDetail["documents"][0] | null>(null)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [grantData, setGrantData] = useState<GrantData | null>(null)
  const [grantedAmount, setGrantedAmount] = useState<number | "">("")
  const [remarks, setRemarks] = useState("")
  const [numberOfMonths, setNumberOfMonths] = useState<number | "">("")
  const [loadingGrant, setLoadingGrant] = useState(true)

  const [showEditModal, setShowEditModal] = useState(false)
  const [userRole, setUserRole] = useState<string>("")

  // ✅ Fetch case detail
  useEffect(() => {
    const fetchCaseDetail = async () => {
      try {
        setLoading(true)
        const url = `/api/zakat-applicants/${id}`
        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          cache: "no-store",
        })

        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
        const caseItem = await res.json()
        if (!caseItem || !caseItem._id) throw new Error("Invalid case data structure in response")

        setCaseData(caseItem)
        setUpdateStatus(caseItem.status || "Pending")
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchCaseDetail()
  }, [id])

  // Sync updateStatus with caseData.status when caseData changes (but not when user manually changes it)
  useEffect(() => {
    if (caseData?.status && updateStatus === "" && caseData.status !== updateStatus) {
      setUpdateStatus(caseData.status)
    } else if (caseData?.status && caseData.status !== updateStatus && !isUpdating) {
      // Only sync if status changed externally (not from user input)
      setUpdateStatus(caseData.status)
    }
  }, [caseData?.status])

  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserRole(decoded.role || "")
      } catch (err) {
        console.error("Failed to decode token:", err)
      }
    }
  }, [])

  // ✅ Fetch grants with token - For Treasurer, Caseworker, and Admin
  useEffect(() => {
    const fetchGrantData = async () => {
      try {
        if (!id || (userRole !== "treasurer" && userRole !== "caseworker" && userRole !== "admin" && userRole !== "approver")) {
          setLoadingGrant(false)
          return
        }
        setLoadingGrant(true)

        const token = getAuthToken()
        if (!token) return

        const url = `/api/grants?applicantId=${id}`
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`, // ✅ token attached
          },
          cache: "no-store",
        })

        if (!res.ok) throw new Error(`Grant API error: ${res.status} ${res.statusText}`)
        const data = await res.json()
        let grantInfo = null
        if (data.items && Array.isArray(data.items) && data.items.length > 0) grantInfo = data.items[0]
        else if (Array.isArray(data) && data.length > 0) grantInfo = data[0]
        else if (data._id) grantInfo = data

        if (grantInfo) {
          console.log("Grant data fetched:", grantInfo)
          console.log("Payment documents in grant:", grantInfo.paymentDocuments)
          setGrantData(grantInfo)
          setGrantedAmount(grantInfo.grantedAmount || "")
          setRemarks(grantInfo.remarks || "")
          setNumberOfMonths(grantInfo.numberOfMonths || "")
          // Don't override updateStatus with grant status - case status is the source of truth
          // The updateStatus should always reflect caseData.status, not grant status
        }
      } catch (err) {
        console.error("Error fetching grant data:", err instanceof Error ? err.message : String(err))
      } finally {
        setLoadingGrant(false)
      }
    }

    fetchGrantData()
  }, [id, updateStatus, userRole])

  // ✅ Save/Update Number of Months (for caseworkers)
  const handleNumberOfMonthsUpdate = async () => {
    if (!numberOfMonths || (typeof numberOfMonths === "string" && numberOfMonths === "") || (typeof numberOfMonths === "number" && numberOfMonths <= 0)) {
      setUpdateError("Please enter a number of months")
      return
    }

    try {
      setIsUpdating(true)
      setUpdateError(null)

      const token = getAuthToken()
      if (!token) {
        setUpdateError("Authentication token not found. Please log in again.")
        return
      }

      // Create or update grant with numberOfMonths
      const grantPayload: any = {
        applicantId: id,
        numberOfMonths: Number(numberOfMonths),
        status: caseData?.status || "Pending",
      }

      const grantResponse = await fetch(`/api/grants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(grantPayload),
      })

      if (!grantResponse.ok) {
        const errorData = await grantResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to save number of months: ${grantResponse.status}`)
      }

      const grantResult = await grantResponse.json()
      setGrantData(grantResult)
      setNumberOfMonths(grantResult.numberOfMonths || "")

      // Refresh grant data
      const grantRefreshResponse = await fetch(`/api/grants?applicantId=${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      if (grantRefreshResponse.ok) {
        const data = await grantRefreshResponse.json()
        let grantInfo = null
        if (data.items && Array.isArray(data.items) && data.items.length > 0) grantInfo = data.items[0]
        else if (Array.isArray(data) && data.length > 0) grantInfo = data[0]
        else if (data._id) grantInfo = data

        if (grantInfo) {
          setGrantData(grantInfo)
          setNumberOfMonths(grantInfo.numberOfMonths || "")
        }
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to save number of months")
    } finally {
      setIsUpdating(false)
    }
  }

  // ✅ Update applicant and grant
  const handleStatusUpdate = async () => {
    try {
      setIsUpdating(true)
      setUpdateError(null)

      const token = getAuthToken()
      if (!token) {
        setUpdateError("Authentication token not found. Please log in again.")
        return
      }

      // Update applicant status
      const applicantResponse = await fetch(`/api/zakat-applicants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: updateStatus }),
      })

      if (!applicantResponse.ok) {
        const errorData = await applicantResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `Update failed: ${applicantResponse.status}`)
      }

      const updatedData = await applicantResponse.json()
      setCaseData(updatedData?.applicant || updatedData)
      if (updatedData?.applicant?.status) {
        setUpdateStatus(updatedData.applicant.status)
      }

      // Update or create grant based on user role and available data
      // Caseworkers can update/create grants with status, numberOfMonths, and remarks (NOT amount)
      // Approvers can update/create grants with status, grantedAmount, and remarks
      // Admin can update/create grants with all fields
      const shouldUpdateGrant = 
        (userRole === "approver" && (updateStatus || grantedAmount !== "" && grantedAmount !== null || remarks)) ||
        (userRole === "caseworker" && (updateStatus || numberOfMonths !== "" && numberOfMonths !== null || remarks || grantData)) ||
        (userRole === "admin" && (updateStatus || grantedAmount !== "" && grantedAmount !== null || numberOfMonths !== "" && numberOfMonths !== null || remarks || grantData))
      
      if (shouldUpdateGrant) {
        const grantPayload: any = {
          applicantId: id,
        }
        
        // All roles can update status
        if (updateStatus) {
          grantPayload.status = updateStatus
        }
        
        // Only approvers and admin can set grantedAmount (caseworkers cannot)
        if ((userRole === "approver" || userRole === "admin") && grantedAmount !== "" && grantedAmount !== null) {
          grantPayload.grantedAmount = Number(grantedAmount)
        }
        
        // Caseworkers and admin can set numberOfMonths (approvers cannot)
        if ((userRole === "caseworker" || userRole === "admin") && numberOfMonths !== "" && numberOfMonths !== null) {
          grantPayload.numberOfMonths = Number(numberOfMonths)
        }
        
        // Caseworkers, approvers, and admin can set remarks
        if (remarks && (userRole === "caseworker" || userRole === "approver" || userRole === "admin")) {
          grantPayload.remarks = remarks
        }

        // If grant already exists, use PUT to update it
        // Otherwise, use POST to create it
        const grantMethod = grantData?._id ? "PUT" : "POST"
        const grantUrl = grantData?._id 
          ? `/api/grants/${grantData._id}`
          : `/api/grants`

        const grantResponse = await fetch(grantUrl, {
          method: grantMethod,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(grantPayload),
        })

        if (grantResponse.ok) {
          const grantResult = await grantResponse.json()
          setGrantData(grantResult)
          // Update form fields with the grant result - ensure status matches
          setGrantedAmount(grantResult.grantedAmount || "")
          setRemarks(grantResult.remarks || "")
          setNumberOfMonths(grantResult.numberOfMonths || "")
          // Use the status from grant result, or fallback to updateStatus
          const grantStatus = grantResult.status || updateStatus
          setUpdateStatus(grantStatus)
        } else {
          const errorData = await grantResponse.json().catch(() => ({}))
          throw new Error(errorData.message || `Grant ${grantMethod === "PUT" ? "update" : "creation"} failed: ${grantResponse.status}`)
        }
      }

      // Refresh case data to get updated applicant status - do this AFTER grant creation
      const caseRefreshResponse = await fetch(`/api/zakat-applicants/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      if (caseRefreshResponse.ok) {
        const refreshedCaseData = await caseRefreshResponse.json()
        setCaseData(refreshedCaseData)
        // Update status from refreshed case data - prioritize applicant status
        if (refreshedCaseData.status) {
          setUpdateStatus(refreshedCaseData.status)
        }
      }

      // Only refresh grant data if user is Treasurer
      if (userRole === "treasurer") {
        const grantRefreshResponse = await fetch(`/api/grants?applicantId=${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })

        if (grantRefreshResponse.ok) {
          const grantRefreshData = await grantRefreshResponse.json()
          if (grantRefreshData.items && grantRefreshData.items.length > 0) {
            const latestGrant = grantRefreshData.items[0]
            setGrantData(latestGrant)
            setGrantedAmount(latestGrant.grantedAmount || "")
            setRemarks(latestGrant.remarks || "")
            // Don't override applicant status with grant status - applicant status is the source of truth
            // The grant status should match, but we display applicant status
          }
        }
      }

      setUpdateError(null)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveEditedCase = async (editedData: any) => {
    const token = getAuthToken()
    if (!token) throw new Error("Authentication token not found")

    const response = await fetch(`/api/zakat-applicants/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editedData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Failed to update case")
    }

    const updatedData = await response.json()
    setCaseData(updatedData?.applicant || updatedData)
  }


  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading case details...</p>
      </div>
    )

  if (error || !caseData)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || "Case not found"}</p>
      </div>
    )

  const canEditCase = userRole === "admin" || userRole === "caseworker"

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/staff/dashboard" className="flex items-center gap-3">
            <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={140} height={140} priority />
          </Link>
          <Link href="/staff/cases" className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Back to Cases
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {caseData.firstName} {caseData.lastName}
                  </h1>
                  {canEditCase && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Case Details
                    </button>
                  )}
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    caseData.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : caseData.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : caseData.status === "In Review"
                          ? "bg-blue-100 text-blue-800"
                          : caseData.status === "Need Info"
                            ? "bg-orange-100 text-orange-800"
                            : caseData.status === "Ready for Approval"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-red-100 text-red-800"
                  }`}
                >
                  {caseData.status}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-200 mt-6">
                <button className="pb-4 px-2 border-b-2 border-teal-600 text-teal-600 font-medium">Application</button>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">First Name</p>
                  <p className="text-gray-900 font-medium">{caseData.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Name</p>
                  <p className="text-gray-900 font-medium">{caseData.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{caseData.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mobile Phone</p>
                  <p className="text-gray-900 font-medium">{caseData.mobilePhone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-gray-900 font-medium">
                    {caseData.dateOfBirth ? new Date(caseData.dateOfBirth).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="text-gray-900 font-medium">{caseData.gender || "N/A"}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-gray-900 font-medium">
                  {caseData.streetAddress}, {caseData.city}, {caseData.state} {caseData.zipCode}
                </p>
              </div>
            </div>

            {/* Household Information Section */}
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Household & Employment Information</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Legal Status</p>
                  <p className="text-gray-900 font-medium">{caseData.legalStatus || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Employment Status</p>
                  <p className="text-gray-900 font-medium">{caseData.employmentStatus || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dependents Info</p>
                  <p className="text-gray-900 font-medium">{caseData.dependentsInfo || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Referred By</p>
                  <p className="text-gray-900 font-medium">{caseData.referredBy || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Information</h2>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-600">Total Monthly Income</p>
                  <p className="text-gray-900 font-medium">${caseData.totalMonthlyIncome || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Income Sources</p>
                  <p className="text-gray-900 font-medium">{caseData.incomeSources || "N/A"}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-4">Monthly Expenses</h3>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Food</p>
                  <p className="text-gray-900 font-medium">${caseData.food || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rent/Mortgage</p>
                  <p className="text-gray-900 font-medium">${caseData.rentMortgage || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Utilities</p>
                  <p className="text-gray-900 font-medium">${caseData.utilities || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Other Expenses</p>
                  <p className="text-gray-900 font-medium">{caseData.otherExpenses || "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Total Debts</p>
                <p className="text-gray-900 font-medium text-lg">${caseData.totalDebts || 0}</p>
              </div>
            </div>

            {/* Request Details Section */}
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Request Details</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Request Type</p>
                  <p className="text-gray-900 font-medium">{caseData.requestType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount Requested</p>
                  <p className="text-gray-900 font-medium">${caseData.amountRequested}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600">Why Applying</p>
                <p className="text-gray-900 font-medium">{caseData.whyApplying}</p>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600">Circumstances</p>
                <p className="text-gray-900 font-medium">{caseData.circumstances}</p>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600">Previous Zakat</p>
                <p className="text-gray-900 font-medium">{caseData.previousZakat}</p>
              </div>

              {/* Display zakat resource source if applicant selected "yes" and provided source */}
              {caseData.previousZakat === "yes" && caseData.zakatResourceSource && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600">Zakat Resource Source</p>
                  <p className="text-gray-900 font-medium">{caseData.zakatResourceSource}</p>
                </div>
              )}
            </div>

            {/* References Section */}
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">References</h2>

              <h3 className="font-semibold text-gray-900 mb-4">Reference 1</h3>
              <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-900 font-medium">{caseData.reference1?.fullName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Relationship</p>
                  <p className="text-gray-900 font-medium">{caseData.reference1?.relationship || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-gray-900 font-medium">{caseData.reference1?.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{caseData.reference1?.email || "N/A"}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-4">Reference 2</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-900 font-medium">{caseData.reference2?.fullName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Relationship</p>
                  <p className="text-gray-900 font-medium">{caseData.reference2?.relationship || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-gray-900 font-medium">{caseData.reference2?.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{caseData.reference2?.email || "N/A"}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Documents</h2>
              {caseData.documents && caseData.documents.length > 0 ? (
                <div className="space-y-3">
                  {caseData.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.originalname}</p>
                        <p className="text-xs text-gray-600 mt-1">{(doc.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDocument(doc)
                          setShowDocumentViewer(true)
                        }}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No documents available</p>
              )}
            </div>
          </div>

          {/* Right Sidebar - Case Actions */}
          <div className="col-span-1">
            {/* Send Message Button */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <Link
                href={`/messages?caseId=${caseData.caseId}&applicantId=${id}`}
                className="w-full bg-teal-600 text-white font-medium py-3 rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Send Message
              </Link>
            </div>

            <div className="bg-white rounded-lg p-6 mb-6">
              <RoleBasedStatusSection
                caseData={caseData}
                updateStatus={updateStatus}
                setUpdateStatus={setUpdateStatus}
                grantedAmount={grantedAmount}
                setGrantedAmount={setGrantedAmount}
                remarks={remarks}
                setRemarks={setRemarks}
                numberOfMonths={numberOfMonths}
                setNumberOfMonths={setNumberOfMonths}
                grantData={grantData}
                isUpdating={isUpdating}
                updateError={updateError}
                onStatusUpdate={handleStatusUpdate}
                userRole={userRole}
                applicantId={id}
                onNumberOfMonthsUpdate={handleNumberOfMonthsUpdate}
              />
            </div>

            {/* Payment Documents Section - Visible to All Staff */}
            {grantData && (
              <div className="bg-white rounded-lg p-6 mb-6">
                <PaymentDocumentsSection
                  grantId={grantData._id}
                  paymentDocuments={grantData.paymentDocuments || []}
                  onDocumentsUpdate={async () => {
                    // Refresh grant data after document update
                    try {
                      const token = getAuthToken()
                      if (!token) return

                      const url = `/api/grants?applicantId=${id}`
                      const res = await fetch(url, {
                        method: "GET",
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                      })

                      if (res.ok) {
                        const data = await res.json()
                        let grantInfo = null
                        if (data.items && Array.isArray(data.items) && data.items.length > 0) grantInfo = data.items[0]
                        else if (Array.isArray(data) && data.length > 0) grantInfo = data[0]
                        else if (data._id) grantInfo = data

                        if (grantInfo) {
                          setGrantData(grantInfo)
                        }
                      }
                    } catch (err) {
                      console.error("Error refreshing grant data:", err)
                    }
                  }}
                  userRole={userRole}
                />
              </div>
            )}

            {/* Granted Amount Display - Visible to Approver, Treasurer and Admin */}
            {(userRole === "approver" || userRole === "treasurer" || userRole === "admin") && grantData && grantData.grantedAmount && (
              <div className="bg-white rounded-lg p-6 mt-6 border-2 border-teal-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Granted Amount</p>
                    <p className="text-3xl font-bold text-teal-600">${grantData.grantedAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Status: <span className="font-medium text-gray-900">{caseData.status || grantData.status}</span>
                    </p>
                    {grantData.remarks && <p className="text-sm text-gray-700 mt-2 italic">"{grantData.remarks}"</p>}
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                {grantData.createdAt && (
                  <p className="text-xs text-gray-500 mt-4">
                    Granted on:{" "}
                    {new Date(grantData.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-lg p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Case ID</p>
                  <p className="text-gray-900 font-medium">{caseData.caseId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submitted</p>
                  <p className="text-gray-900 font-medium">{new Date(caseData.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Documents</p>
                  <p className="text-gray-900 font-medium">{caseData.documents?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CaseEditModal
        isOpen={showEditModal}
        caseData={caseData}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEditedCase}
        userRole={userRole}
        applicantId={id}
      />

      {/* Document Viewer Modal */}
      <DocumentViewer doc={selectedDocument} isOpen={showDocumentViewer} onClose={() => setShowDocumentViewer(false)} />
    </div>
  )
}
