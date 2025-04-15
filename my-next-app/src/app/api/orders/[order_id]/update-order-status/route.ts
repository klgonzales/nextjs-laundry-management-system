import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function PATCH(
  request: Request,
  context: { params: { order_id: string } }
) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const { newStatus } = await request.json();

    console.log("Updating order:", orderId);
    console.log("New status:", newStatus);

    // Update main Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.order_status = newStatus;
    await updatedOrder.save();

    // Update order status in all Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach(
        (order: { _id: { toString: () => string }; order_status: any }) => {
          if (order._id.toString() === orderId) {
            order.order_status = newStatus;
            modified = true;
          }
        }
      );

      if (modified) {
        shop.markModified("orders");
        await shop.save();
        console.log("Shop updated:", shop._id);
      }
    }

    // Update order status in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: { orders: any[] }) => {
        shop.orders.forEach((order) => {
          if (order._id.toString() === orderId) {
            order.order_status = newStatus;
            modified = true;
          }
        });
      });

      if (modified) {
        admin.markModified("shops");
        await admin.save();
        console.log("Admin updated:", admin._id);
      }
    }

    // Update order status in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach(
        (order: { _id: { toString: () => string }; order_status: any }) => {
          if (order._id.toString() === orderId) {
            order.order_status = newStatus;
            modified = true;
          }
        }
      );

      if (modified) {
        customer.markModified("orders");
        await customer.save();
        console.log("Customer updated:", customer._id);
      }
    }

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
