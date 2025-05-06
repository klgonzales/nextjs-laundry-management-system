import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
// --- Import Pusher Server ---
import { pusherServer } from "@/app/lib/pusherServer";
// --- Import Notification Model (if creating notification here) ---
import { Notification } from "@/app/models/Notification";
import mongoose from "mongoose";

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const {
      payment_id,
      customer_id,
      order_id,
      shop_id,
      amount_sent,
      amount_paid,
      screenshot,
      reference_number,
      paid_the_driver,
      payment_method,
      payment_date,
    } = await request.json();

    const newProofOfPayment = {
      payment_id,
      customer_id,
      order_id,
      shop_id,
      amount_sent,
      amount_paid,
      screenshot,
      reference_number,
      paid_the_driver,
      payment_method,
      payment_date,
    };

    console.log("Adding proof of payment to order:", orderId);

    // Update Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.proof_of_payment = newProofOfPayment;
    await updatedOrder.save();

    // Update proof_of_payment in Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach((order: any) => {
        if (order._id.toString() === orderId) {
          order.proof_of_payment = newProofOfPayment;
          modified = true;
        }
      });

      if (modified) {
        shop.markModified("orders");
        await shop.save();
        console.log("Shop updated:", shop._id);
      }
    }

    // Update proof_of_payment in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: any) => {
        shop.orders.forEach((order: any) => {
          if (order._id.toString() === orderId) {
            order.proof_of_payment = newProofOfPayment;
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

    // Update proof_of_payment in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach((order: any) => {
        if (order._id.toString() === orderId) {
          order.proof_of_payment = newProofOfPayment;
          modified = true;
        }
      });

      if (modified) {
        customer.markModified("orders");
        await customer.save();
        console.log("Customer updated:", customer._id);
      }
    }

    let shopOwnerAdmin;

    // If we already have the shop_id, use it directly
    if (shop_id) {
      console.log("Using provided shop_id:", shop_id);
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
    console.log("Shop Owner Admin:", shopOwnerAdmin);
    console.log("Shop Owner Admin ID:", shopOwnerAdmin?.admin_id);
    // --- START: Admin Notification via Pusher ---
    if (shopOwnerAdmin?.admin_id) {
      const adminId = shopOwnerAdmin?.admin_id;

      const adminChannel = `private-admin-${adminId}`;

      // Get order details for notification
      const orderNumber = updatedOrder.order_id || "Unknown";

      // Add these debug logs right before your Pusher trigger
      console.log("[DEBUG API] updatedOrder:", updatedOrder);
      console.log(
        "[DEBUG API] proof_of_payment:",
        updatedOrder.proof_of_payment
      );
      console.log("[DEBUG API] newProofOfPayment:", newProofOfPayment);

      try {
        // 1. Trigger update-payment-status event
        await pusherServer.trigger(
          adminChannel,
          "update-payment-status-proof",
          {
            // Send the newProofOfPayment object directly instead of trying to access updatedOrder.proof_of_payment
            ...newProofOfPayment,
            // Add these for extra safety
            payment_status: "for review",
          }
        );
        console.log(
          `Pusher: 'update-payment-status-proof' triggered on ${adminChannel}`
        );

        // 2. Create notification record
        const notificationMessage = `Payment proof added for Order #${orderNumber}`;
        const notification = await Notification.create({
          message: notificationMessage,
          recipient_id: adminId,
          recipient_type: "admin",
          related_order_id: orderId,
          read: false,
          timestamp: new Date(),
        });

        // 3. Trigger new-notification event
        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          notification.toObject()
        );
        console.log(`Pusher: 'new-notification' triggered on ${adminChannel}`);
      } catch (pusherError) {
        console.error("Error triggering Pusher notification:", pusherError);
      }
    } else {
      console.log("Admin ID not found for this shop, skipping notification");
    }
    // --- END: Admin Notification ---

    return NextResponse.json({ success: true, newProofOfPayment });
  } catch (error) {
    console.error("Error saving proof of payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
