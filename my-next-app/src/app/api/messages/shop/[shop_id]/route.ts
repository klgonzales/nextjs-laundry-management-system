import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";
import { Shop } from "@/app/models/Shop";

export async function GET(request: NextRequest, context: any) {
  const { shop_id } = context.params;

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

export async function POST(req: NextRequest, context: any) {
  const { shop_id } = context.params;

  try {
    await dbConnect();

    // Parse the request body
    const body = await req.json();

    // Create a new message with the shop_id
    const newMessage = await Message.create({
      ...body,
      shop_id,
      timestamp: new Date(),
    });

    // Add the message to the shop's messages array
    await Shop.findOneAndUpdate(
      { shop_id },
      { $push: { messages: newMessage._id } }
    );

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
