import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

export async function GET(request: Request, { params }: { params: any }) {
  try {
    await dbConnect();
    const shop = await Shop.findOne({ shop_id: params.shop_id });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Sort machines by minimum_kg in descending order
    const sortedMachines = shop.machines.sort(
      (a: any, b: any) => b.minimum_kg - a.minimum_kg
    );

    return NextResponse.json({ machines: sortedMachines });
  } catch (error) {
    console.error("Error fetching machines:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
