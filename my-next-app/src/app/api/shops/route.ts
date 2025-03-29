import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

export async function GET() {
  try {
    // Connect to the database
    await dbConnect();

    // Fetch all shops from the database
    const shops = await Shop.find({}).lean();

    // Log the fetched shops for debugging
    console.log("Fetched Shops:", shops);

    // Return the shops as a JSON response
    return NextResponse.json({ shops });
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching shops:", error);

    // Return an error response
    return NextResponse.json(
      { error: "Failed to fetch shops" },
      { status: 500 }
    );
  }
}
