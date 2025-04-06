import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { shop_id, service } = await request.json();

    // Update the specific service in the Shop collection
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id, "services.service_id": service.service_id },
      {
        $set: {
          "services.$.name": service.name,
          "services.$.description": service.description,
          "services.$.price_per_kg": service.price_per_kg,
        },
      },
      { new: true }
    );

    if (!updatedShop) {
      return NextResponse.json(
        { error: "Shop or service not found" },
        { status: 404 }
      );
    }

    // Update the services array in the Admin document
    const updatedAdmin = await Admin.findOneAndUpdate(
      { "shops.shop_id": shop_id },
      {
        $set: {
          "shops.$.services": updatedShop.services, // Sync the services array
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
      message: "Service updated successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
