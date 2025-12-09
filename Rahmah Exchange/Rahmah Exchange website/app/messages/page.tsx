"use client"

import { useEffect, useState, useRef } from "react"
import { Mail, Send, Paperclip, AlertCircle, CheckCircle2, Check, CheckCheck } from 'lucide-react'
import Link from "next/link"
import { authenticatedFetch, getAuthToken } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"
import Image from "next/image"

interface Conversation {
  _id: string
  conversationId: string
  title: string
  lastMessage: string
  lastMessageAt: string
  messageCount: number
  unreadCount: number
  caseId: {
    caseId: string
    firstName: string
    lastName: string
  }
}

interface Message {
  _id: string
  body: string
  subject?: string
  senderName: string
  senderEmail: string
  senderRole: string
  createdAt: string
  attachments: any[]
  readBy: any[]
  senderId?: string
}

function Toast({ message, type, isVisible }: { message: string; type: "success" | "error"; isVisible: boolean }) {
  if (!isVisible) return null
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg flex items-center gap-2 text-white font-semibold z-50 animate-in fade-in slide-in-from-top-5 ${
        type === "success" ? "bg-green-500" : "bg-red-500"
      }`}
    >
      {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
    </div>
  )
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  const ADMIN_EMAIL = "staff@gmail.com"

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 4000)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get current user from token
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setCurrentUser({
          id: decoded.id || decoded._id || "",
          email: decoded.email || ADMIN_EMAIL,
          name: decoded.name || "Staff",
          role: decoded.role || "caseworker",
        })
      } catch (err) {
        console.error("Failed to decode token:", err)
        setCurrentUser({
          id: "",
          email: ADMIN_EMAIL,
          name: "Staff",
          role: "caseworker",
        })
      }
    } else {
      setCurrentUser({
        id: "",
        email: ADMIN_EMAIL,
        name: "Staff",
        role: "caseworker",
      })
    }
  }, [])

  // Fetch conversations
  useEffect(() => {
    fetchConversations()
  }, [])

  // Get caseId from URL params if present - create/open conversation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const caseIdParam = urlParams.get("caseId")
    const applicantIdParam = urlParams.get("applicantId")
    
    if (caseIdParam && applicantIdParam && conversations.length >= 0) {
      // Find existing conversation or create new one
      handleOpenOrCreateConversation(caseIdParam, applicantIdParam)
    }
  }, [conversations])

  const handleOpenOrCreateConversation = async (caseId: string, applicantId: string) => {
    // First, check if conversation already exists
    const existingConv = conversations.find(
      conv => conv.caseId?.caseId === caseId
    )
    
    if (existingConv) {
      // Open existing conversation
      handleSelectConversation(existingConv)
      // Clear URL params
      window.history.replaceState({}, '', '/messages')
      return
    }

    // Create new conversation
    try {
      const token = getAuthToken()
      const response = await fetch("/api/messages/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-email": ADMIN_EMAIL,
        },
        body: JSON.stringify({
          caseId: applicantId, // Send MongoDB ObjectId (applicantId) as caseId
          participantIds: [],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.conversation) {
          // Refresh conversations to get the new one
          await fetchConversations()
          
          // Wait a bit for state to update, then find and select
          setTimeout(() => {
            setConversations(prev => {
              const newConv = prev.find(conv => conv.caseId?.caseId === caseId)
              if (newConv) {
                handleSelectConversation(newConv)
              } else {
                // Create conversation object from API response
                const convObj: Conversation = {
                  _id: data.conversation._id,
                  conversationId: data.conversation.conversationId,
                  title: data.conversation.title || "",
                  lastMessage: "",
                  lastMessageAt: new Date().toISOString(),
                  messageCount: 0,
                  unreadCount: 0,
                  caseId: {
                    caseId: caseId,
                    firstName: data.conversation.caseId?.firstName || "Unknown",
                    lastName: data.conversation.caseId?.lastName || "",
                  },
                }
                handleSelectConversation(convObj)
              }
              return prev
            })
          }, 100)
          
          // Clear URL params
          window.history.replaceState({}, '', '/messages')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.message || "Failed to create conversation", "error")
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
      showToast("Failed to create conversation", "error")
    }
  }

  const fetchConversations = async (preserveUnreadCountFor?: string) => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`/api/messages/conversations?archived=false`)
      if (!response.ok) throw new Error("Failed to load conversations")
      const data = await response.json()
      const serverConversations = data.conversations || []
      
      // If we're preserving unread count for a specific conversation (optimistic update)
      if (preserveUnreadCountFor) {
        setConversations(prev => {
          const preservedConv = prev.find(c => c._id === preserveUnreadCountFor || c.conversationId === preserveUnreadCountFor)
          const serverConv = serverConversations.find((c: any) => c._id === preserveUnreadCountFor || c.conversationId === preserveUnreadCountFor)
          
          if (preservedConv && preservedConv.unreadCount === 0 && serverConv) {
            // Merge server data but keep unreadCount as 0
            return serverConversations.map((c: any) => 
              (c._id === preserveUnreadCountFor || c.conversationId === preserveUnreadCountFor)
                ? { ...c, unreadCount: 0 }
                : c
            )
          }
          return serverConversations
        })
      } else {
        setConversations(serverConversations)
      }
    } catch (error: any) {
      console.error("Error fetching conversations:", error)
      showToast("Failed to load conversations", "error")
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string, markAsRead: boolean = true) => {
    try {
      // Remove loading delay - fetch immediately
      const response = await authenticatedFetch(`/api/messages/conversations/${conversationId}`)
      if (!response.ok) throw new Error("Failed to load messages")
      const data = await response.json()
      
      // Normalize messages - ensure senderId is a string for comparison
      const normalizedMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        senderId: msg.senderId?._id?.toString() || msg.senderId?.toString() || msg.senderId,
      }))
      
      setMessages(normalizedMessages)
      
      // Mark as read and refresh conversations to update unread count
      if (markAsRead) {
        markConversationAsRead(conversationId)
        // Delay slightly to ensure server has updated, and preserve unreadCount: 0 for this conversation
        setTimeout(() => {
          // Get current conversation ID to preserve
          setConversations(prev => {
            const currentConv = prev.find(c => c.conversationId === conversationId)
            const convIdToPreserve = currentConv?._id || conversationId
            // Fetch and merge, preserving unreadCount: 0
            fetchConversations(convIdToPreserve).catch(console.error)
            return prev // Keep current state until server responds
          })
        }, 500) // Delay to ensure server has updated lastReadAt
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error)
      showToast("Failed to load messages", "error")
    }
  }

  const handleSelectConversation = (conversation: Conversation) => {
    // Immediately update unread count in local state
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversation._id 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    )
    setSelectedConversation(conversation)
    // Fetch messages immediately without loading delay
    fetchMessages(conversation.conversationId, true)
  }

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const token = getAuthToken()
      const headers = new Headers()
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }
      headers.set("x-admin-email", ADMIN_EMAIL)

      await fetch(`/api/messages/conversations/${conversationId}/mark-read`, {
        method: "POST",
        headers,
      })
    } catch (error) {
      console.error("Error marking conversation as read:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    const messageText = newMessage
    
    // Optimistically update UI
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      _id: tempId,
      body: messageText,
      senderName: currentUser?.name || "You",
      senderEmail: currentUser?.email || ADMIN_EMAIL,
      senderRole: currentUser?.role || "caseworker",
      createdAt: new Date().toISOString(),
      attachments: [],
      readBy: [],
      senderId: currentUser?.id || undefined
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage("")
    
    // Update conversation list optimistically
    setConversations(prev =>
      prev.map(conv =>
        conv._id === selectedConversation._id
          ? {
              ...conv,
              lastMessage: messageText,
              lastMessageAt: new Date().toISOString(),
              messageCount: conv.messageCount + 1,
              unreadCount: 0
            }
          : conv
      )
    )

    try {
      const formData = new FormData()
      formData.append("conversationId", selectedConversation.conversationId)
      formData.append("body", messageText)
      formData.append("messageType", "text")

      const token = getAuthToken()
      const headers = new Headers()
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }
      headers.set("x-admin-email", ADMIN_EMAIL)

      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers,
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.message || "Failed to send message")
      }

      const result = await response.json()
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg._id === tempId 
          ? {
              _id: result._id || result.message?._id || tempId,
              body: result.body || messageText,
              senderName: result.senderName || currentUser?.name || "You",
              senderEmail: result.senderEmail || currentUser?.email || ADMIN_EMAIL,
              senderRole: result.senderRole || currentUser?.role || "caseworker",
              createdAt: result.createdAt || result.message?.createdAt || new Date().toISOString(),
              attachments: result.attachments || result.message?.attachments || [],
              readBy: result.readBy || result.message?.readBy || [],
              senderId: result.senderId || currentUser?.id || undefined
            }
          : msg
      ))

      showToast("Message sent successfully", "success")
      
      // Silently refresh conversations in background
      setTimeout(() => {
        fetchConversations().catch(console.error)
      }, 500)
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId))
      setNewMessage(messageText)
      // Revert conversation update
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessage: selectedConversation.lastMessage || "",
                lastMessageAt: selectedConversation.lastMessageAt || "",
                messageCount: Math.max(0, conv.messageCount - 1),
                unreadCount: selectedConversation.unreadCount || 0
              }
            : conv
        )
      )
      console.error("Error sending message:", error)
      showToast(error.message || "Failed to send message", "error")
    } finally {
      setSending(false)
    }
  }

  const isMessageRead = (msg: Message) => {
    return msg.readBy && msg.readBy.some(r => r.userId !== null)
  }

  const isOwnMessage = (msg: Message) => {
    if (!currentUser || !currentUser.id) return false
    
    // Only show messages on the right if they are from the current logged-in staff member
    // All other messages (from other staff or applicants) should be on the left
    
    // Normalize senderId - handle both string and object formats
    let senderIdStr = ""
    if (msg.senderId) {
      if (typeof msg.senderId === "object" && (msg.senderId as any)?._id) {
        senderIdStr = (msg.senderId as any)._id.toString()
      } else {
        senderIdStr = msg.senderId.toString()
      }
    }
    
    // Normalize current user ID
    const currentUserIdStr = currentUser.id.toString()
    
    // Check by senderId first (most reliable) - must be exact match
    if (senderIdStr && currentUserIdStr) {
      return senderIdStr === currentUserIdStr
    }
    
    // Fallback to email comparison - only if senderId is not available
    // But be more strict - only match if email exactly matches current user's email
    const msgEmail = (msg.senderEmail || "").toLowerCase().trim()
    const userEmail = (currentUser.email || "").toLowerCase().trim()
    
    // Only return true if email matches AND it's not the generic admin email
    // (unless the current user is actually using that email)
    if (msgEmail && userEmail && msgEmail === userEmail) {
      return true
    }
    
    // If no match found, it's not the current user's message
    return false
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={120} height={120} priority />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">Communicate with staff</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/staff/dashboard" className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-teal-600" />
              Messages
            </h2>
            <p className="text-xs text-gray-500 mt-1">{conversations.length} conversation(s)</p>
          </div>

          <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-sm">No conversations</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelectConversation(conv)
                    }}
                    className={`p-3 border-b border-gray-200 cursor-pointer transition ${
                      selectedConversation?._id === conv._id
                        ? "bg-teal-50 border-l-4 border-l-teal-600"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {conv.caseId?.firstName || "Unknown"} {conv.caseId?.lastName || ""}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{conv.caseId?.caseId || "N/A"}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1 truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-teal-600 rounded-full shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-600 font-semibold">
                      {((selectedConversation.caseId?.firstName || "U") + " " + (selectedConversation.caseId?.lastName || "")).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedConversation.caseId?.firstName || "Unknown"} {selectedConversation.caseId?.lastName || ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.caseId?.caseId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = isOwnMessage(msg)
                        
                        return (
                          <div
                            key={msg._id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-md px-4 py-2 rounded-lg ${
                                isOwn
                                  ? "bg-teal-600 text-white"
                                  : "bg-white text-gray-900 border border-gray-200"
                              }`}
                            >
                              {/* Only show sender name for messages from other staff members (not own messages) */}
                              {!isOwn && msg.senderRole !== "applicant" && (
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
                              {/* For own messages, only show timestamp */}
                              {isOwn && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-teal-100">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              )}
                              {/* For applicant messages, show sender name */}
                              {!isOwn && msg.senderRole === "applicant" && (
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
                              
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {msg.attachments.map((att, idx) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-xs underline flex items-center gap-1 ${
                                        isOwn ? 'text-teal-100' : 'text-teal-600'
                                      }`}
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      {att.originalname}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
