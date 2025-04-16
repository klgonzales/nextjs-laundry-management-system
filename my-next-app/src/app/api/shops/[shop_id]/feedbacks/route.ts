import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";

export async function GET(
  request: Request,
  { params }: { params: { shop_id: string } }
) {
  try {
    await dbConnect();

    const { shop_id } = params;

    // Find all orders for the shop
    const orders = await Order.find({ shop: shop_id }).lean();

    if (!orders || orders.length === 0) {
      return NextResponse.json({ feedbacks: [] });
    }

    // Extract feedbacks from all orders
    const feedbacks = orders
      .map((order) => order.feedbacks || []) // Ensure feedbacks exist
      .flat(); // Flatten the array of arrays into a single array

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
