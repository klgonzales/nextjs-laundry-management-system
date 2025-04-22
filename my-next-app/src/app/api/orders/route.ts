import { NextResponse } from "next/server";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import dbConnect from "@/app/lib/mongodb";

import { Notification } from "@/app/models/Notification"; // Import Notification model
import { createClient } from "redis"; // Import Redis client
import { NextApiResponseServerIO } from "@/app/types/io"; // Import the custom response type
import { Server as SocketIOServer } from "socket.io"; // Import Socket.IO Server type

import { time } from "console";

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
  let redisClient;
  try {
    await dbConnect();
    const body = await request.json();

    // Debugging: Log the incoming request body
    console.log("Request Body:", body);

    // Fetch Shop Name for potential use in notification message
    const shop = (await Shop.findOne({ shop_id: body.shop_id })
      .select("name")
      .lean()) as { name?: string } | null;
    const shopName = shop?.name || "the shop"; // Fallback name

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
    ).select("admin_id");

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

    // --- !! NOTIFICATION & ORDER UPDATE LOGIC (Using Redis) !! ---
    if (updatedAdmin && updatedAdmin.admin_id) {
      try {
        // 1. Create Notification Document in DB (remains the same)
        const notificationMessage = `New ${body.order_type} order (#${newOrder._id.toString().slice(-6)}) received for ${shopName}.`;
        const notificationLink = `/admin/orders/${newOrder._id}`;
        const newNotification = new Notification({
          message: notificationMessage,
          link: notificationLink,
          recipient_id: updatedAdmin.admin_id,
          recipient_type: "admin",
          read: false,
          timestamp: new Date(),
        });
        await newNotification.save();
        console.log(
          "Notification saved to DB for admin:",
          updatedAdmin.admin_id
        );

        // 2. Publish Events to Redis
        redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        console.log("Connected to Redis for publishing.");

        // Publish notification event
        const notificationChannel = `admin-notifications:${updatedAdmin.admin_id}`;
        await redisClient.publish(
          notificationChannel,
          JSON.stringify(newNotification.toObject())
        );
        console.log(
          `Published notification to Redis channel: ${notificationChannel}`
        );
        // Publish new order event
        const orderChannel = `new-orders:admin:${updatedAdmin.admin_id}`;
        await redisClient.publish(
          orderChannel,
          JSON.stringify(newOrder.toObject())
        );
        console.log(`Published new order to Redis channel: ${orderChannel}`);

        await redisClient.disconnect(); // Disconnect after publishing
        console.log("Disconnected from Redis publisher.");
        redisClient = undefined; // Clear reference
      } catch (pubSubError) {
        console.error(
          "Failed to save notification or publish to Redis:",
          pubSubError
        );
        // Log the error but allow the main order process to succeed
        if (redisClient?.isOpen) {
          await redisClient.disconnect(); // Ensure disconnection on error
          redisClient = undefined;
        }
      }
    }
    // --- !! END NOTIFICATION & ORDER UPDATE LOGIC !! ---

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
