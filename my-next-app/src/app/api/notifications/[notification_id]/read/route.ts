import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Notification } from "@/app/models/Notification";
import { pusherServer } from "@/app/lib/pusherServer";

export async function PATCH(request: Request, context: { params: any }) {
  try {
    const notificationId = context.params;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Marking notification ${notificationId} as read`);

    // Connect to database
    await dbConnect();

    // Find the notification first to get recipient info
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Update the notification
    notification.read = true;
    await notification.save();

    console.log(
      `[API] Notification ${notificationId} marked as read successfully`
    );

    // When triggering the Pusher event, make sure to use the correct channel name pattern:
    // Determine the correct channel name based on recipient type
    const recipientId = notification.recipient_id;
    const recipientType = notification.recipient_type;

    // Use 'client' for customer type in channel name
    const channelName = `private-${recipientType === "customer" ? "client" : recipientType}-${recipientId}`;

    // Trigger Pusher event to update UI in real-time
    await pusherServer.trigger(channelName, "notification-read", {
      notification_id: notificationId,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[API] Pusher event triggered on ${channelName} for notification ${notificationId}`
    );

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("[API] Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
