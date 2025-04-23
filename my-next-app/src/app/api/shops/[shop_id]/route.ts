import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

// Use this parameter pattern for all route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: { shop_id: string } }
) {
  await dbConnect();

  const { shop_id } = params;

  //console.log("Querying shop_id:", shop_id); // Log the shop_id being queried

  const shop = await Shop.findOne({ shop_id }).lean();
  if (!shop) {
    return NextResponse.json(
      { shop: null, error: "Shop not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ shop });
}
