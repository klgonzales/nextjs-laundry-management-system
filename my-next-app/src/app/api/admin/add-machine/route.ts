import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

export async function POST(request: Request) {
  try {
    console.log("add-machine API called");
    await dbConnect();

    const { shop_id, machine } = await request.json();

    // Validate required fields
    if (!shop_id || !machine || !machine.machine_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the shop exists
    const shop = await Shop.findOne({ shop_id });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Add the new machine to the shop's machines array
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $push: {
          machines: {
            machine_id: machine.machine_id,
            minimum_kg: machine.minimum_kg,
            minimum_minutes: machine.minimum_minutes,
            availability: machine.availability.map((slot: any) => ({
              date: slot.date,
              open: slot.open,
              close: slot.close,
            })),
            price_per_minimum_kg: machine.price_per_minimum_kg,
            appointments: [], // Ensure appointments is initialized as an empty array
          },
        },
      },
      { new: true } // Return the updated shop object
    );

    if (!updatedShop) {
      return NextResponse.json(
        { error: "Failed to add machine to the shop" },
        { status: 500 }
      );
    }

    // Return the updated machines array
    return NextResponse.json({
      message: "Machine added successfully",
      machines: updatedShop.machines, // Return the updated machines array
    });
  } catch (error) {
    console.error("Error adding machine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
