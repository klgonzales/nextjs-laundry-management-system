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
      date: body.date || new Date(), // Default to current date if not provided
      address: body.address || "",
      pickup_time: body.pickupTime || null,
      pickup_date: body.pickupDate || null,
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
