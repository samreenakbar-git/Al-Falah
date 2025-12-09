import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"

/**
 * API endpoint to fix MongoDB Message collection indexes
 * Call this endpoint ONCE to drop problematic compound array indexes
 * POST /api/debug/fix-indexes
 */
export async function POST(request: Request) {
  try {
    // Security: Only allow in development or with admin token
    const adminToken = request.headers.get("x-admin-token")
    const isDev = process.env.NODE_ENV === "development"
    
    if (!isDev && adminToken !== process.env.ADMIN_FIX_TOKEN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[v0] Starting Message collection index fix...")
    await dbConnect()
    
    const db = mongoose.connection.db
    if (!db) {
      throw new Error("Database connection failed")
    }

    const collection = db.collection("messages")
    
    // Get all existing indexes
    const existingIndexes = await collection.listIndexes().toArray()
    console.log("[v0] Existing indexes:", existingIndexes.map((i) => i.name))

    // Drop problematic compound indexes on array fields
    // Check for any index that includes both recipientIds and readBy
    const indexesToDrop: string[] = []
    
    for (const idx of existingIndexes) {
      const key = idx.key as any
      // Check if index has both recipientIds and readBy (parallel arrays)
      if (key && key.recipientIds && key.readBy) {
        indexesToDrop.push(idx.name)
      }
    }
    
    // Also try common index name patterns
    const commonNames = [
      "readBy_1_recipientIds_1",
      "recipientIds_1_readBy_1",
    ]
    
    for (const name of commonNames) {
      if (existingIndexes.some((i) => i.name === name) && !indexesToDrop.includes(name)) {
        indexesToDrop.push(name)
      }
    }

    const droppedIndexes = []
    const skippedIndexes = []

    for (const indexName of indexesToDrop) {
      const indexExists = existingIndexes.some((i) => i.name === indexName)
      if (indexExists) {
        try {
          console.log(`[v0] Dropping index: ${indexName}`)
          await collection.dropIndex(indexName)
          console.log(`[v0] Successfully dropped: ${indexName}`)
          droppedIndexes.push(indexName)
        } catch (err: any) {
          if (err.code !== 27) {
            // 27 = index not found
            console.warn(`[v0] Could not drop ${indexName}:`, err.message)
            skippedIndexes.push({ name: indexName, error: err.message })
          }
        }
      } else {
        console.log(`[v0] Index does not exist: ${indexName}`)
        skippedIndexes.push({ name: indexName, reason: "not found" })
      }
    }

    const requiredIndexes: Array<{ key: Record<string, 1 | -1>; name: string }> = [
      { key: { caseId: 1, createdAt: -1 }, name: "caseId_1_createdAt_-1" },
      { key: { conversationId: 1, createdAt: -1 }, name: "conversationId_1_createdAt_-1" },
      { key: { senderId: 1, createdAt: -1 }, name: "senderId_1_createdAt_-1" },
      { key: { applicantId: 1, createdAt: -1 }, name: "applicantId_1_createdAt_-1" },
      { key: { isDeleted: 1 }, name: "isDeleted_1" },
      { key: { conversationId: 1, isDeleted: 1 }, name: "conversationId_1_isDeleted_1" },
      { key: { conversationId: 1, createdAt: -1, isDeleted: 1 }, name: "conversationId_1_createdAt_-1_isDeleted_1" },
    ]

    const createdIndexes = []
    for (const index of requiredIndexes) {
      const indexExists = existingIndexes.some((i) => i.name === index.name)
      if (!indexExists) {
        try {
          console.log(`[v0] Creating index: ${index.name}`)
          await collection.createIndex(index.key, { name: index.name })
          console.log(`[v0] Successfully created: ${index.name}`)
          createdIndexes.push(index.name)
        } catch (err: any) {
          console.error(`[v0] Error creating ${index.name}:`, err.message)
        }
      } else {
        console.log(`[v0] Index already exists: ${index.name}`)
      }
    }

    // Verify final indexes
    const finalIndexes = await collection.listIndexes().toArray()
    const finalIndexNames = finalIndexes.map((i) => i.name)
    console.log("[v0] Final indexes:", finalIndexNames)
    
    return NextResponse.json({
      success: true,
      message: "Message collection indexes fixed successfully!",
      droppedIndexes,
      skippedIndexes,
      createdIndexes,
      finalIndexes: finalIndexNames,
    })
  } catch (error: any) {
    console.error("[v0] Error during index fix:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to fix indexes" },
      { status: 500 }
    )
  }
}
