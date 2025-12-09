import { type NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth-middleware";
import Message from "@/lib/models/Message";
import Conversation from "@/lib/models/Conversation";

export async function GET(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  const conversationId = params.conversationId;

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
  }

  try {
    const { error, user } = await authenticateRequest(request);
    if (error || !user) {
      return NextResponse.json({ message: error || "Unauthorized" }, { status: 401 });
    }

    const userId = user._id?.toString();
    if (!userId) return NextResponse.json({ message: "Invalid user" }, { status: 401 });

    // Allow all staff roles (admin, caseworker, approver, treasurer) to access messages
    const isStaff = ["admin", "caseworker", "approver", "treasurer"].includes(user.role);

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    await dbConnect();

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.userId?.toString() === userId
    );
    if (!isParticipant && !isStaff) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "name email internalEmail")
      .lean();

    const total = await Message.countDocuments({
      conversationId,
      isDeleted: false,
    });

    // Mark messages as read
    await Message.updateMany(
      { conversationId, "readBy.userId": { $ne: new mongoose.Types.ObjectId(userId) } },
      { $push: { readBy: { userId: new mongoose.Types.ObjectId(userId), readAt: new Date() } } }
    );

    await Conversation.updateOne(
      { conversationId, "participants.userId": userId },
      { $set: { "participants.$.lastReadAt": new Date() } }
    );

    return NextResponse.json({ messages, total, page, limit, conversation }, { status: 200 });
  } catch (error: any) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
