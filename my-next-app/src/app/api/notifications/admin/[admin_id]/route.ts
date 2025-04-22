import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Notification } from "@/app/models/Notification"; // Import the model

export async function GET(request: NextRequest, context: any) {
  const { admin_id } = context.params;

  // Basic validation for admin_id
  if (!admin_id) {
    return NextResponse.json(
      { success: false, error: "Admin ID is required" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Find notifications for the specific admin, sorted by newest first
    const notifications = await Notification.find({
      recipient_type: "admin",
      recipient_id: admin_id, // Ensure type matches schema (String/Number)
    })
      .sort({ timestamp: -1 }) // Sort by timestamp descending (newest first)
      .limit(50); // Optional: Limit the number of notifications returned

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
