"use client"

import { useEffect, useState } from "react"
import { authenticatedFetch } from "@/lib/auth-utils"
import { Send, Paperclip, AlertCircle, CheckCircle2, Download } from "lucide-react"

interface Message {
  _id: string
  body: string
  senderName: string
  senderEmail: string
  senderRole: string
  createdAt: string
  attachments: any[]
}

interface CaseMessagesProps {
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

export default function CaseMessages({ caseId, conversationId, className = "", maxHeight = "h-[500px]" }: CaseMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 4000)
  }

  useEffect(() => {
    fetchMessages()
  }, [conversationId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`/api/messages/conversations/${conversationId}`)

      if (!response.ok) {
        throw new Error("Failed to load messages")
      }

      const data = await response.json()
      setMessages(data.messages)
    } catch (error: any) {
      console.error("Error fetching messages:", error)
      showToast("Failed to load messages", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!newMessage.trim()) return

    setSending(true)
    const messageText = newMessage
    
    // Optimistically update UI
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      _id: tempId,
      body: messageText,
      senderName: "You",
      senderEmail: "",
      senderRole: "staff",
      createdAt: new Date().toISOString(),
      attachments: [],
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage("")

    try {
      const formData = new FormData()
      formData.append("conversationId", conversationId)
      formData.append("body", messageText)
      formData.append("messageType", "text")

      const response = await authenticatedFetch("/api/messages/send", {
        method: "POST",
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
              senderRole: result.senderRole || "staff",
              createdAt: result.createdAt || result.message?.createdAt || new Date().toISOString(),
              attachments: result.attachments || result.message?.attachments || [],
            }
          : msg
      ))

      showToast("Message sent successfully", "success")
      
      // Silently refresh messages in background to get any server-side updates
      setTimeout(() => {
        fetchMessages().catch(console.error)
      }, 1000)
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId))
      setNewMessage(messageText)
      console.error("Error sending message:", error)
      showToast(error.message || "Failed to send message", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col ${maxHeight} ${className}`}>
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>Communication Thread</span>
          {messages.length > 0 && (
            <span className="text-sm font-normal text-gray-500">({messages.length} messages)</span>
          )}
        </h3>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {msg.senderName}
                    <span className="text-xs font-normal text-gray-500 ml-2">({msg.senderRole})</span>
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-2">{msg.body}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((att, idx) => {
                      const isImage = att.mimeType?.startsWith("image/")
                      return (
                        <div key={idx} className="relative">
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
                              rel="noopener noreferrer"
                              className="text-xs text-teal-600 hover:underline flex items-center gap-1 bg-white px-2 py-1 rounded"
                            >
                              <Paperclip className="w-3 h-3" />
                              {att.originalname}
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 text-sm flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
