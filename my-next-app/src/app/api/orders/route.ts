import { NextResponse } from "next/server";
import { Order } from "@/app/models/Orders";
import dbConnect from "@/app/lib/mongodb";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Validate shop_id
    if (!body.shop_id) {
      throw new Error("shop_id is required");
    }

    // Validate required fields
    if (!body.customer_id) {
      throw new Error("customer_id is required");
    }
    if (!body.order_type) {
      throw new Error("order_type is required");
    }
    if (!body.clothing || !Array.isArray(body.clothing)) {
      throw new Error("clothing is required and must be an array");
    }

    // Validate clothing items
    body.clothing.forEach((item: any) => {
      if (!item.type || !item.quantity) {
        throw new Error("Each clothing item must have a type and quantity");
      }
    });

    // Create the new order
    const newOrder = await Order.create({
      customer_id: body.customer_id,
      order_id: Math.floor(Math.random() * 1000000000).toString(), // Generate a unique ID
      shop: body.shop_id, // Store shop_id as a string
      services: body.services || [],
      clothes: body.clothing, // Ensure clothing items are valid
      date_placed: new Date(),
      delivery_instructions: body.delivery_instructions || "",
      payment_method: body.payment_method || "",
      order_status: "pending", // Default to "pending"
      order_type: body.order_type,
      payment_status: "pending", // Default to "pending"
      total_weight: body.total_weight || 0, // Optional
      total_price: body.total_price || 0, // Optional
      date_completed: null,
      time_range: body.time_range || { t: null, i: null },
      soap: body.soap || false,
      machine_id: body.machine_id || null,
      date: body.date || new Date(), // Default to current date if not provided
    });

    console.log("New order created:", newOrder);

    return NextResponse.json({ success: true, order_id: newOrder._id });
  } catch (error) {
    console.error("Error saving order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
