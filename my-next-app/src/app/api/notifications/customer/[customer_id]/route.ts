import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Notification } from "@/app/models/Notification"; // Import the model

export async function GET(request: NextRequest, context: any) {
  const { customer_id } = context.params;

  // Basic validation for customer_id
  if (!customer_id) {
    return NextResponse.json(
      { success: false, error: "Customer ID is required" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Find notifications for the specific customer, sorted by newest first
    const notifications = await Notification.find({
      recipient_type: "customer",
      recipient_id: customer_id, // Ensure type matches schema (String/Number)
    })
      .sort({ timestamp: -1 }) // Sort by timestamp descending (newest first)
      .limit(50); // Optional: Limit the number of notifications returned

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error("Error fetching customer notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Optional: Add PATCH handler later for marking notifications as read
// export async function PATCH(request: NextRequest, context: any) { ... }
