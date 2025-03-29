import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

interface RequestParams {
  params: {
    shop_id: string;
  };
}

interface ShopResponse {
  shop: Record<string, any> | null;
  error?: string;
}

export async function GET(
  request: Request,
  { params }: RequestParams
): Promise<NextResponse<ShopResponse>> {
  const { shop_id } = params;

  try {
    await dbConnect();

    const shop = await Shop.findOne({ shop_id }).lean();
    if (!shop) {
      return NextResponse.json(
        { shop: null, error: "Shop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shop });
  } catch (error) {
    console.error("Error fetching shop details:", error);
    return NextResponse.json(
      { shop: null, error: "Failed to fetch shop details" },
      { status: 500 }
    );
  }
}
