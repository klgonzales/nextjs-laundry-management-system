import { NextResponse, NextRequest } from "next/server";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import { Notification } from "@/app/models/Notification";
import dbConnect from "@/app/lib/mongodb";
import { pusherServer } from "@/app/lib/pusherServer";
import mongoose from "mongoose";

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;
  const customer_id = params.customer_id;
  const status = params.order_status;
  const shop_id = params.shop_id;

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

    console.log(updatedOrder.customer_id);
    // --- START: Customer Notification via Pusher ---
    if (updatedOrder.customer_id) {
      const customerChannel = `private-client-${updatedOrder.customer_id}`;
      const statusMessage = getStatusMessage(
        updatedOrder.order_status,
        updatedOrder.order_id || ""
      );

      console.log(customerChannel);

      // Create notification for customer
      const customerNotification = await Notification.create({
        message: statusMessage,
        recipient_id: updatedOrder.customer_id,
        recipient_type: "customer",
        related_order_id: orderId,
        read: false,
        timestamp: new Date(),
      });
      console.log("Customer notification created:", customerNotification);
      try {
        // Trigger order status update event
        await pusherServer.trigger(customerChannel, "update-order-status", {
          orderId,
          status: updatedOrder.order_status,
          date_updated: new Date(),
        });
        console.log(
          `Pusher event 'update-order-status' triggered on channel ${customerChannel}`
        );

        // Trigger notification event
        await pusherServer.trigger(
          customerChannel,
          "new-notification",
          customerNotification.toObject()
        );
        console.log(
          `Pusher event 'new-notification' triggered for customer on channel ${customerChannel}`
        );
      } catch (pusherError) {
        console.error(
          "Error triggering Pusher event for customer:",
          pusherError
        );
      }
    }
    // --- END: Customer Notification ---

    // --- Replace the Admin Notification section with this more accurate implementation ---

    // --- START: Admin Notification via Pusher ---
    // Find the admin who owns the shop for this order
    // --- START: Admin Notification via Pusher ---
    // Since each admin has only one shop, we can simplify this
    let shopOwnerAdmin;

    // If we already have the shop_id, use it directly
    if (shop_id) {
      shopOwnerAdmin = await Admin.findOne({ "shops.shop_id": shop_id });
    } else {
      // With this updated version:
      if (updatedOrder && updatedOrder.shop) {
        // First try to find by _id if it's a valid ObjectId
        let orderShop;
        try {
          // Check if the shop value looks like a MongoDB ObjectId
          if (mongoose.Types.ObjectId.isValid(updatedOrder.shop)) {
            orderShop = await Shop.findById(updatedOrder.shop);
          }
        } catch (err) {
          console.log(
            "Error finding shop by _id, will try shop_id instead",
            err
          );
        }

        // If not found by _id, try shop_id directly
        if (!orderShop) {
          orderShop = await Shop.findOne({ shop_id: updatedOrder.shop });
        }

        if (orderShop && orderShop.shop_id) {
          shopOwnerAdmin = await Admin.findOne({
            "shops.shop_id": orderShop.shop_id,
          });
        }
      } else {
        // Fallback: Just get all admins and look through their shops
        const allAdmins = await Admin.find();
        for (const admin of allAdmins) {
          // Check if this admin has the order in any of their shops
          if (
            admin.shops.some((shop: any) =>
              shop.orders.some((order: any) => order._id.toString() === orderId)
            )
          ) {
            shopOwnerAdmin = admin;
            break;
          }
        }
      }
    }

    if (shopOwnerAdmin && shopOwnerAdmin.admin_id) {
      const adminId = shopOwnerAdmin.admin_id;
      const adminChannel = `private-admin-${adminId}`;
      // Rest of the notification code stays the same...
      // Use string for order_id in the message to avoid TypeScript complaints
      const adminStatusMessage = `Order #${String(updatedOrder.order_id || orderId)} status updated to ${newStatus}`;

      // Create notification for admin (for audit/tracking purposes)
      const adminNotification = await Notification.create({
        message: adminStatusMessage,
        recipient_id: adminId,
        recipient_type: "admin",
        related_order_id: orderId,
        read: false,
        timestamp: new Date(),
      });

      try {
        // Trigger order update event (if needed for admin dashboard/realtime updates)
        await pusherServer.trigger(adminChannel, "update-order-status", {
          order_id: orderId,
          status: newStatus,
          date_updated: new Date(),
          customer_id: updatedOrder.customer_id,
        });
        console.log(
          `Pusher event 'update-order-status' triggered on admin channel ${adminChannel}`
        );

        // Trigger notification event
        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          adminNotification.toObject()
        );
        console.log(
          `Pusher event 'new-notification' triggered for admin on channel ${adminChannel}`
        );
      } catch (pusherError) {
        console.error("Error triggering Pusher event for admin:", pusherError);
      }
    } else {
      console.log("Admin not found for shop related to this order");
    }
    // --- END: Admin Notification ---

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to create user-friendly notification messages
function getStatusMessage(status: string, orderId: string): string {
  switch (status) {
    case "scheduled":
      return `Your order #${orderId} has been accepted and scheduled.`;
    case "in progress":
      return `Your order #${orderId} is now in progress.`;
    case "completed":
      return `Great news! Your order #${orderId} has been completed.`;
    case "cancelled":
      return `We're sorry, but your order #${orderId} has been cancelled.`;
    default:
      return `Your order #${orderId} status has been updated to ${status}.`;
  }
}
