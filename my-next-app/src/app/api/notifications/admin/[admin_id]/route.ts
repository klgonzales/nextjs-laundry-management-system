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

  // --- Convert admin_id string to Number ---
  const admin_id = parseInt(adminIdString, 10);

  // --- Add validation for the conversion ---
  if (isNaN(admin_id)) {
    return NextResponse.json(
      { success: false, error: "Invalid Admin ID format" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Find notifications using the Number type for recipient_id
    const notifications = await Notification.find({
      recipient_type: "admin",
      recipient_id: admin_id, // Now using the Number version
    })
      .sort({ timestamp: -1 })
      .limit(50);

    // Log the result AFTER the query
    // console.log(`Notifications found for admin_id ${admin_id}:`, notifications);
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
