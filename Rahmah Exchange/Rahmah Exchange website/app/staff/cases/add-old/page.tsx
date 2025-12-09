"use client"
import axios from "axios"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, CheckCircle2, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAuthToken, authenticatedFetch } from "@/lib/auth-utils"

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

interface Reference {
  fullName: string
  phoneNumber: string
  email: string
  relationship: string
}

interface ValidationErrors {
  [key: string]: string
}

const API_URL = "/api/zakat-applicants"

const STEPS = [
  { number: 1, label: "Personal" },
  { number: 2, label: "Employment" },
  { number: 3, label: "Family" },
  { number: 4, label: "Financial" },
  { number: 5, label: "Request" },
  { number: 6, label: "References" },
  { number: 7, label: "Documents" },
  { number: 8, label: "Grant Details" },
  { number: 9, label: "Review" },
]

export default function AddOldCasePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [savedApplicantId, setSavedApplicantId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Step 1: Personal
    firstName: "",
    lastName: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    gender: "",
    dateOfBirth: "",
    mobilePhone: "",
    homePhone: "",
    email: "",
    legalStatus: "",
    referredBy: "",
    referrerPhone: "",
    // Step 2: Employment
    employmentStatus: "",
    // Step 3: Family
    dependentsInfo: "",
    // Step 4: Financial
    totalMonthlyIncome: "",
    incomeSources: "",
    rentMortgage: "",
    utilities: "",
    food: "",
    otherExpenses: "",
    totalDebts: "",
    // Step 5: Request
    requestType: "Zakat",
    amountRequested: "",
    whyApplying: "",
    circumstances: "",
    previousZakat: "",
    zakatResourceSource: "",
    // Step 6: References
    reference1: { fullName: "", phoneNumber: "", email: "", relationship: "" },
    reference2: { fullName: "", phoneNumber: "", email: "", relationship: "" },
    // Step 7: Documents
    documents: [] as File[],
    // Step 9: Grant Details
    approvedAmount: "",
    numberOfMonths: "",
    grantStatus: "Approved",
    paymentProof: [] as File[],
  })

  // Check authentication on mount - no API calls for data
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push("/staff/login")
    }
  }, [router])

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 4000)
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !validateEmail(email)) return false

    setCheckingEmail(true)
    try {
      const token = getAuthToken()
      if (!token) return false

      const response = await authenticatedFetch(API_URL)
      const data = await response.json()

      if (data.items && Array.isArray(data.items)) {
        const exists = data.items.some((item: any) => item.email?.toLowerCase() === email.toLowerCase())
        setEmailExists(exists)
        return exists
      } else if (Array.isArray(data)) {
        const exists = data.some((item: any) => item.email?.toLowerCase() === email.toLowerCase())
        setEmailExists(exists)
        return exists
      }
    } catch (error) {
      console.error("Error checking email:", error)
    } finally {
      setCheckingEmail(false)
    }
    return false
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
    if (name === "email" && emailExists) {
      setEmailExists(false)
    }
  }

  const validateStep1 = async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.streetAddress.trim()) newErrors.streetAddress = "Street address is required"
    if (!formData.city.trim()) newErrors.city = "City is required"
    if (!formData.state.trim()) newErrors.state = "State is required"
    if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required"
    if (!formData.mobilePhone.trim()) newErrors.mobilePhone = "Mobile phone is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.legalStatus) newErrors.legalStatus = "Legal status is required"
    if (!formData.referredBy.trim()) newErrors.referredBy = "Referred by is required"

    // Check if email already exists
    if (formData.email.trim() && validateEmail(formData.email)) {
      const exists = await checkEmailExists(formData.email)
      if (exists) {
        newErrors.email = "This email is already registered"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.employmentStatus) {
      newErrors.employmentStatus = "Employment status is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.dependentsInfo.trim()) {
      newErrors.dependentsInfo = "Please provide dependents information"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.totalMonthlyIncome) {
      newErrors.totalMonthlyIncome = "Please enter total monthly income"
    }
    if (!formData.incomeSources.trim()) {
      newErrors.incomeSources = "Please describe your income sources"
    }
    if (!formData.rentMortgage) {
      newErrors.rentMortgage = "Please enter rent/mortgage amount"
    }
    if (!formData.utilities) {
      newErrors.utilities = "Please enter utilities amount"
    }
    if (!formData.food) {
      newErrors.food = "Please enter food amount"
    }
    if (!formData.otherExpenses.trim()) {
      newErrors.otherExpenses = "Please enter other expenses"
    }
    if (!formData.totalDebts) {
      newErrors.totalDebts = "Please enter total debts"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep5 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.amountRequested) {
      newErrors.amountRequested = "Please enter amount requested"
    }
    if (!formData.whyApplying.trim()) {
      newErrors.whyApplying = "Please explain why you are applying"
    }
    if (!formData.circumstances.trim()) {
      newErrors.circumstances = "Please explain your circumstances"
    }
    if (!formData.previousZakat) {
      newErrors.previousZakat = "Please select an option"
    }
    if (formData.previousZakat === "yes" && !formData.zakatResourceSource.trim()) {
      newErrors.zakatResourceSource = "Please specify where you received the Zakat"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep6 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.reference1.fullName.trim()) {
      newErrors["reference1.fullName"] = "Please enter full name"
    }
    if (!formData.reference1.phoneNumber.trim()) {
      newErrors["reference1.phoneNumber"] = "Please enter phone number"
    }
    if (!formData.reference1.relationship.trim()) {
      newErrors["reference1.relationship"] = "Please explain relationship"
    }
    if (!formData.reference2.fullName.trim()) {
      newErrors["reference2.fullName"] = "Please enter full name"
    }
    if (!formData.reference2.phoneNumber.trim()) {
      newErrors["reference2.phoneNumber"] = "Please enter phone number"
    }
    if (!formData.reference2.relationship.trim()) {
      newErrors["reference2.relationship"] = "Please explain relationship"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep7 = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (formData.documents.length === 0) {
      newErrors.documents = "Please upload at least one document before continuing"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    let isValid = false

    if (currentStep === 1) {
      isValid = await validateStep1()
    } else if (currentStep === 2) {
      isValid = validateStep2()
    } else if (currentStep === 3) {
      isValid = validateStep3()
    } else if (currentStep === 4) {
      isValid = validateStep4()
    } else if (currentStep === 5) {
      isValid = validateStep5()
    } else if (currentStep === 6) {
      isValid = validateStep6()
    } else if (currentStep === 7) {
      isValid = validateStep7()
      if (!isValid) {
        showToast("Please upload at least one document", "error")
        return
      }
    } else if (currentStep === 8) {
      // Step 8: Save applicant and grant, then go to review
      await handleSaveAndContinue()
      return
    }

    if (!isValid) return

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleSaveAndContinue = async () => {
    setIsSubmitting(true)
    try {
      const token = getAuthToken()
      if (!token) {
        showToast("Authentication required", "error")
        setIsSubmitting(false)
        return
      }

      // Step 1: Save the applicant
      const submitData = new FormData()
      submitData.append("firstName", formData.firstName)
      submitData.append("lastName", formData.lastName)
      submitData.append("streetAddress", formData.streetAddress)
      submitData.append("city", formData.city)
      submitData.append("state", formData.state)
      submitData.append("zipCode", formData.zipCode)
      submitData.append("gender", formData.gender)
      submitData.append("dateOfBirth", formData.dateOfBirth)
      submitData.append("mobilePhone", formData.mobilePhone)
      submitData.append("homePhone", formData.homePhone)
      submitData.append("email", formData.email)
      submitData.append("legalStatus", formData.legalStatus)
      submitData.append("referredBy", formData.referredBy)
      submitData.append("referrerPhone", formData.referrerPhone)
      submitData.append("employmentStatus", formData.employmentStatus)
      submitData.append("dependentsInfo", formData.dependentsInfo)
      submitData.append("totalMonthlyIncome", formData.totalMonthlyIncome)
      submitData.append("incomeSources", formData.incomeSources)
      submitData.append("rentMortgage", formData.rentMortgage)
      submitData.append("utilities", formData.utilities)
      submitData.append("food", formData.food)
      submitData.append("otherExpenses", formData.otherExpenses)
      submitData.append("totalDebts", formData.totalDebts)
      submitData.append("requestType", formData.requestType)
      submitData.append("amountRequested", formData.amountRequested)
      submitData.append("whyApplying", formData.whyApplying)
      submitData.append("circumstances", formData.circumstances)
      submitData.append("previousZakat", formData.previousZakat)
      submitData.append("zakatResourceSource", formData.zakatResourceSource)
      submitData.append("reference1", JSON.stringify(formData.reference1))
      submitData.append("reference2", JSON.stringify(formData.reference2))
      submitData.append("skipEmail", "true") // Old cases don't send emails

      for (let i = 0; i < formData.documents.length; i++) {
        const file = formData.documents[i]
        if (file && file instanceof File) {
          submitData.append("documents", file)
        }
      }

      const response = await axios.post(API_URL, submitData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 201 || response.data.applicant) {
        const applicantId = response.data.applicant?._id || response.data._id
        
        // Step 2: Create grant if details are provided
        if (applicantId && (formData.approvedAmount || formData.numberOfMonths)) {
          try {
            const grantData: any = {
              applicantId,
              status: formData.grantStatus || "Approved",
              skipEmail: true, // Old cases don't send emails
            }
            
            if (formData.approvedAmount) {
              grantData.grantedAmount = Number(formData.approvedAmount)
            }
            
            if (formData.numberOfMonths) {
              grantData.numberOfMonths = Number(formData.numberOfMonths)
            }

            const grantResponse = await axios.post("/api/grants", grantData, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })

            // Step 3: Upload payment proof documents if provided
            console.log("Grant created response:", grantResponse.data)
            const grantId = grantResponse.data._id || grantResponse.data.grant?._id
            console.log("Extracted grant ID:", grantId, "Payment proof files:", formData.paymentProof.length)
            if (grantId && formData.paymentProof.length > 0) {
              console.log(`Uploading ${formData.paymentProof.length} payment proof document(s) to grant ${grantId}`)
              const paymentFormData = new FormData()
              
              for (let i = 0; i < formData.paymentProof.length; i++) {
                const file = formData.paymentProof[i]
                if (file && file instanceof File) {
                  paymentFormData.append("files", file)
                }
              }

              try {
                const uploadResponse = await axios.post(`/api/grants/${grantId}/payment-documents`, paymentFormData, {
                  headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                  },
                })
                console.log("Payment documents uploaded successfully:", uploadResponse.data)
              } catch (uploadError: any) {
                console.error("Error uploading payment documents:", uploadError)
                showToast("Grant created but payment documents upload failed: " + (uploadError.response?.data?.message || uploadError.message), "error")
              }
            }
          } catch (grantError: any) {
            console.error("Error creating grant:", grantError)
            showToast("Case saved but grant creation failed: " + (grantError.response?.data?.message || grantError.message), "error")
          }
        }

        // Store applicant ID for redirect
        setSavedApplicantId(applicantId)
        // Move to review step
        setCurrentStep(9)
        showToast("Case and grant saved successfully!", "success")
      } else {
        showToast("Failed to save case", "error")
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Something went wrong saving the case. Please try again."
      console.error("Error saving case:", error, errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleReferenceChange = (refNumber: 1 | 2, field: string, value: string) => {
    const refKey = refNumber === 1 ? "reference1" : "reference2"
    setFormData((prev) => ({
      ...prev,
      [refKey]: { ...prev[refKey], [field]: value },
    }))
    const errorKey = `reference${refNumber}.${field}`
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }))
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const uploadedFiles = Array.from(files)
    const maxSize = 10 * 1024 * 1024

    for (const file of uploadedFiles) {
      if (file.size > maxSize) {
        showToast(`File ${file.name} exceeds 10MB limit`, "error")
        return
      }
    }

    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...uploadedFiles],
    }))
    if (errors.documents) {
      setErrors((prev) => ({ ...prev, documents: "" }))
    }
    showToast(`${uploadedFiles.length} file(s) uploaded successfully`, "success")
  }

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }))
  }

  // Only call API when form is submitted - NOT on page load
  // On step 9 (Review), everything is already saved in step 8, just redirect
  const handleSubmit = async () => {
    if (savedApplicantId) {
      showToast("Redirecting to case details...", "success")
      setTimeout(() => {
        router.push(`/staff/cases/${savedApplicantId}`)
      }, 1000)
      return
    }
    
    // Fallback: if somehow we're here without savedApplicantId, redirect to cases list
    showToast("Case saved successfully! Redirecting...", "success")
    setTimeout(() => {
      router.push("/staff/cases")
    }, 1500)
  }

  const handleSubmitOld = async () => {
    console.log("handleSubmit called. Documents count:", formData.documents.length)

    if (!formData.documents || formData.documents.length === 0) {
      showToast("Please upload at least one document", "error")
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = new FormData()

      submitData.append("firstName", formData.firstName)
      submitData.append("lastName", formData.lastName)
      submitData.append("streetAddress", formData.streetAddress)
      submitData.append("city", formData.city)
      submitData.append("state", formData.state)
      submitData.append("zipCode", formData.zipCode)
      submitData.append("gender", formData.gender)
      submitData.append("dateOfBirth", formData.dateOfBirth)
      submitData.append("mobilePhone", formData.mobilePhone)
      submitData.append("homePhone", formData.homePhone)
      submitData.append("email", formData.email)
      submitData.append("legalStatus", formData.legalStatus)
      submitData.append("referredBy", formData.referredBy)
      submitData.append("referrerPhone", formData.referrerPhone)
      submitData.append("employmentStatus", formData.employmentStatus)
      submitData.append("dependentsInfo", formData.dependentsInfo)
      submitData.append("totalMonthlyIncome", formData.totalMonthlyIncome)
      submitData.append("incomeSources", formData.incomeSources)
      submitData.append("rentMortgage", formData.rentMortgage)
      submitData.append("utilities", formData.utilities)
      submitData.append("food", formData.food)
      submitData.append("otherExpenses", formData.otherExpenses)
      submitData.append("totalDebts", formData.totalDebts)
      submitData.append("requestType", formData.requestType)
      submitData.append("amountRequested", formData.amountRequested)
      submitData.append("whyApplying", formData.whyApplying)
      submitData.append("circumstances", formData.circumstances)
      submitData.append("previousZakat", formData.previousZakat)
      submitData.append("zakatResourceSource", formData.zakatResourceSource)
      submitData.append("reference1", JSON.stringify(formData.reference1))
      submitData.append("reference2", JSON.stringify(formData.reference2))
      submitData.append("skipEmail", "true") // Old cases don't send emails

      for (let i = 0; i < formData.documents.length; i++) {
        const file = formData.documents[i]
        if (file && file instanceof File) {
          submitData.append("documents", file)
        }
      }

      const token = getAuthToken()
      const response = await axios.post(API_URL, submitData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 201 || response.data.applicant) {
        const applicantId = response.data.applicant?._id || response.data._id
        
        // If grant details are provided, create a grant
        if (applicantId && (formData.approvedAmount || formData.numberOfMonths)) {
          try {
            const grantData: any = {
              applicantId,
              status: formData.grantStatus || "Approved",
              skipEmail: true, // Old cases don't send emails
            }
            
            if (formData.approvedAmount) {
              grantData.grantedAmount = Number(formData.approvedAmount)
            }
            
            if (formData.numberOfMonths) {
              grantData.numberOfMonths = Number(formData.numberOfMonths)
            }

            const grantResponse = await axios.post("/api/grants", grantData, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })

            console.log("Grant created response:", grantResponse.data)

            // Extract grant ID from response - API returns grant object directly
            const grantId = grantResponse.data._id || grantResponse.data.grant?._id
            console.log("Extracted grant ID:", grantId, "Payment proof files:", formData.paymentProof.length)

            // If payment proof files are provided, upload them
            if (grantId && formData.paymentProof.length > 0) {
              console.log(`Uploading ${formData.paymentProof.length} payment proof document(s) to grant ${grantId}`)
              const paymentFormData = new FormData()
              
              for (let i = 0; i < formData.paymentProof.length; i++) {
                const file = formData.paymentProof[i]
                if (file && file instanceof File) {
                  paymentFormData.append("files", file)
                }
              }

              try {
                const uploadResponse = await axios.post(`/api/grants/${grantId}/payment-documents`, paymentFormData, {
                  headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                  },
                })
                console.log("Payment documents uploaded successfully:", uploadResponse.data)
              } catch (uploadError: any) {
                console.error("Error uploading payment documents:", uploadError)
                showToast("Grant created but payment documents upload failed: " + (uploadError.response?.data?.message || uploadError.message), "error")
              }
            }
          } catch (grantError: any) {
            console.error("Error creating grant:", grantError)
            // Continue even if grant creation fails
          }
        }

        showToast("Old case added successfully! (No emails sent)", "success")
        // Redirect to the case detail page
        if (applicantId) {
          setTimeout(() => {
            router.push(`/staff/cases/${applicantId}`)
          }, 1500)
        } else {
          setIsSubmitted(true)
        }
        return
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Something went wrong creating the case. Please try again."
      console.error("Error creating case:", error, errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStepCompleted = (step: number) => step < currentStep

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50">
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
          <Link href="/staff/cases" className="flex items-center gap-2 text-gray-900 hover:text-teal-600 transition font-medium">
            <ChevronLeft className="w-5 h-5" />
            Back to Cases
          </Link>
        </header>

        <div className="px-8 py-12 max-w-2xl mx-auto">
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <p className="text-green-800 font-semibold">Old case added successfully! (No emails sent)</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-teal-50 to-blue-50">
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/staff/cases" className="flex items-center gap-2">
            <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={170} height={170} priority />
          </Link>
        </div>
        <Link href="/staff/cases" className="px-6 py-2 text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition">
          Back to Cases
        </Link>
      </header>

      <div className="px-8 py-12 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Add Old Case</h1>
          <p className="text-gray-600">Add historical case data to the system. No emails will be sent to the applicant.</p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This is for adding old/historical cases. The data will be added to the system but no notification emails will be sent to the applicant.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <div className="flex justify-between items-start mb-4">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition ${
                    step.number === currentStep
                      ? "bg-gray-600 text-white"
                      : isStepCompleted(step.number)
                        ? "bg-gray-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isStepCompleted(step.number) ? "✓" : step.number}
                </div>
                <p className="text-sm text-gray-600 text-center text-balance font-medium">{step.label}</p>
              </div>
            ))}
          </div>

          <div className="w-full bg-gray-300 rounded-full h-1">
            <div
              className="bg-gray-900 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {/* All the form steps are identical to the add page - I'll include a simplified version */}
          {/* For brevity, I'll reference the same form structure from add/page.tsx */}
          {/* The key difference is in handleSubmit where skipEmail is set to "true" */}
          
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Personal Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.firstName ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.lastName ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                    errors.streetAddress ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Enter street address"
                />
                {errors.streetAddress && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.streetAddress}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.city ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.state ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter state"
                  />
                  {errors.state && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.state}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.zipCode ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Enter ZIP code"
                  />
                  {errors.zipCode && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.zipCode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-600 ${
                      errors.gender ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.gender}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    min="1900-01-01"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.dateOfBirth ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.mobilePhone ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="000-0000000"
                  />
                  {errors.mobilePhone && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.mobilePhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Home Phone</label>
                  <input
                    type="tel"
                    name="homePhone"
                    value={formData.homePhone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={async () => {
                        if (formData.email.trim() && validateEmail(formData.email)) {
                          const exists = await checkEmailExists(formData.email)
                          if (exists) {
                            setErrors((prev) => ({ ...prev, email: "This email is already registered" }))
                          }
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors.email ? "border-red-500 bg-red-50" : emailExists ? "border-yellow-500 bg-yellow-50" : "border-gray-300"
                      }`}
                      placeholder="example@email.com"
                    />
                    {checkingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                  {emailExists && !errors.email && (
                    <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      This email is already registered
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Legal Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="legalStatus"
                    value={formData.legalStatus}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-600 ${
                      errors.legalStatus ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select status</option>
                    <option value="citizen">Citizen</option>
                    <option value="resident">Resident</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.legalStatus && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.legalStatus}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Referred By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="referredBy"
                    value={formData.referredBy}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.referredBy ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="Who referred you to us?"
                  />
                  {errors.referredBy && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.referredBy}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Referrer Phone</label>
                <input
                  type="tel"
                  name="referrerPhone"
                  value={formData.referrerPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Employment Information</h2>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-600 ${
                    errors.employmentStatus ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                >
                  <option value="">Select employment status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                  <option value="other">Other</option>
                </select>
                {errors.employmentStatus && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.employmentStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Family Information</h2>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Dependents Information <span className="text-red-500">*</span>
                </h3>
                <textarea
                  name="dependentsInfo"
                  value={formData.dependentsInfo}
                  onChange={handleChange}
                  placeholder="List your dependents with their names, ages, and relationship. Example:&#10;- John Smith, 8 years old, Son&#10;- Mary Smith, 5 years old, Daughter&#10;- Mother-in-law, 65 years old, lives with us"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-48 ${
                    errors.dependentsInfo ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                />
                {errors.dependentsInfo && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dependentsInfo}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">Please list all people who depend on you financially</p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Financial Information</h2>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income</h3>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Total Monthly Income <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="totalMonthlyIncome"
                    value={formData.totalMonthlyIncome}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.totalMonthlyIncome ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.totalMonthlyIncome && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.totalMonthlyIncome}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Income Sources <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="incomeSources"
                    value={formData.incomeSources}
                    onChange={handleChange}
                    placeholder="List all income sources: salary, spouse salary, social security, unemployment, child support, etc."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-32 ${
                      errors.incomeSources ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.incomeSources && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.incomeSources}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Rent/Mortgage <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="rentMortgage"
                      value={formData.rentMortgage}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors.rentMortgage ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.rentMortgage && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.rentMortgage}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Utilities (Electric, Gas, Water) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="utilities"
                      value={formData.utilities}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors.utilities ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.utilities && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.utilities}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Food <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="food"
                      value={formData.food}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors.food ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.food && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.food}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Other Expenses <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="otherExpenses"
                      value={formData.otherExpenses}
                      onChange={handleChange}
                      placeholder="Transportation, medical, school, etc."
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors.otherExpenses ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.otherExpenses && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.otherExpenses}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Total Debts <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="totalDebts"
                    value={formData.totalDebts}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                      errors.totalDebts ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.totalDebts && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.totalDebts}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Application Request</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Request Type</label>
                <select
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  <option value="Zakat">Zakat</option>
                  <option value="Sadaqah">Sadaqah</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Amount Requested <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amountRequested"
                  value={formData.amountRequested}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                    errors.amountRequested ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                />
                {errors.amountRequested && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amountRequested}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Why Are You Applying for {formData.requestType}? <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="whyApplying"
                  value={formData.whyApplying}
                  onChange={handleChange}
                  placeholder="Please provide detailed information about your situation and why you need assistance..."
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-32 ${
                    errors.whyApplying ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                />
                {errors.whyApplying && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.whyApplying}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Explain Your Circumstances <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="circumstances"
                  value={formData.circumstances}
                  onChange={handleChange}
                  placeholder="Explain your circumstances and how the assistance will help"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-32 ${
                    errors.circumstances ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                />
                {errors.circumstances && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.circumstances}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Have you received {formData.requestType}/Sadaqa in the past 12 months?{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  name="previousZakat"
                  value={formData.previousZakat}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-600 ${
                    errors.previousZakat ? "border-red-500 bg-red-50" : "border-gray-300"
                  }`}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.previousZakat && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.previousZakat}
                  </p>
                )}
              </div>

              {formData.previousZakat === "yes" && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Where did you receive the Zakat? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="zakatResourceSource"
                    value={formData.zakatResourceSource}
                    onChange={handleChange}
                    placeholder="Please specify the organization, individual, or source from which you received Zakat assistance..."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 min-h-32 ${
                      errors.zakatResourceSource ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.zakatResourceSource && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.zakatResourceSource}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">References (2 Required)</h2>
              <p className="text-gray-600 mb-8">Please provide two references who can vouch for you</p>

              {/* Reference 1 */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-gray-600 rounded" />
                  <h3 className="text-lg font-bold text-gray-900">Reference 1</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference1.fullName}
                      onChange={(e) => handleReferenceChange(1, "fullName", e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference1.fullName"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="Enter full name"
                    />
                    {errors["reference1.fullName"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference1.fullName"]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.reference1.phoneNumber}
                      onChange={(e) => handleReferenceChange(1, "phoneNumber", e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference1.phoneNumber"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="00-0000000"
                    />
                    {errors["reference1.phoneNumber"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference1.phoneNumber"]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.reference1.email}
                      onChange={(e) => handleReferenceChange(1, "email", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      How do you know this person? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference1.relationship}
                      onChange={(e) => handleReferenceChange(1, "relationship", e.target.value)}
                      placeholder="e.g., Friend from Masjid"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference1.relationship"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors["reference1.relationship"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference1.relationship"]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference 2 */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-gray-500 rounded" />
                  <h3 className="text-lg font-bold text-gray-900">Reference 2</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference2.fullName}
                      onChange={(e) => handleReferenceChange(2, "fullName", e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference2.fullName"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="Enter full name"
                    />
                    {errors["reference2.fullName"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference2.fullName"]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.reference2.phoneNumber}
                      onChange={(e) => handleReferenceChange(2, "phoneNumber", e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference2.phoneNumber"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="00-0000000"
                    />
                    {errors["reference2.phoneNumber"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference2.phoneNumber"]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.reference2.email}
                      onChange={(e) => handleReferenceChange(2, "email", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      How do you know this person? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference2.relationship}
                      onChange={(e) => handleReferenceChange(2, "relationship", e.target.value)}
                      placeholder="e.g., Family friend"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 ${
                        errors["reference2.relationship"] ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors["reference2.relationship"] && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors["reference2.relationship"]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Supporting Documents</h2>
              <p className="text-gray-600 mb-6">
                Please upload supporting documents such as: ID, bills, pay stubs, bank statements, etc.
              </p>

              {errors.documents && (
                <Alert className="mb-6 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{errors.documents}</AlertDescription>
                </Alert>
              )}

              <div className="mb-6">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer block"
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold text-lg mb-2">Click to upload documents</p>
                  <p className="text-gray-500">PDF, JPG, PNG up to 10MB</p>
                </label>
              </div>

              {formData.documents.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Uploaded Files ({formData.documents.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                          <span className="text-gray-700 font-medium text-sm">{doc.name}</span>
                          <span className="text-gray-500 text-xs">({(doc.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 8 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Grant Details</h2>
              <p className="text-gray-600 mb-6">Enter the approved grant information for this old case.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Approved Amount ($)
                  </label>
                  <input
                    type="number"
                    name="approvedAmount"
                    value={formData.approvedAmount}
                    onChange={handleChange}
                    placeholder="Enter approved amount"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Number of Months
                  </label>
                  <input
                    type="number"
                    name="numberOfMonths"
                    value={formData.numberOfMonths}
                    onChange={handleChange}
                    placeholder="Enter number of months"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many months will the grant be distributed over?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Status
                  </label>
                  <select
                    name="grantStatus"
                    value={formData.grantStatus}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Payment Proof Documents (Optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setFormData((prev) => ({ ...prev, paymentProof: files }))
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload payment proof documents if available (checks, receipts, etc.)</p>
                  {formData.paymentProof.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.paymentProof.map((file, index) => (
                        <p key={index} className="text-sm text-gray-600">
                          • {file.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Note:</span> Grant details are optional. You can add them later from the case detail page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 9 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Review Your Application</h2>

              <div className="space-y-8">
                <div className="pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {formData.firstName} {formData.lastName}
                    </p>
                    <p>{formData.email}</p>
                    <p>{formData.mobilePhone}</p>
                  </div>
                </div>

                <div className="pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Employment</h3>
                  <div className="text-sm text-gray-600">
                    <p>Status: {formData.employmentStatus || "Not provided"}</p>
                  </div>
                </div>

                <div className="pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Monthly Income: ${formData.totalMonthlyIncome || "0"}</p>
                    <p>Monthly Rent: ${formData.rentMortgage || "0"}</p>
                    <p>Total Debts: ${formData.totalDebts || "0"}</p>
                  </div>
                </div>

                <div className="pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Request Details</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Type: {formData.requestType}</p>
                    <p>Amount Requested: ${formData.amountRequested || "0"}</p>
                    <p>Reason: {formData.whyApplying.substring(0, 100) || "..."}</p>
                    {formData.previousZakat === "yes" && formData.zakatResourceSource && (
                      <p>Previous Zakat Resource: {formData.zakatResourceSource}</p>
                    )}
                  </div>
                </div>

                <div className="pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">References</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>1. {formData.reference1.fullName || "-"}</p>
                    <p>2. {formData.reference2.fullName || "-"}</p>
                  </div>
                </div>

                {formData.documents.length > 0 && (
                  <div className="pb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {formData.documents.map((doc, index) => (
                        <p key={index}>
                          {index + 1}. {doc.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.approvedAmount || formData.numberOfMonths) && (
                  <div className="pb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Grant Details</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {formData.approvedAmount && <p>Approved Amount: ${formData.approvedAmount}</p>}
                      {formData.numberOfMonths && <p>Number of Months: {formData.numberOfMonths}</p>}
                      <p>Status: {formData.grantStatus || "Approved"}</p>
                      {formData.paymentProof.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Payment Proof Documents:</p>
                          {formData.paymentProof.map((file, index) => (
                            <p key={index} className="ml-4">• {file.name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-900">
                    <span className="font-semibold">Note:</span> This is an old case. No emails will be sent to the applicant.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition font-medium disabled:opacity-50"
              disabled={currentStep === 1}
            >
              ← Back
            </button>
            {currentStep === STEPS.length ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Adding Old Case..." : "Add Old Case"}
              </button>
            ) : currentStep === 8 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSubmitting ? "Saving..." : "Save & Continue to Review"}
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition inline-flex items-center gap-2"
              >
                Next
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

