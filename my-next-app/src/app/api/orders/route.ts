import { NextResponse, NextRequest } from "next/server"; // Use NextRequest
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import dbConnect from "@/app/lib/mongodb";
// --- Import Pusher Server ---
import { pusherServer } from "@/app/lib/pusherServer";
// --- Import Notification Model (if creating notification here) ---
import { Notification } from "@/app/models/Notification";

export async function GET() {
  try {
    await dbConnect();

    // Fetch all orders from the database
    const orders = await Order.find({}).lean();

    // Ensure all orders have a valid total
    const sanitizedOrders = orders.map((order) => ({
      ...order,
      total: order.total || 0, // Default to 0 if total is missing
    }));

    console.log("Fetched orders:", sanitizedOrders);

    // Return the sanitized orders as a JSON response
    return NextResponse.json(sanitizedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Debugging: Log the incoming request body
    console.log("Request Body:", body);

    // Fix the date timezone issue by ensuring the date is stored correctly
    let appointmentDate = null;
    if (body.date) {
      // Parse the date properly to preserve the exact day selected
      // This creates a date at 12:00 noon on the selected day to avoid timezone issues
      const dateParts = body.date.split("-");
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(dateParts[2], 10);
        appointmentDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      } else {
        // Fallback if date format is unexpected
        appointmentDate = new Date(body.date);
      }
    }

    // Similarly fix the pickup date if present
    let pickupDate = null;
    if (body.pickupDate) {
      const dateParts = body.pickupDate.split("-");
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        pickupDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      } else {
        pickupDate = new Date(body.pickupDate);
      }
    }

    // Create the new order
    const newOrder = await Order.create({
      customer_id: body.customer_id,
      order_id: Math.floor(Math.random() * 1000000000).toString(), // Generate a unique ID
      shop: body.shop_id, // Store shop_id as a string
      services: body.services || [],
      clothes: body.clothing, // Ensure clothing items are valid
      date_placed: new Date(),
      delivery_instructions: body.delivery_instructions || "",
      payment_method: body.payment_method || "",
      order_status: "pending", // Default to "pending"
      order_type: body.order_type,
      payment_status: "pending", // Default to "pending"
      total_weight: body.total_weight || 0, // Optional
      total_price: body.total_price || 0, // Optional
      date_completed: null,
      time_range: body.time_range || [], // Add time_range
      soap: body.soap || null,
      machine_id: body.machine_id || null,
      date: appointmentDate || null, // Use the fixed date
      address: body.address || "",
      pickup_time: body.pickupTime || null,
      pickup_date: pickupDate || null,
    });

    console.log(newOrder.time_range);
    console.log("New order created:", newOrder);
    console.log(newOrder.pickup_time);

    // Add the new order to the Shop's orders array
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id: body.shop_id },
      { $push: { orders: newOrder } }, // Add the new order to the orders array
      { new: true }
    );

    if (!updatedShop) {
      throw new Error("Shop not found");
    }

    // Add the new order to the Admin's shops[0].orders array
    const updatedAdmin = await Admin.findOneAndUpdate(
      { "shops.shop_id": body.shop_id },
      { $push: { "shops.$.orders": newOrder } }, // Add the new order to the Admin's orders array
      { new: true }
    );

    if (!updatedAdmin) {
      throw new Error("Admin not found");
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { customer_id: body.customer_id }, // Query by customer_id
      { $push: { orders: newOrder } }, // Add the new order to the Customer's orders array
      { new: true }
    );

    if (!updatedCustomer) {
      throw new Error("Customer not found");
    }

    console.log("Order added to Shop and Admin and Customer successfully");

    console.log("Admin found for Pusher trigger:", updatedAdmin); // Log the whole admin object
    console.log("Admin ID for Pusher:", updatedAdmin?.admin_id); // Log just the ID
    console.log("Customer found for Pusher trigger:", updatedCustomer); // Log the whole customer object
    console.log("Customer ID for Pusher:", updatedCustomer?.customer_id); // Log just the ID

    // ...existing code...
    console.log(newOrder.time_range);
    console.log("New order created:", newOrder);
    console.log(newOrder.pickup_time);

    // --- START: Reminder Notification Logic ---
    // Check for upcoming pickup or appointment dates
    if (body.customer_id) {
      // Check if there's a pickup date or appointment date
      const reminderDate = body.pickupDate || body.date;

      if (reminderDate) {
        const upcomingDate = new Date(reminderDate);
        const today = new Date();

        // Calculate the difference in days
        const diffTime = upcomingDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Send reminder if the date is today or tomorrow
        if (diffDays <= 1 && diffDays >= 0) {
          const isToday = diffDays === 0;
          const dateType = body.pickupDate ? "pickup" : "appointment";

          // Create reminder message based on whether it's today or tomorrow
          const reminderMessage = isToday
            ? `Reminder: Your ${dateType} for order #${newOrder.order_id} is scheduled for TODAY!`
            : `Reminder: Your ${dateType} for order #${newOrder.order_id} is scheduled for TOMORROW!`;

          // Create notification in the database
          const reminderNotification = await Notification.create({
            message: reminderMessage,
            recipient_id: body.customer_id,
            recipient_type: "customer",
            related_order_id: newOrder._id,
            read: false,
            is_reminder: true,
            timestamp: new Date(),
          });

          // Send to customer via Pusher
          const customerChannel = `private-customer-${body.customer_id}`;
          try {
            await pusherServer.trigger(
              customerChannel,
              "upcoming-reminder",
              reminderNotification.toObject()
            );
            console.log(
              `Reminder notification sent to ${customerChannel} for ${dateType} ${isToday ? "today" : "tomorrow"}`
            );
          } catch (pusherError) {
            console.error("Error sending reminder notification:", pusherError);
          }
        }
      }
    }
    // --- END: Reminder Notification Logic ---

    // Add the new order to the Shop's orders array
    // ...existing code...
    // --- START: Pusher Trigger ---
    if (updatedAdmin?.admin_id) {
      const adminId = updatedAdmin.admin_id;
      const adminChannel = `private-admin-${adminId}`; // Define the private channel name

      try {
        // 1. Trigger 'new-order' event for the admin orders page
        // Send the raw newOrder data. The client will fetch details if needed.
        await pusherServer.trigger(
          adminChannel,
          "new-order",
          newOrder.toObject()
        );
        console.log(
          `Pusher event 'new-order' triggered on channel ${adminChannel}`
        );

        // 2. (Optional) Create and trigger 'new-notification' event
        const notificationMessage = `New order placed by customer ${updatedCustomer.name || body.customer_id}.`;
        const newNotification = await Notification.create({
          message: notificationMessage,
          recipient_id: adminId,
          recipient_type: "admin",
          related_order_id: newOrder._id, // Link notification to the order
          read: false,
          timestamp: new Date(),
        });
        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          newNotification.toObject()
        );
        console.log(
          `Pusher event 'new-notification' triggered on channel ${adminChannel}`
        );
      } catch (pusherError) {
        console.error("Error triggering Pusher event:", pusherError);
        // Decide how to handle Pusher errors - maybe log but don't fail the request
      }
    } else {
      console.warn(
        "Could not trigger Pusher event: Admin ID not found after update."
      );
    }
    // --- END: Pusher Trigger ---

    // After your existing Pusher triggers (around line 156), add:

    // --- START: Payment Notification Trigger ---
    // If this order requires payment, notify admin about the pending payment
    if (newOrder.payment_status === "pending" && updatedAdmin?.admin_id) {
      const adminId = updatedAdmin.admin_id;
      const adminChannel = `private-admin-${adminId}`;

      try {
        // Trigger new-payment event for the admin payments page
        await pusherServer.trigger(adminChannel, "new-payment", {
          _id: newOrder._id,
          order_id: newOrder.order_id,
          customer_id: newOrder.customer_id,
          shop_id: body.shop_id,
          payment_status: newOrder.payment_status,
          order_status: newOrder.order_status,
          total_price: newOrder.total_price,
          payment_method: newOrder.payment_method || "Not specified",
          date_placed: newOrder.date_placed,
        });
        console.log(
          `Pusher event 'new-payment' triggered on channel ${adminChannel}`
        );

        // Add an additional payment-specific notification
        const paymentNotificationMessage = `New payment pending for Order #${newOrder.order_id}.`;
        const paymentNotification = await Notification.create({
          message: paymentNotificationMessage,
          recipient_id: adminId,
          recipient_type: "admin",
          related_order_id: newOrder._id,
          related_to_payment: true, // Add this flag to identify payment-related notifications
          read: false,
          timestamp: new Date(),
        });

        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          paymentNotification.toObject()
        );
        console.log(
          `Payment notification triggered on channel ${adminChannel}`
        );
      } catch (pusherError) {
        console.error("Error triggering payment notification:", pusherError);
      }
    }
    // --- END: Payment Notification Trigger ---

    return NextResponse.json({
      success: true,
      order_id: newOrder._id,
      shop: updatedShop,
      admin: updatedAdmin,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error saving order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
