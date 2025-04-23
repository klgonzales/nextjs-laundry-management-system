import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { shop_id, machine_id } = await request.json();

    if (!shop_id || !machine_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Remove the machine from the shop
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $pull: { machines: { machine_id } }, // Remove the machine with the given machine_id
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
      message: "Machine deleted successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.log("Error deleting machine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
