import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop"; // Assuming you have a Shop model
import { Types } from "mongoose"; // Import Types for ObjectId validation

// Define the structure of an order based on your example
interface Order {
  order_id: string;
  customer_id: string;
  order_type: string;
  service_id?: string[]; // Assuming it might exist
  machine_id?: string;
  payment_status: string;
  order_status: string;
  total_weight?: number;
  total_price?: number;
  date_placed: string | Date;
  date_completed?: string | Date | null;
  clothes?: any[]; // Define more specifically if needed
  date?: string | Date;
  delivery_instructions?: string;
  payment_method?: string;
  services?: string[];
  soap?: string | null;
  time_range?: { start: string; end: string }[];
  shop: string;
  address?: string;
  pickup_time?: string | null;
  pickup_date?: string | null;
  note?: string | null;
  _id: string | Types.ObjectId; // Mongoose uses ObjectId
  // Add any other fields present in your actual order objects
}

export async function GET(
  request: NextRequest,
  { params }: { params: { shop_id: string } }
) {
  const { shop_id } = params;

  if (!shop_id) {
    return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
  }

  // Optional: Validate if shop_id looks like a valid format if needed
  // e.g., if it's a MongoDB ObjectId:
  // if (!Types.ObjectId.isValid(shop_id)) {
  //    return NextResponse.json({ error: 'Invalid Shop ID format' }, { status: 400 });
  // }

  try {
    await dbConnect(); // Connect to MongoDB

    // Find the shop by its shop_id field
    // Use select to only retrieve the 'orders' field for efficiency
    const shop = (await Shop.findOne({ shop_id: shop_id })
      .select("orders")
      .lean()) as { orders?: Order[] } | null; // Explicitly type the result

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // The orders should be in the 'orders' array within the shop document
    const orders: Order[] = shop?.orders || [];

    // You might want to reverse the order to show newest first
    // orders.reverse();

    return NextResponse.json(orders); // Return the array of orders
  } catch (error) {
    console.error("Error fetching orders for shop:", error);
    // Check for specific error types if needed, e.g., CastError for invalid ID format
    // if (error instanceof Types.CastError) {
    //    return NextResponse.json({ error: 'Invalid Shop ID format' }, { status: 400 });
    // }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
