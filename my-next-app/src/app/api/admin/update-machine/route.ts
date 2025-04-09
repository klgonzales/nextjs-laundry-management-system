import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    console.log("update-machine API called");
    await dbConnect();
    const { shop_id, machine } = await request.json();

    if (!shop_id || !machine || !machine.machine_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("update-machine API called");
    // Update the machine in the shop
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id, "machines.machine_id": machine.machine_id },
      {
        $set: {
          "machines.$.machine_id": machine.machine_id,
          "machines.$.minimum_kg": machine.minimum_kg,
          "machines.$.minimum_minutes": machine.minimum_minutes,
          "machines.$.availability": machine.availability.map((slot: any) => ({
            date: slot.date,
            open: slot.open,
            close: slot.close,
          })),
          "machines.$.price_per_minimum_kg": machine.price_per_minimum_kg,
        },
      },
      { new: true }
    );

    if (!updatedShop) {
      return NextResponse.json(
        { error: "Shop or machine not found" },
        { status: 404 }
      );
    }

    // Update the services array in the Admin document
    const updatedAdmin = await Admin.findOneAndUpdate(
      { "shops.shop_id": shop_id },
      {
        $set: {
          "shops.$.machines": updatedShop.machines, // Sync the services array
        },
      },
      { new: true }
    );

    if (!updatedAdmin) {
      return NextResponse.json(
        { error: "Admin or shop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Machine updated successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating machine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
