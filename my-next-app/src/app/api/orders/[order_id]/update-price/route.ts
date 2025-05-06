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

    // --- START: Admin Notification via Pusher ---
    // Replace the admin trigger section with this more robust version

    // For the admin notification section:
    try {
      let adminNotified = false;
      for (const admin of admins) {
        let adminHasOrder = false;

        // Check if this admin has the order in any of their shops
        for (const shop of admin.shops) {
          if (
            shop.orders.some((order: any) => order._id.toString() === orderId)
          ) {
            adminHasOrder = true;
            break;
          }
        }

        if (adminHasOrder && admin.admin_id) {
          const adminChannel = `private-admin-${admin.admin_id}`;
          const adminNotificationMessage = `Order #${updatedOrder.order_id || orderId.substring(0, 6)} price updated: ${total_weight}kg, ₱${total_price}`;

          // Create notification record
          const adminNotification = await Notification.create({
            message: adminNotificationMessage,
            recipient_id: admin.admin_id,
            recipient_type: "admin",
            related_order_id: orderId,
            read: false,
            timestamp: new Date(),
          });

          try {
            // DIRECTLY use pusherServer instead of fetch for more reliable triggering
            await pusherServer.trigger(adminChannel, "update-order-price", {
              orderId: orderId, // Include both formats to be safe
              order_id: orderId,
              total_weight,
              total_price,
              notes,
              date_updated: new Date(),
            });
            console.log(
              `Direct Pusher event 'update-order-price' triggered on admin channel ${adminChannel}`
            );

            // Also trigger on the shop-wide channel
            if (updatedOrder.shop_id) {
              const shopChannel = `shop-${updatedOrder.shop_id}`;
              await pusherServer.trigger(shopChannel, "update-order-price", {
                orderId: orderId,
                order_id: orderId,
                total_weight,
                total_price,
                notes,
                date_updated: new Date(),
              });
              console.log(
                `Direct Pusher event 'update-order-price' triggered on shop channel ${shopChannel}`
              );
            }

            // Send notification - here we'll still use the proxy approach for consistency
            const notifyResponse = await fetch(
              new URL("/api/pusher/trigger", request.url).toString(),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  channel: adminChannel,
                  event: "new-notification",
                  data: adminNotification.toObject(),
                }),
              }
            );

            if (!notifyResponse.ok) {
              throw new Error(
                `Failed to trigger admin notification: ${notifyResponse.statusText}`
              );
            }

            console.log(
              `Price update notifications sent to admin on channel ${adminChannel}`
            );
            adminNotified = true;
          } catch (triggerError) {
            console.error(
              "Error triggering admin price update notifications:",
              triggerError
            );
          }
        }
      }

      if (!adminNotified) {
        console.log(
          "No admin found for this order - couldn't send price update notification"
        );
      }
    } catch (error) {
      console.error(
        "Error processing admin notifications for price update:",
        error
      );
    }
    // --- END: Admin Notification ---

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
