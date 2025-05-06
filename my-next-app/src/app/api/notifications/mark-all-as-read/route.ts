import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Notification } from "@/app/models/Notification"; // Import the model
// Import pusherServer at the top
import { pusherServer } from "@/app/lib/pusherServer";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userType } = body;

    if (!userId || !userType) {
      return NextResponse.json(
        { error: "User ID and type are required" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Received request to mark notifications as read for ${userType} ${userId}`
    );

    // Ensure MongoDB connection
    await dbConnect();

    // No need for conversion if userType comes directly from useAuth
    // Just validate it's one of the expected values
    if (userType !== "admin" && userType !== "customer") {
      return NextResponse.json(
        { error: "Invalid user type. Must be 'admin' or 'customer'" },
        { status: 400 }
      );
    }

    // Inside your POST handler, update the query:
    const numericId = parseInt(userId, 10);
    const isValidNumber = !isNaN(numericId);

    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      {
        recipient_type: userType,
        $or: [
          { recipient_id: userId }, // Match string format
          ...(isValidNumber ? [{ recipient_id: numericId }] : []), // Match numeric format if valid
        ],
        read: false,
      },
      { $set: { read: true } }
    );

    console.log(
      `[API] Marked ${result.modifiedCount} notifications as read for ${userType} ${userId}`
    );

    // Inside the POST handler, after updating the database:
    if (result.modifiedCount > 0) {
      // Trigger a Pusher event
      const channelName = `private-${userType === "customer" ? "client" : userType}-${userId}`;
      console.log(`[API] Triggering Pusher event on channel: ${channelName}`);

      await pusherServer.trigger(channelName, "notifications-all-read", {
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("[API] Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
