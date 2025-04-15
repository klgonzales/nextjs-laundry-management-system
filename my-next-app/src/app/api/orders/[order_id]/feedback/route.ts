import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";

export async function GET(
  request: Request,
  { params }: { params: { order_id: string } }
) {
  try {
    await dbConnect();

    const { order_id } = params;

    // Find the order by ID and return its feedbacks
    const order = (await Order.findById(order_id).lean()) as {
      feedbacks?: any[];
    } | null;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order.feedbacks || []);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
