import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Notification } from "@/app/models/Notification"; // Import the model

export async function GET(request: NextRequest, context: any) {
  const { admin_id: adminIdString } = context.params; // Rename for clarity

  // Basic validation for admin_id string
  if (!adminIdString) {
    return NextResponse.json(
      { success: false, error: "Admin ID is required" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Create a numeric version if possible
    const numericId = parseInt(adminIdString, 10);
    const isValidNumber = !isNaN(numericId);

    // Log what we're looking for
    console.log(
      `[API] Searching for admin notifications with ID: ${adminIdString} (numeric: ${isValidNumber ? numericId : "N/A"})`
    );

    // Use $or to match EITHER string OR number format
    const query = {
      recipient_type: "admin",
      $or: [
        { recipient_id: adminIdString }, // Match string format
        ...(isValidNumber ? [{ recipient_id: numericId }] : []), // Match numeric format if valid
      ],
    };

    console.log(`[API] Query: ${JSON.stringify(query)}`);

    // Find notifications using either format
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .limit(50);

    console.log(
      `[API] Found ${notifications.length} notifications for admin ${adminIdString}`
    );

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Optional: Add PATCH handler later for marking notifications as read
// export async function PATCH(request: NextRequest, context: any) { ... }
