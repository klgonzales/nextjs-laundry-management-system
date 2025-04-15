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
    const newDateCompleted = new Date().toISOString();

    console.log("Updating order:", orderId);
    console.log("New date_completed:", newDateCompleted);

    // Update main Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.date_completed = newDateCompleted;
    await updatedOrder.save();

    // Update date_completed in all Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach((order: { _id: string; date_completed: string }) => {
        if (order._id.toString() === orderId) {
          order.date_completed = newDateCompleted;
          modified = true;
        }
      });

      if (modified) {
        shop.markModified("orders");
        await shop.save();
        console.log("Shop updated:", shop._id);
      }
    }

    // Update date_completed in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach(
        (shop: { orders: { _id: string; date_completed: string }[] }) => {
          shop.orders.forEach(
            (order: { _id: string; date_completed: string }) => {
              if (order._id.toString() === orderId) {
                order.date_completed = newDateCompleted;
                modified = true;
              }
            }
          );
        }
      );

      if (modified) {
        admin.markModified("shops");
        await admin.save();
        console.log("Admin updated:", admin._id);
      }
    }

    // Update date_completed in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach(
        (order: { _id: string; date_completed: string }) => {
          if (order._id.toString() === orderId) {
            order.date_completed = newDateCompleted;
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
    console.error("Error updating date_completed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
