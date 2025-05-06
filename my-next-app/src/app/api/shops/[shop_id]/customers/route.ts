import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Customer } from "@/app/models/Customer";

export async function GET(request: Request, context: { params: any }) {
  const { shop_id } = context.params;

  try {
    await dbConnect();

    // Find the shop
    const shop = (await Shop.findOne({ shop_id }).lean()) as {
      orders?: { customer_id?: string }[];
    };
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Extract unique customer IDs from orders
    const customerIds = new Set();
    (shop.orders || []).forEach((order: any) => {
      if (order.customer_id) {
        customerIds.add(order.customer_id);
      }
    });

    // Find customers by IDs
    const customers = await Customer.find({
      customer_id: { $in: Array.from(customerIds) },
    }).lean();

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching shop customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
