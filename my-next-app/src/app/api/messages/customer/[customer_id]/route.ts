import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";
import { Customer } from "@/app/models/Customer";

export async function GET(
  req: Request,
  { params }: { params: { customer_id: string } }
) {
  const { customer_id } = params;

  try {
    await dbConnect();

    // Fetch messages for the specified customer_id
    const messages = await Message.find({ customer_id })
      .sort({ timestamp: 1 })
      .lean();
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages by customer_id:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { customer_id: string } }
) {
  const { customer_id } = params;

  try {
    await dbConnect();

    // Parse the request body
    const body = await req.json();

    // Create a new message with the customer_id
    const newMessage = await Message.create({
      ...body,
      customer_id, // Ensure the customer_id is included
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
