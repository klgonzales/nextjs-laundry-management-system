import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Customer } from "@/app/models/Customer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shop_id = searchParams.get("shop_id");

  try {
    await dbConnect();
    const customers = await Customer.find({
      $or: [
        { "shops.shop_id": shop_id }, // Customers who placed orders
        { "messages.shop_id": shop_id }, // Customers who messaged the shop
      ],
    }).lean();
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
