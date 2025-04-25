import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import { Notification } from "@/app/models/Notification";
import { pusherServer } from "@/app/lib/pusherServer";
import mongoose from "mongoose";

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const { total_weight, total_price, notes } = await request.json();

    console.log("Updating order:", orderId);
    console.log(
      "Weight:",
      total_weight,
      "Price:",
      total_price,
      "Notes:",
      notes
    );

    // Update main Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    updatedOrder.total_weight = total_weight;
    updatedOrder.total_price = total_price;
    updatedOrder.notes = notes;
    await updatedOrder.save();

    // Update Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach(
        (order: {
          _id: { toString: () => string };
          total_weight: any;
          total_price: any;
          notes: any;
        }) => {
          if (order._id.toString() === orderId) {
            order.total_weight = total_weight;
            order.total_price = total_price;
            order.notes = notes;
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

    // Update Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: { orders: any[] }) => {
        shop.orders.forEach(
          (order: {
            _id: { toString: () => string };
            total_weight: any;
            total_price: any;
            notes: any;
          }) => {
            if (order._id.toString() === orderId) {
              order.total_weight = total_weight;
              order.total_price = total_price;
              order.notes = notes;
              modified = true;
            }
          }
        );
      });

      if (modified) {
        admin.markModified("shops");
        await admin.save();
        console.log("Admin updated:", admin._id);
      }
    }

    // Update Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach(
        (order: {
          _id: { toString: () => string };
          total_weight: any;
          total_price: any;
          notes: any;
        }) => {
          if (order._id.toString() === orderId) {
            order.total_weight = total_weight;
            order.total_price = total_price;
            order.notes = notes;
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

    // --- Customer notification via Pusher ---
    const customerChannel = `private-client-${updatedOrder.customer_id}`;
    const notificationMessage = `Your order details have been updated. Total weight: ${total_weight}kg, Total price: ₱${total_price}.`;

    // Create notification record
    const customerNotification = await Notification.create({
      message: notificationMessage,
      timestamp: new Date(),
      read: false,
      recipient_id: updatedOrder.customer_id,
      recipient_type: "customer",
      related_order_id: orderId,
    });

    try {
      // Trigger price update event
      await pusherServer.trigger(customerChannel, "update-order-price", {
        order_id: orderId,
        total_weight,
        total_price,
        notes,
        date_updated: new Date(),
      });
      console.log(
        `Pusher event 'update-order-price' triggered on channel ${customerChannel}`
      );

      // Trigger notification
      await pusherServer.trigger(
        customerChannel,
        "new-notification",
        customerNotification.toObject()
      );
      console.log(
        `Pusher event 'new-notification' triggered for customer on channel ${customerChannel}`
      );
    } catch (error) {
      console.error("Error triggering Pusher events for customer:", error);
    }

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
