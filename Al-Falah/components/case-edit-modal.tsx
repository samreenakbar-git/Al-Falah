"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Upload, Trash2, Loader, FileText, Download } from 'lucide-react'
import { getAuthToken } from "@/lib/auth-utils"

interface CaseEditModalProps {
  isOpen: boolean
  caseData: any
  onClose: () => void
  onSave: (data: any) => Promise<void>
  userRole: string
  applicantId?: string
}

export default function CaseEditModal({ isOpen, caseData, onClose, onSave, userRole, applicantId }: CaseEditModalProps) {
  const [formData, setFormData] = useState(caseData || {})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (caseData) {
      // Normalize gender value to lowercase and handle invalid values
      const normalizedGender = caseData.gender 
        ? (caseData.gender.toLowerCase() === "male" || caseData.gender.toLowerCase() === "female" 
            ? caseData.gender.toLowerCase() 
            : "") 
        : ""
      
      setFormData({
        ...caseData,
        gender: normalizedGender
      })
      setDocuments(caseData.documents || [])
      setPendingFiles([])
      setDocumentsToDelete([])
    }
  }, [caseData])

  const canEditAllFields = userRole === "admin" || userRole === "caseworker"
  const canEditFinance = userRole === "admin" || userRole === "caseworker" || userRole === "treasurer"
  const canManageDocuments = userRole === "admin" || userRole === "caseworker"

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNestedInputChange = (section: string, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Store files locally - will upload when Save Changes is clicked
    const newFiles = Array.from(files)
    setPendingFiles((prev) => [...prev, ...newFiles])
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDocumentDelete = (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? It will be removed when you save changes.")) return

    // documentId is already a string
    const docIdStr = documentId
    
    // Mark document for deletion - will delete when Save Changes is clicked
    setDocumentsToDelete((prev) => {
      if (prev.includes(docIdStr)) return prev
      return [...prev, docIdStr]
    })
    
    // Remove from display immediately
    setDocuments((prev) => prev.filter((doc: any) => {
      const docId = doc._id ? (typeof doc._id === 'string' ? doc._id : doc._id.toString()) : null
      return docId !== docIdStr && doc.filename !== docIdStr
    }))
  }

  const handleSave = async () => {
    if (!applicantId) {
      setError("Applicant ID is required")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const token = getAuthToken()
      if (!token) throw new Error("Authentication token not found")

      // 1. Delete documents marked for deletion
      for (const docId of documentsToDelete) {
        try {
          // Encode the documentId in case it contains special characters
          const encodedDocId = encodeURIComponent(docId)
          const deleteResponse = await fetch(`/api/zakat-applicants/${applicantId}/documents/${encodedDocId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}))
            console.warn(`Failed to delete document ${docId}:`, errorData.message || deleteResponse.statusText)
            throw new Error(errorData.message || `Failed to delete document ${docId}`)
          }
        } catch (err) {
          console.error(`Error deleting document ${docId}:`, err)
          throw err // Re-throw to show error to user
        }
      }

      // 2. Upload pending files
      if (pendingFiles.length > 0) {
        const uploadFormData = new FormData()
        pendingFiles.forEach((file) => {
          uploadFormData.append("documents", file)
        })

        const uploadResponse = await fetch(`/api/zakat-applicants/${applicantId}/documents`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to upload documents")
        }

        const uploadData = await uploadResponse.json()
        // Update documents list with newly uploaded documents
        const updatedDocuments = uploadData.applicant?.documents || documents
        setDocuments(updatedDocuments)
        
        // Update formData to include the new documents so they're preserved when saving
        setFormData((prev: any) => ({
          ...prev,
          documents: updatedDocuments,
        }))
      }

      // 3. Save other form data - but exclude documents since they're already saved
      const { documents: _, ...formDataWithoutDocs } = formData
      await onSave(formDataWithoutDocs)

      setSuccessMessage("Case updated successfully!")
      setTimeout(() => {
        onClose()
        setSuccessMessage(null)
        setPendingFiles([])
        setDocumentsToDelete([])
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Case Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">{successMessage}</div>
          )}

          {/* Personal Information Section */}
          {canEditAllFields && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">Personal Information</legend>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    name="mobilePhone"
                    value={formData.mobilePhone || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Phone</label>
                  <input
                    type="tel"
                    name="homePhone"
                    value={formData.homePhone || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal Status</label>
                  <input
                    type="text"
                    name="legalStatus"
                    value={formData.legalStatus || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {/* Household & Employment Information */}
          {canEditAllFields && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">Household & Employment Information</legend>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <input
                    type="text"
                    name="employmentStatus"
                    value={formData.employmentStatus || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dependents Info</label>
                  <input
                    type="text"
                    name="dependentsInfo"
                    value={formData.dependentsInfo || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                  <input
                    type="text"
                    name="referredBy"
                    value={formData.referredBy || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Phone</label>
                  <input
                    type="tel"
                    name="referrerPhone"
                    value={formData.referrerPhone || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {/* Financial Information Section */}
          {canEditFinance && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">Financial Information</legend>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Monthly Income</label>
                  <input
                    type="number"
                    name="totalMonthlyIncome"
                    value={formData.totalMonthlyIncome || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Income Sources</label>
                  <input
                    type="text"
                    name="incomeSources"
                    value={formData.incomeSources || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent/Mortgage</label>
                  <input
                    type="number"
                    name="rentMortgage"
                    value={formData.rentMortgage || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilities</label>
                  <input
                    type="number"
                    name="utilities"
                    value={formData.utilities || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food</label>
                  <input
                    type="number"
                    name="food"
                    value={formData.food || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Expenses</label>
                  <input
                    type="text"
                    name="otherExpenses"
                    value={formData.otherExpenses || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Debts</label>
                  <input
                    type="number"
                    name="totalDebts"
                    value={formData.totalDebts || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {/* Request Details */}
          {canEditAllFields && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">Request Details</legend>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                  <input
                    type="text"
                    name="requestType"
                    value={formData.requestType || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested</label>
                  <input
                    type="number"
                    name="amountRequested"
                    value={formData.amountRequested || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Why Applying</label>
                  <textarea
                    name="whyApplying"
                    value={formData.whyApplying || ""}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Circumstances</label>
                  <textarea
                    name="circumstances"
                    value={formData.circumstances || ""}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Zakat</label>
                  <select
                    name="previousZakat"
                    value={formData.previousZakat || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {formData.previousZakat === "yes" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zakat Resource Source</label>
                    <input
                      type="text"
                      name="zakatResourceSource"
                      value={formData.zakatResourceSource || ""}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* References */}
          {canEditAllFields && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">References</legend>
              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Reference 1</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.reference1?.fullName || ""}
                        onChange={(e) => handleNestedInputChange("reference1", "fullName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={formData.reference1?.relationship || ""}
                        onChange={(e) => handleNestedInputChange("reference1", "relationship", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.reference1?.phoneNumber || ""}
                        onChange={(e) => handleNestedInputChange("reference1", "phoneNumber", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.reference1?.email || ""}
                        onChange={(e) => handleNestedInputChange("reference1", "email", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Reference 2</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.reference2?.fullName || ""}
                        onChange={(e) => handleNestedInputChange("reference2", "fullName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={formData.reference2?.relationship || ""}
                        onChange={(e) => handleNestedInputChange("reference2", "relationship", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.reference2?.phoneNumber || ""}
                        onChange={(e) => handleNestedInputChange("reference2", "phoneNumber", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.reference2?.email || ""}
                        onChange={(e) => handleNestedInputChange("reference2", "email", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          {/* Documents Management - Only for caseworkers */}
          {canManageDocuments && (
            <fieldset className="border border-gray-200 rounded-lg p-6">
              <legend className="text-lg font-bold text-gray-900 px-2">Documents</legend>
              <div className="mt-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentSelect}
                  className="hidden"
                  id="document-upload"
                />
                <label
                  htmlFor="document-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer transition"
                >
                  <Upload className="w-4 h-4" />
                  Select Documents
                </label>
                {pendingFiles.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {pendingFiles.length} file(s) selected - will be uploaded when you save changes
                  </p>
                )}
              </div>
              {pendingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Pending Upload:</p>
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removePendingFile(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {documents.map((doc: any) => (
                    <div
                      key={doc._id || doc.filename}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.originalname}</p>
                          <p className="text-xs text-gray-500">
                            {(doc.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded transition"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            // Ensure we pass a string ID
                            const docId = doc._id 
                              ? (typeof doc._id === 'string' ? doc._id : doc._id.toString())
                              : (doc.filename || '')
                            handleDocumentDelete(docId)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {/* Case Status */}
          <fieldset className="border border-gray-200 rounded-lg p-6">
            <legend className="text-lg font-bold text-gray-900 px-2">Case Status</legend>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status || "Pending"}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Pending">Pending</option>
                <option value="In Review">In Review</option>
                <option value="Need Info">Need Info</option>
                <option value="Ready for Approval">Ready for Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </fieldset>

          {/* Access Note */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              {canEditAllFields
                ? "You have full editing access to this case as Admin/Caseworker"
                : canEditFinance
                  ? "You can only edit financial information as per your role"
                  : "You have read-only access to this case"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
