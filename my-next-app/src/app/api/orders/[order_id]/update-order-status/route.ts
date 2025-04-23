import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
// --- Add Redis Import ---
import { createClient } from "redis";
import { Notification } from "@/app/models/Notification";
// --- End Import ---

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;
  let redisClient; // Define redisClient variable

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

    // --- START: Redis Publishing for Client Update ---
    const customerId = updatedOrder.customer_id; // Get customer ID from the updated order
    console.log(customerId);
    if (customerId) {
      try {
        redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on("error", (err) =>
          console.error("[Order Status API] Redis Client Error", err)
        );
        await redisClient.connect();
        console.log(
          `[Order Status API] Connected to Redis for client update (Customer ID: ${customerId}).`
        );

        // Define the channel and data
        const updateChannel = `order-updates:client:${customerId}`;
        const updateData = {
          orderId: updatedOrder._id.toString(), // Send order ID
          newStatus: updatedOrder.order_status, // Send the new status
          // Include other relevant fields if needed by the client UI
          // e.g., date_completed: updatedOrder.date_completed
        };

        // --- 2. Publish & Save Notification ---
        const notificationChannel = `client-notifications:${customerId}`; // Channel for client notifications
        const notificationData = {
          // _id: new mongoose.Types.ObjectId().toString(), // Mongoose adds _id
          message: `Your order status has been updated to: ${newStatus}`, // Simple message
          // You could add order ID or shop name if needed: `Order ${updatedOrder.shop_name || orderId} status: ${newStatus}`
          timestamp: new Date().toISOString(),
          read: false,
          link: `/auth/orders`, // Link to customer's orders page
          recipient_id: customerId,
          recipient_type: "customer", // Set recipient type
        };

        // Publish the update
        await redisClient.publish(updateChannel, JSON.stringify(updateData));
        console.log(
          `[Order Status API] Published status update to Redis channel: ${updateChannel}`
        );

        // Save notification to Database
        try {
          await Notification.create(notificationData);
          console.log(
            `[Order Status API] Saved status update notification to database for customer ${customerId}`
          );
        } catch (dbError) {
          console.error(
            `[Order Status API] Failed to save status update notification to database for customer ${customerId}:`,
            dbError
          );
          // Log error but continue
        }
        // --- End Notification Logic ---

        await redisClient.disconnect();
        console.log("[Order Status API] Disconnected Redis publisher.");
        redisClient = undefined;
      } catch (redisError) {
        console.error(
          `[Order Status API] Error during Redis publishing for customer ${customerId}:`,
          redisError
        );
        if (redisClient?.isOpen) {
          try {
            await redisClient.disconnect();
          } catch (e) {
            /* ignore */
          }
          redisClient = undefined;
        }
        // Log error but don't fail the whole request just for Redis failure
      }
    } else {
      console.warn(
        `[Order Status API] Cannot publish update for order ${orderId}: Customer ID not found.`
      );
    }
    // --- END: Redis Publishing ---

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
    console.error("[Order Status API] Error updating order status:", error);
    if (redisClient?.isOpen) {
      // Ensure disconnect on main error
      try {
        await redisClient.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
