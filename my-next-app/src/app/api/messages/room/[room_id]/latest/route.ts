import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";

export async function GET(request: Request, context: { params: any }) {
  const { room_id } = context.params;

  try {
    await dbConnect();

    // Fetch the latest message for the room
    const latestMessage = await Message.findOne({ room_id })
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({ latestMessage });
  } catch (error) {
    console.error("Error fetching latest message for room:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest message" },
      { status: 500 }
    );
  }
}
