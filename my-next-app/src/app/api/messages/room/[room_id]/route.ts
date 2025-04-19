import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";

export async function GET(request: NextRequest, context: any) {
  const { room_id } = context.params;

  try {
    await dbConnect();

    // Fetch messages for the specified room_id
    const room = await Message.findOne({ room_id }).lean();
    return NextResponse.json(room || { messages: [] });
  } catch (error) {
    console.error("Error fetching messages by room_id:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
