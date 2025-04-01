import { NextResponse } from "next/server";
import { Order } from "@/app/models/Orders";
import dbConnect from "@/app/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: { order_id: string } }
) {
  try {
    await dbConnect();

    // Fetch the order by ID
    const order = await Order.findById(params.order_id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
