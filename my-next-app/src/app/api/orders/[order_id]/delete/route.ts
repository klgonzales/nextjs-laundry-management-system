import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function DELETE(
  request: Request,
  { params }: { params: { order_id: string } }
) {
  try {
    await dbConnect();

    // Delete the order from the Orders collection
    const deletedOrder = await Order.findByIdAndDelete(params.order_id);

    if (!deletedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Remove the order from the Shop's orders array
    await Shop.updateOne(
      { "orders._id": params.order_id },
      { $pull: { orders: { _id: params.order_id } } }
    );

    // Remove the order from the Admin's shops[0].orders array
    await Admin.updateOne(
      { "shops.orders._id": params.order_id },
      { $pull: { "shops.$[].orders": { _id: params.order_id } } }
    );

    // Remove the order from the Customer's orders array
    await Customer.updateOne(
      { "orders._id": params.order_id },
      { $pull: { orders: { _id: params.order_id } } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
