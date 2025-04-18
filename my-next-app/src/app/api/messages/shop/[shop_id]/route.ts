import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";

export async function GET(
  req: Request,
  { params }: { params: { shop_id: string } }
) {
  const { shop_id } = params;

  try {
    await dbConnect();

    // Fetch messages for the specified shop_id
    const messages = await Message.find({ shop_id })
      .sort({ timestamp: 1 })
      .lean();
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages by shop_id:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { shop_id: string } }
) {
  const { shop_id } = params;

  try {
    await dbConnect();

    // Parse the request body
    const body = await req.json();

    // Create a new message with the shop_id
    const newMessage = await Message.create({
      ...body,
      shop_id, // Ensure the shop_id is included
      timestamp: new Date(), // Add a timestamp
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
