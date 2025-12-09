import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { dbConnect } from "@/lib/db"

export async function GET() {
  try {
    await dbConnect()
    
    const db = mongoose.connection.db
    if (!db) {
      throw new Error("Database connection failed")
    }

    const collection = db.collection("messages")
    
    // Get all existing indexes
    const existingIndexes = await collection.listIndexes().toArray()
    console.log("Existing indexes:", existingIndexes.map((i) => i.name))
    
    const droppedIndexes = []
    const errors = []
    
    // Drop problematic compound indexes on array fields
    const indexesToDrop = [
      "readBy_1_recipientIds_1",
      "recipientIds_1_readBy_1",
      "readBy_1",
      "recipientIds_1",
    ]

    for (const indexName of indexesToDrop) {
      const indexExists = existingIndexes.some((i) => i.name === indexName)
      if (indexExists) {
        try {
          await collection.dropIndex(indexName)
          droppedIndexes.push(indexName)
          console.log(`✓ Dropped index: ${indexName}`)
        } catch (err: any) {
          if (err.code !== 27) { // 27 = index not found
            errors.push({ index: indexName, error: err.message })
            console.error(`✗ Could not drop ${indexName}:`, err.message)
          }
        }
      }
    }
    
    // Get final indexes after cleanup
    const finalIndexes = await collection.listIndexes().toArray()
    console.log("Final indexes:", finalIndexes.map((i) => i.name))
    
    return NextResponse.json({ 
      success: true, 
      message: "Index cleanup completed!",
      droppedIndexes,
      errors,
      remainingIndexes: finalIndexes.map((i) => i.name)
    })
    
  } catch (error: any) {
    console.error("Error fixing indexes:", error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}