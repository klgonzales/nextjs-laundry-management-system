import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";

export async function GET(request: Request, context: { params: any }) {
  const { room_id } = context.params;

  try {
    await dbConnect();

    // Fetch messages for the specified room
    const messages = await Message.find({ room_id })
      .sort({ timestamp: 1 })
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages for room:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
