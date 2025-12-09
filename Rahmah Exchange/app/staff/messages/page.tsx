"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Users, Search, MessageSquare, LogOut, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { authenticatedFetch, getAuthToken, removeAuthToken } from "@/lib/auth-utils"
import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/navigation"

interface StaffUser {
  _id: string
  name: string
  email: string
  role: string
  internalEmail?: string
  isActive?: boolean
}

interface StaffConversation {
  _id: string
  conversationId: string
  title: string
  participants: Array<{
    userId: string
    name: string
    email: string
    role: string
  }>
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
  messageCount: number
}

interface StaffMessage {
  _id: string
  body: string
  senderName: string
  senderEmail: string
  senderRole: string
  senderId: string
  createdAt: string
  readBy: Array<{ userId: string; readAt: string }>
}

export default function StaffMessagesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null)
  const [conversations, setConversations] = useState<StaffConversation[]>([])
  const [allStaff, setAllStaff] = useState<StaffUser[]>([])
  const [selectedConversation, setSelectedConversation] = useState<StaffConversation | null>(null)
  const [messages, setMessages] = useState<StaffMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastFetchRef = useRef<number>(0)
  const lastMessageFetchRef = useRef<{ [key: string]: number }>({})

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push("/staff/login")
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      setCurrentUser({
        _id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      })
    } catch (err) {
      console.error("Failed to decode token:", err)
      router.push("/staff/login")
    }
  }, [router])

  // Fetch staff and conversations when currentUser is set
  useEffect(() => {
    if (currentUser) {
      fetchAllStaff()
      fetchConversations()

      // Refresh staff list and conversations periodically to show new users
      // Only refresh when not actively viewing a conversation to avoid conflicts
      // Increased interval to reduce API calls
      const interval = setInterval(() => {
        if (!selectedConversation && !sending) {
          fetchAllStaff()
          fetchConversations()
        }
      }, 30000) // Refresh every 30 seconds (reduced frequency)

      return () => clearInterval(interval)
    }
  }, [currentUser, selectedConversation, sending])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedConversation) {
      // Fetch messages immediately without loading delay
      fetchMessages(selectedConversation.conversationId, true)
      
      // Poll for new messages less frequently to reduce API calls
      // Use a ref to track if we're currently loading to avoid dependency issues
      const interval = setInterval(() => {
        // Check current state without causing re-renders
        if (selectedConversation && !sending) {
          // Don't mark as read on polling, only on initial load
          fetchMessages(selectedConversation.conversationId, false).catch(console.error)
        }
      }, 10000) // Poll every 10 seconds
      return () => clearInterval(interval)
    }
  }, [selectedConversation?.conversationId, sending]) // Removed loadingMessages to prevent continuous restarts

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchAllStaff = async () => {
    try {
      const res = await authenticatedFetch("/api/staff/users")
      if (res.ok) {
        const data = await res.json()
        // API already filters for staff and active users, but double-check
        // Also exclude current user from the list
        const currentUserId = currentUser?._id?.toString()
        const staff = (data.users || []).filter(
          (u: StaffUser) => {
            const userId = u._id?.toString() || u._id
            return u.role !== "applicant" && 
                   u.isActive !== false && 
                   userId !== currentUserId
          }
        )
        setAllStaff(staff)
      } else {
        console.error("Failed to fetch staff users:", res.status, res.statusText)
      }
    } catch (err) {
      console.error("Error fetching staff:", err)
    }
  }

  const fetchConversations = async (preserveUnreadCountFor?: string) => {
    // Throttle API calls - minimum 2 seconds between fetches
    const FETCH_THROTTLE_MS = 2000
    const now = Date.now()
    if (now - lastFetchRef.current < FETCH_THROTTLE_MS && lastFetchRef.current > 0) {
      return // Skip if called too recently (but allow first call)
    }
    lastFetchRef.current = now

    try {
      setLoading(true)
      const res = await authenticatedFetch("/api/staff/messages/conversations")
      if (!res.ok) throw new Error("Failed to load conversations")
      const data = await res.json()
      const serverConversations = data.conversations || []
      
      // If we're preserving unread count for a specific conversation (optimistic update)
      if (preserveUnreadCountFor) {
        setConversations(prev => {
          const preservedConv = prev.find(c => c._id === preserveUnreadCountFor || c.conversationId === preserveUnreadCountFor)
          const serverConv = serverConversations.find((c: any) => c._id === preserveUnreadCountFor || c.conversationId === preserveUnreadCountFor)
          
          if (preservedConv && preservedConv.unreadCount === 0 && serverConv) {
            // Merge server data but keep unreadCount: 0
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
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string, markAsRead: boolean = true) => {
    // Throttle API calls per conversation - minimum 2 seconds between fetches for same conversation
    // This prevents too frequent calls but allows polling to work
    const MESSAGE_FETCH_THROTTLE_MS = 2000
    const now = Date.now()
    const lastFetch = lastMessageFetchRef.current[conversationId] || 0
    if (now - lastFetch < MESSAGE_FETCH_THROTTLE_MS && lastFetch > 0) {
      return // Skip if called too recently for this conversation (but allow first call)
    }
    lastMessageFetchRef.current[conversationId] = now
    
    // Skip if already loading to prevent duplicate calls
    if (loadingMessages) {
      return
    }
    
    try {
      setLoadingMessages(true)
      const res = await authenticatedFetch(`/api/staff/messages/conversations/${conversationId}`)
      if (!res.ok) throw new Error("Failed to load messages")
      const data = await res.json()
      const newMessages = data.messages || []
      
      // Always update messages to ensure we have the latest
      setMessages(newMessages)
      
      // Mark conversation as read and update local state (don't fetch conversations again)
      if (markAsRead) {
        // Update local conversation state to mark as read without another API call
        setConversations(prev => 
          prev.map(conv => 
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        )
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleStartConversation = async (recipientIds: string[]) => {
    try {
      setSending(true)
      const res = await authenticatedFetch("/api/staff/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds }),
      })

      if (!res.ok) throw new Error("Failed to create conversation")
      const data = await res.json()
      setSelectedConversation(data.conversation)
      setShowNewChat(false)
      setSelectedRecipients([])
      // Refresh conversations but don't cause reload
      fetchConversations().catch(console.error)
    } catch (error: any) {
      console.error("Error creating conversation:", error)
      alert(error.message || "Failed to start conversation")
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent any form submission bubbling
    if (!newMessage.trim() || !selectedConversation) return

    const messageText = newMessage.trim()
    setNewMessage("") // Clear input immediately for better UX

    try {
      setSending(true)
      const formData = new FormData()
      formData.append("conversationId", selectedConversation.conversationId)
      formData.append("body", messageText)

      const res = await authenticatedFetch("/api/staff/messages/send", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to send message")
      }

      const result = await res.json()
      
      // Optimistically add message to UI with real data from server
      const newMsg: StaffMessage = {
        _id: result._id || result.message?._id || Date.now().toString(),
        body: messageText,
        senderName: result.senderName || currentUser?.name || "You",
        senderEmail: result.senderEmail || currentUser?.email || "",
        senderRole: result.senderRole || currentUser?.role || "",
        senderId: result.senderId || currentUser?._id || "",
        createdAt: result.createdAt || result.message?.createdAt || new Date().toISOString(),
        readBy: result.readBy || [],
      }
      setMessages(prev => [...prev, newMsg])
      
      // Update conversation list locally without another API call
      setConversations(prev =>
        prev.map(conv =>
          conv.conversationId === selectedConversation.conversationId
            ? {
                ...conv,
                lastMessage: messageText,
                lastMessageAt: new Date().toISOString(),
                messageCount: (conv.messageCount || 0) + 1,
                unreadCount: 0, // Mark as read for sender
              }
            : conv
        )
      )
      
      // Silently refresh messages only (not conversations) after a longer delay
      setTimeout(() => {
        if (selectedConversation && !sending) {
          fetchMessages(selectedConversation.conversationId, false).catch(console.error)
        }
      }, 2000) // Increased delay to reduce API calls
    } catch (error: any) {
      console.error("Error sending message:", error)
      // Restore message text on error
      setNewMessage(messageText)
      alert(error.message || "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const getOtherParticipants = (conversation: StaffConversation) => {
    if (!currentUser) return []
    return conversation.participants.filter((p) => p.userId !== currentUser._id)
  }

  const getConversationTitle = (conversation: StaffConversation) => {
    const others = getOtherParticipants(conversation)
    if (others.length === 0) return "You"
    if (others.length === 1) return others[0].name
    return `${others[0].name} + ${others.length - 1} more`
  }

  const filteredStaff = allStaff.filter(
    (staff) =>
      staff._id !== currentUser?._id &&
      (staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleLogout = async () => {
    try {
      const token = getAuthToken()
      if (token) {
        await authenticatedFetch(`/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => {})
      }
      removeAuthToken()
      router.push("/staff/login")
    } catch (err) {
      console.error("Logout failed:", err)
      removeAuthToken()
      router.push("/staff/login")
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/staff/dashboard">
              <Image src="/logo1.svg" alt="Rahmah Exchange Logo" width={120} height={120} priority />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Staff Internal Messages</h1>
              <p className="text-sm text-gray-500">Communicate with your team</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/staff/dashboard"
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - All Staff Members & Conversations */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search staff members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* All Staff Members Section */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">All Staff Members</h3>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-teal-600" />
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No staff members found</p>
                ) : (
                  filteredStaff.map((staff) => {
                    // Find existing conversation with this staff member
                    const existingConv = conversations.find((conv) => {
                      const others = getOtherParticipants(conv)
                      return others.length === 1 && others[0].userId === staff._id
                    })

                    return (
                      <div
                        key={staff._id}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (existingConv) {
                            // Immediately update unread count in local state
                            setConversations(prev => 
                              prev.map(conv => 
                                conv._id === existingConv._id 
                                  ? { ...conv, unreadCount: 0 }
                                  : conv
                              )
                            )
                            setSelectedConversation(existingConv)
                            // Mark as read when opening
                            fetchMessages(existingConv.conversationId, true)
                          } else {
                            // Create new conversation
                            await handleStartConversation([staff._id])
                          }
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          existingConv && selectedConversation?._id === existingConv._id
                            ? "bg-teal-50 border-teal-600"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-teal-600 font-semibold text-sm">
                              {staff.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate text-sm">{staff.name}</p>
                              {existingConv && existingConv.unreadCount > 0 && (
                                <span className="bg-teal-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
                                  {existingConv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{staff.email}</p>
                            <span className="text-xs text-gray-400 capitalize">{staff.role}</span>
                          </div>
                          {existingConv && (
                            <div className="text-xs text-gray-400">
                              {existingConv.lastMessageAt
                                ? new Date(existingConv.lastMessageAt).toLocaleDateString()
                                : ""}
                            </div>
                          )}
                        </div>
                        {existingConv?.lastMessage && (
                          <p className="text-xs text-gray-600 truncate mt-2 ml-13">
                            {existingConv.lastMessage}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Group Conversations Section */}
            {conversations.filter((conv) => getOtherParticipants(conv).length > 1).length > 0 && (
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Group Conversations</h3>
                <div className="space-y-2">
                  {conversations
                    .filter((conv) => getOtherParticipants(conv).length > 1)
                    .map((conversation) => {
                      const others = getOtherParticipants(conversation)
                      const isSelected = selectedConversation?._id === conversation._id
                      return (
                        <div
                          key={conversation._id}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // Immediately update unread count in local state
                            setConversations(prev => 
                              prev.map(conv => 
                                conv._id === conversation._id 
                                  ? { ...conv, unreadCount: 0 }
                                  : conv
                              )
                            )
                            setSelectedConversation(conversation)
                            // Mark as read when opening
                            fetchMessages(conversation.conversationId, true)
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition ${
                            isSelected ? "bg-teal-50 border-teal-600" : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Users className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate text-sm">
                                    {getConversationTitle(conversation)}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {others.length} participants
                                  </p>
                                </div>
                              </div>
                              {conversation.lastMessage && (
                                <p className="text-xs text-gray-600 truncate mt-1 ml-10">
                                  {conversation.lastMessage}
                                </p>
                              )}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <span className="ml-2 bg-teal-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {showNewChat ? (
            <div className="flex-1 flex flex-col p-6">
              <div className="mb-4">
                <button
                  onClick={() => {
                    setShowNewChat(false)
                    setSelectedRecipients([])
                  }}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  ← Back
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Start New Conversation</h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search staff members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {filteredStaff.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No staff members found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredStaff.map((staff) => {
                      const isSelected = selectedRecipients.includes(staff._id)
                      return (
                        <div
                          key={staff._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRecipients(selectedRecipients.filter((id) => id !== staff._id))
                            } else {
                              setSelectedRecipients([...selectedRecipients, staff._id])
                            }
                          }}
                          className={`p-4 border rounded-lg cursor-pointer transition ${
                            isSelected ? "bg-teal-50 border-teal-600" : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                              <span className="text-teal-600 font-semibold">
                                {staff.name?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{staff.name}</p>
                              <p className="text-sm text-gray-500">{staff.email}</p>
                              <span className="text-xs text-gray-400 capitalize">{staff.role}</span>
                            </div>
                            {isSelected && <div className="text-teal-600">✓</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => handleStartConversation(selectedRecipients)}
                  disabled={selectedRecipients.length === 0 || sending}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Starting..." : `Start Conversation (${selectedRecipients.length})`}
                </button>
              </div>
            </div>
          ) : selectedConversation ? (
            <>
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-600 font-semibold">
                      {getOtherParticipants(selectedConversation)[0]?.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getConversationTitle(selectedConversation)}</p>
                    <p className="text-xs text-gray-500">
                      {getOtherParticipants(selectedConversation)
                        .map((p) => p.role)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.senderId === currentUser?._id
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-md px-4 py-2 rounded-lg ${
                              isOwnMessage
                                ? "bg-teal-600 text-white"
                                : "bg-white text-gray-900 border border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{message.senderName}</span>
                              <span className={`text-xs ${isOwnMessage ? "text-teal-100" : "text-gray-500"}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="bg-white border-t border-gray-200 p-4">
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
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

