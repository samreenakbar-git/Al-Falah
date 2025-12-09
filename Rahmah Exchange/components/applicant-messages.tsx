"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Paperclip, AlertCircle, CheckCircle2, Image as ImageIcon, X, Download, FileText } from "lucide-react"

interface Message {
  _id: string
  body: string
  senderName: string
  senderEmail: string
  senderRole: string
  createdAt: string
  attachments: any[]
}

interface ApplicantMessagesProps {
  caseId: string
  conversationId: string
  className?: string
  maxHeight?: string
}

function Toast({ message, type, isVisible }: { message: string; type: "success" | "error"; isVisible: boolean }) {
  if (!isVisible) return null
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg flex items-center gap-2 text-white font-semibold z-50 ${
        type === "success" ? "bg-green-500" : "bg-red-500"
      }`}
    >
      {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
    </div>
  )
}

export default function ApplicantMessages({
  caseId,
  conversationId,
  className = "",
  maxHeight = "h-[500px]",
}: ApplicantMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [participants, setParticipants] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const msgEndRef = useRef<HTMLDivElement | null>(null)

  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 4000)
  }

  // Auto-scroll to last message
  const scrollToBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  useEffect(() => {
    fetchConversationDetails()
    fetchMessages()
  }, [conversationId])

  const fetchConversationDetails = async () => {
    try {
      const token = sessionStorage.getItem("applicantToken")
      const applicantId = sessionStorage.getItem("applicantId")

      if (!applicantId) return

      setCurrentUserId(applicantId)

      const response = await fetch(
        `/api/applicant/messages/conversations/${conversationId}?details=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) return

      const data = await response.json()
      if (data.conversation?.participants) {
        setParticipants(data.conversation.participants)
      }
    } catch (error) {
      console.error("Error fetching details", error)
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = sessionStorage.getItem("applicantToken")

      const response = await fetch(
        `/api/applicant/messages/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to load messages")

      const data = await response.json()
      setMessages(data.messages)
    } catch (error) {
      showToast("Failed to load messages", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Accept both images and PDFs
    const validFiles = files.filter((file) => 
      file.type.startsWith("image/") || file.type === "application/pdf"
    )
    
    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles])
      // Only create previews for images, not PDFs
      validFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            setImagePreviews((prev) => [...prev, e.target?.result as string])
          }
          reader.readAsDataURL(file)
        } else {
          // For PDFs, add a placeholder
          setImagePreviews((prev) => [...prev, "pdf-placeholder"])
        }
      })
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!newMessage.trim() && selectedImages.length === 0) return

    setSending(true)

    const messageText = newMessage
    const imagesToSend = [...selectedImages]
    const previewsToSend = [...imagePreviews]

    // Optimistically update UI
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      _id: tempId,
      body: messageText || "",
      senderName: "You",
      senderEmail: "",
      senderRole: "applicant",
      createdAt: new Date().toISOString(),
      attachments: imagesToSend.map((img, idx) => ({
        url: previewsToSend[idx] || "",
        originalname: img.name,
        mimeType: img.type,
      })),
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage("")
    setSelectedImages([])
    setImagePreviews([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    try {
      const token = sessionStorage.getItem("applicantToken")
      const formData = new FormData()

      formData.append("conversationId", conversationId)
      formData.append("body", messageText || "")
      formData.append("messageType", "text")

      // Add images
      imagesToSend.forEach((image) => {
        formData.append("attachments", image)
      })

      // send only to staff - if no participants loaded, API will handle finding staff
      if (participants.length > 0) {
        participants.forEach((p) => {
          if (p.role !== "applicant" && p.userId) {
            formData.append("recipientIds", p.userId)
          }
        })
      }
      // If no participants, the API will automatically send to all staff in the conversation

      const response = await fetch("/api/applicant/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to send message")
      }

      const result = await response.json()
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg._id === tempId 
          ? {
              _id: result._id || result.message?._id || tempId,
              body: result.body || messageText,
              senderName: result.senderName || "You",
              senderEmail: result.senderEmail || "",
              senderRole: result.senderRole || "applicant",
              createdAt: result.createdAt || result.message?.createdAt || new Date().toISOString(),
              attachments: result.attachments || result.message?.attachments || optimisticMessage.attachments,
            }
          : msg
      ))

      showToast("Message sent", "success")
      
      // Silently refresh messages in background to get any server-side updates
      setTimeout(() => {
        fetchMessages().catch(console.error)
      }, 1000)
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId))
      setNewMessage(messageText)
      setSelectedImages(imagesToSend)
      setImagePreviews(previewsToSend)
      showToast(error.message || "Error sending message", "error")
    } finally {
      setSending(false)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col ${maxHeight} ${className}`}>
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Communication Thread</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="animate-spin h-8 w-8 border-b-2 border-teal-600 rounded-full"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-gray-500 text-center pt-10">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === "applicant"

            return (
              <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-4`}>
                <div className="flex items-start gap-2">
                  {/* Avatar for team messages */}
                  {!isMine && (
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-600 font-semibold text-sm">
                        {getInitials(msg.senderName)}
                      </span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-md px-4 py-2 rounded-lg ${
                      isMine
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{msg.senderName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>

                    {/* Attachments - Images and Files */}
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att: any, i: number) => {
                          const isImage = att.mimeType?.startsWith("image/")
                          return (
                            <div key={i} className="relative">
                              {isImage ? (
                                <div className="relative group">
                                  <img
                                    src={att.url}
                                    alt={att.originalname}
                                    className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(att.url, "_blank")}
                                  />
                                  <a
                                    href={att.url}
                                    download={att.originalname}
                                    className="absolute bottom-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  download={att.originalname}
                                  className="flex items-center gap-1 text-xs underline hover:text-teal-600"
                                >
                                  <Paperclip className="w-3 h-3" /> {att.originalname}
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Time - Single timestamp */}
                    <p className={`text-xs mt-1 ${isMine ? "text-teal-100" : "text-gray-500"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={msgEndRef}></div>
      </div>

      {/* Image/File Previews */}
      {imagePreviews.length > 0 && (
        <div className="px-3 pt-3 border-t border-gray-300 bg-white">
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((preview, index) => {
              const file = selectedImages[index]
              const isPDF = file?.type === "application/pdf"
              
              return (
                <div key={index} className="relative">
                  {isPDF || preview === "pdf-placeholder" ? (
                    <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-red-600" />
                      <span className="text-xs text-red-600 mt-1 font-medium">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {file && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                      {file.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Input - Always visible */}
      <div className="border-t border-gray-300 bg-white">
        <form onSubmit={handleSendMessage} className="p-4 flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center transition"
            title="Upload images or PDFs"
          >
            <Paperclip className="w-5 h-5" />
          </label>
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedImages.length > 0 ? "Add a message (optional)..." : "Type your message to staff here..."}
              className="w-full px-4 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
            {selectedImages.length > 0 && (
              <p className="text-xs text-gray-500">Text is optional when sharing files</p>
            )}
            {participants.length === 0 && selectedImages.length === 0 && (
              <p className="text-xs text-gray-500">Loading staff members...</p>
            )}
          </div>

          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && selectedImages.length === 0)}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition"
            title="Send message to staff"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
