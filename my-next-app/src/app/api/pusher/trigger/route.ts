import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/app/lib/pusherServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, event, data } = body;

    if (!channel || !event) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await pusherServer.trigger(channel, event, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering Pusher event:", error);
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 }
    );
  }
}
