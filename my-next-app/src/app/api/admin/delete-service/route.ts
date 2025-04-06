import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { shop_id, service_id } = await request.json();

    // Remove the specific service from the Shop collection
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $pull: { services: { service_id } }, // Remove the service with the matching service_id
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
      message: "Service deleted successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
