import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { shop_id, service } = await request.json();

    // Add the new service to the services array in the Shop collection
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $push: {
          services: {
            service_id: service.service_id,
            name: service.name,
            description: service.description,
            price_per_kg: service.price_per_kg,
          },
        },
      },
      { new: true }
    );

    if (!updatedShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
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
      message: "Service added successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error adding service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
