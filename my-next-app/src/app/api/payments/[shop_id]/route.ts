import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

export async function GET(request: Request, { params }: { params: any }) {
  try {
    await dbConnect();

    const { shop_id } = params;

    // Find the shop by shop_id
    const shop = (await Shop.findOne({ shop_id }).lean()) as {
      orders: any[];
    } | null;

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Return the orders associated with the shop
    return NextResponse.json({ orders: shop.orders });
  } catch (error) {
    console.error("Error fetching orders for shop:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
