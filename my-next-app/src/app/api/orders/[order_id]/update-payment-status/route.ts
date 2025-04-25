import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
// Add these imports at the top
import { Notification } from "@/app/models/Notification";

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const { newPaymentStatus } = await request.json();

    console.log("Updating order:", orderId);
    console.log("New payment status:", newPaymentStatus);

    // Update main Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.payment_status = newPaymentStatus;
    await updatedOrder.save();

    // Update payment_status in all Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach(
        (order: { _id: { toString: () => string }; payment_status: any }) => {
          if (order._id.toString() === orderId) {
            order.payment_status = newPaymentStatus;
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

    // Update payment_status in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: { orders: any[] }) => {
        shop.orders.forEach((order) => {
          if (order._id.toString() === orderId) {
            order.payment_status = newPaymentStatus;
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

    // Update payment_status in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach(
        (order: { _id: { toString: () => string }; payment_status: any }) => {
          if (order._id.toString() === orderId) {
            order.payment_status = newPaymentStatus;
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

    // --- START: Customer Notification via Pusher ---
    let customerNotified = false;
    for (const customer of customers) {
      const customerOrder = customer.orders.find(
        (order: { _id: { toString: () => string } }) =>
          order._id.toString() === orderId
      );

      if (customerOrder && customer.customer_id) {
        const customerChannel = `private-client-${customer.customer_id}`;
        let notificationMessage = "";

        // Create user-friendly notification based on payment status
        switch (newPaymentStatus) {
          case "for review":
            notificationMessage = `Your payment for Order #${customerOrder.order_id || orderId} is now under review.`;
            break;
          case "settled":
            notificationMessage = `Good news! Your payment for Order #${customerOrder.order_id || orderId} has been confirmed.`;
            break;
          case "rejected":
            notificationMessage = `Your payment for Order #${customerOrder.order_id || orderId} was not approved. Please check your payment details.`;
            break;
          default:
            notificationMessage = `Payment status for Order #${customerOrder.order_id || orderId} changed to: ${newPaymentStatus}`;
        }

        // Create notification record
        const customerNotification = await Notification.create({
          message: notificationMessage,
          recipient_id: customer.customer_id,
          recipient_type: "customer",
          related_order_id: orderId,
          read: false,
          timestamp: new Date(),
        });

        try {
          // Use your centralized Pusher trigger endpoint
          const triggerResponse = await fetch(
            new URL("/api/pusher/trigger", request.url).toString(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: customerChannel,
                event: "update-payment-status",
                data: {
                  order_id: orderId,
                  payment_status: newPaymentStatus,
                  date_updated: new Date(),
                },
              }),
            }
          );

          if (!triggerResponse.ok) {
            throw new Error(
              `Failed to trigger payment update: ${triggerResponse.statusText}`
            );
          }

          // Send notification
          const notifyResponse = await fetch(
            new URL("/api/pusher/trigger", request.url).toString(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: customerChannel,
                event: "new-notification",
                data: customerNotification.toObject(),
              }),
            }
          );

          if (!notifyResponse.ok) {
            throw new Error(
              `Failed to trigger notification: ${notifyResponse.statusText}`
            );
          }

          console.log(
            `Notifications sent to customer on channel ${customerChannel}`
          );
          customerNotified = true;
        } catch (triggerError) {
          console.error(
            "Error triggering customer notifications:",
            triggerError
          );
        }

        break; // We found the customer who owns this order
      }
    }

    if (!customerNotified) {
      console.log(
        "No customer found for this order - couldn't send notification"
      );
    }
    // --- END: Customer Notification ---

    // --- START: Admin Notification via Pusher ---
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
        const adminNotificationMessage = `Payment status for Order #${updatedOrder.order_id || orderId} updated to: ${newPaymentStatus}`;

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
          // Use your centralized Pusher trigger endpoint for admin
          const triggerResponse = await fetch(
            new URL("/api/pusher/trigger", request.url).toString(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: adminChannel,
                event: "update-payment-status",
                data: {
                  order_id: orderId,
                  payment_status: newPaymentStatus,
                  date_updated: new Date(),
                },
              }),
            }
          );

          if (!triggerResponse.ok) {
            throw new Error(
              `Failed to trigger admin payment update: ${triggerResponse.statusText}`
            );
          }

          // Send notification
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

          console.log(`Notifications sent to admin on channel ${adminChannel}`);
          adminNotified = true;
        } catch (triggerError) {
          console.error("Error triggering admin notifications:", triggerError);
        }
      }
    }

    if (!adminNotified) {
      console.log("No admin found for this order - couldn't send notification");
    }
    // --- END: Admin Notification ---

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
