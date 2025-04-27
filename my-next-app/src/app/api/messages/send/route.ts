import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";
import { Shop } from "@/app/models/Shop";
import { Customer } from "@/app/models/Customer";
import { pusherServer } from "@/app/lib/pusherServer";

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Parse request body
    const body = await request.json();
    const { room_id, customer_id, shop_id, sender, text } = body;

    if (!room_id || !customer_id || !shop_id || !sender || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new message in the database
    const newMessage = await Message.create({
      room_id,
      customer_id,
      shop_id,
      sender,
      text,
      timestamp: new Date(),
    });

    // Update customer and shop references if needed
    try {
      // Add to customer's messages if needed
      await Customer.findOneAndUpdate(
        { customer_id },
        { $addToSet: { messages: newMessage._id } }
      );

      // Add to shop's messages if needed
      await Shop.findOneAndUpdate(
        { shop_id },
        { $addToSet: { messages: newMessage._id } }
      );
    } catch (refError) {
      console.error("Error updating references:", refError);
      // Continue anyway since the message is already saved
    }

    // Trigger Pusher event
    try {
      await pusherServer.trigger(`chat-${room_id}`, "new-message", {
        _id: newMessage._id.toString(),
        room_id,
        customer_id,
        shop_id,
        sender,
        text,
        timestamp: newMessage.timestamp,
      });
      console.log(`[API] Message sent to Pusher channel chat-${room_id}`);
    } catch (pusherError) {
      console.error("[API] Error triggering Pusher event:", pusherError);
      // Still return success as the message is saved in DB
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
